const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const StudyHabit = require('../models/StudyHabit');
const HabitLog = require('../models/HabitLog');
const HabitStreak = require('../models/HabitStreak');
const Subject = require('../models/Subject');

// ── Constants ────────────────────────────────────────────────────────────

const HABIT_CATEGORIES = {
  REVIEW: 'review',
  PRACTICE: 'practice',
  READING: 'reading',
  QUIZ: 'quiz',
  FLASHCARDS: 'flashcards',
  NOTES: 'notes',
  DISCUSSION: 'discussion',
  CUSTOM: 'custom',
};

const MOOD_WEIGHTS = {
  great: 1.2,
  good: 1.0,
  okay: 0.8,
  tired: 0.6,
  stressed: 0.5,
};

const CONSISTENCY_WINDOW_DAYS = 30;
const FREEZE_LIMIT_PER_MONTH = 3;

// ── Habit CRUD ───────────────────────────────────────────────────────────

async function createHabit(userId, data) {
  const habit = await StudyHabit.create({
    userId,
    name: data.name,
    description: data.description,
    subject: data.subject,
    habitType: data.habitType || 'daily',
    frequency: data.frequency || 1,
    frequencyPeriod: data.frequencyPeriod || 'day',
    targetMinutes: data.targetMinutes || 30,
    category: data.category || 'custom',
    priority: data.priority || 'medium',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate,
    reminderTime: data.reminderTime,
    tags: data.tags || [],
  });

  // Initialize streak record
  await HabitStreak.create({
    userId,
    habitId: habit.id,
    currentStreak: 0,
    bestStreak: 0,
    totalCompletions: 0,
  });

  return habit;
}

async function getUserHabits(userId, { status, category, habitType, page = 1, limit = 20 } = {}) {
  const where = { userId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (habitType) where.habitType = habitType;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: habits } = await StudyHabit.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  });

  // Enrich with streak data
  const habitIds = habits.map((h) => h.id);
  const streaks = await HabitStreak.findAll({
    where: { habitId: { [Op.in]: habitIds } },
  });
  const streakMap = {};
  streaks.forEach((s) => { streakMap[s.habitId] = s; });

  const enriched = habits.map((h) => {
    const json = h.toJSON();
    const streak = streakMap[h.id];
    json.streak = streak
      ? {
          current: streak.currentStreak,
          best: streak.bestStreak,
          totalCompletions: streak.totalCompletions,
          consistencyScore: streak.consistencyScore,
        }
      : null;
    return json;
  });

  return {
    habits: enriched,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getHabitById(userId, habitId) {
  const habit = await StudyHabit.findOne({ where: { id: habitId, userId } });
  if (!habit) return null;

  const streak = await HabitStreak.findOne({ where: { habitId } });
  const json = habit.toJSON();
  json.streak = streak
    ? {
        current: streak.currentStreak,
        best: streak.bestStreak,
        totalCompletions: streak.totalCompletions,
        totalMinutesLogged: streak.totalMinutesLogged,
        consistencyScore: streak.consistencyScore,
        averageQuality: streak.averageQuality,
        lastCompletedDate: streak.lastCompletedDate,
        freezesUsed: streak.freezesUsed || [],
      }
    : null;

  return json;
}

async function updateHabit(userId, habitId, updates) {
  const habit = await StudyHabit.findOne({ where: { id: habitId, userId } });
  if (!habit) return null;

  const allowedFields = [
    'name', 'description', 'subject', 'habitType', 'frequency',
    'frequencyPeriod', 'targetMinutes', 'category', 'priority',
    'status', 'reminderTime', 'tags', 'endDate',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      habit[field] = updates[field];
    }
  }

  await habit.save();
  return habit;
}

async function deleteHabit(userId, habitId) {
  const habit = await StudyHabit.findOne({ where: { id: habitId, userId } });
  if (!habit) return false;

  await HabitLog.destroy({ where: { habitId } });
  await HabitStreak.destroy({ where: { habitId } });
  await habit.destroy();
  return true;
}

// ── Habit Logging ────────────────────────────────────────────────────────

async function logHabitCompletion(userId, habitId, data) {
  const habit = await StudyHabit.findOne({ where: { id: habitId, userId } });
  if (!habit) throw new Error('Habit not found');
  if (habit.status !== 'active') throw new Error('Cannot log a paused or archived habit');

  const logDate = data.logDate || new Date().toISOString().split('T')[0];

  // Check for duplicate log on same date
  const existing = await HabitLog.findOne({
    where: { habitId, logDate, completed: true },
  });
  if (existing) {
    throw new Error('Habit already logged for this date');
  }

  const log = await HabitLog.create({
    userId,
    habitId,
    logDate,
    completed: data.completed !== false,
    actualMinutes: data.actualMinutes || 0,
    quality: data.quality,
    notes: data.notes,
    mood: data.mood,
  });

  // Update streak
  await updateStreak(habit, log);

  return log;
}

async function updateStreak(habit, log) {
  let streak = await HabitStreak.findOne({ where: { habitId: habit.id } });

  if (!streak) {
    streak = await HabitStreak.create({
      userId: habit.userId,
      habitId: habit.id,
    });
  }

  if (!log.completed) {
    // Don't update streak for incomplete logs, but still record
    return streak;
  }

  const today = new Date(log.logDate);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastCompleted = streak.lastCompletedDate
    ? new Date(streak.lastCompletedDate)
    : null;

  // Check if streak continues or resets
  if (lastCompleted) {
    const lastStr = lastCompleted.toISOString().split('T')[0];
    const todayStr = log.logDate;
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastStr === todayStr) {
      // Already completed today — no streak change
    } else if (lastStr === yesterdayStr) {
      // Consecutive day — extend streak
      streak.currentStreak += 1;
    } else if (lastStr < yesterdayStr) {
      // Streak broken
      streak.currentStreak = 1;
      streak.streakStartDate = log.logDate;
    }
  } else {
    // First completion
    streak.currentStreak = 1;
    streak.streakStartDate = log.logDate;
  }

  // Update best streak
  if (streak.currentStreak > streak.bestStreak) {
    streak.bestStreak = streak.currentStreak;
  }

  streak.totalCompletions += 1;
  streak.totalMinutesLogged += log.actualMinutes || 0;
  streak.lastCompletedDate = log.logDate;

  // Update quality average
  if (log.quality) {
    const totalLogs = streak.totalCompletions;
    streak.averageQuality = totalLogs > 0
      ? Math.round(((streak.averageQuality * (totalLogs - 1) + log.quality) / totalLogs) * 10) / 10
      : log.quality;
  }

  // Update average minutes
  streak.averageMinutes = streak.totalCompletions > 0
    ? Math.round((streak.totalMinutesLogged / streak.totalCompletions) * 10) / 10
    : 0;

  // Recalculate consistency score
  streak.consistencyScore = await computeConsistencyScore(habit.userId, habit.id);

  await streak.save();
  return streak;
}

async function computeConsistencyScore(userId, habitId) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONSISTENCY_WINDOW_DAYS);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const logs = await HabitLog.findAll({
    where: {
      userId,
      habitId,
      completed: true,
      logDate: { [Op.gte]: cutoffStr },
    },
    attributes: ['logDate'],
  });

  const uniqueDays = new Set(logs.map((l) => l.logDate));
  const score = Math.round((uniqueDays.size / CONSISTENCY_WINDOW_DAYS) * 100);
  return Math.min(100, Math.max(0, score));
}

// ── Streak Freeze ────────────────────────────────────────────────────────

async function useStreakFreeze(userId, habitId) {
  const streak = await HabitStreak.findOne({ where: { habitId, userId } });
  if (!streak) throw new Error('Streak record not found');

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Count freezes used this month
  const freezesThisMonth = (streak.freezesUsed || []).filter((d) => {
    return d.startsWith(currentMonth);
  }).length;

  if (freezesThisMonth >= FREEZE_LIMIT_PER_MONTH) {
    throw new Error(`Streak freeze limit reached for this month (${FREEZE_LIMIT_PER_MONTH} max)`);
  }

  if (streak.currentStreak === 0) {
    throw new Error('No active streak to freeze');
  }

  const freezeDate = now.toISOString().split('T')[0];
  streak.freezesUsed = [...(streak.freezesUsed || []), freezeDate];
  streak.freezeCount += 1;

  // Log as a completion to maintain streak
  const log = await HabitLog.create({
    userId,
    habitId,
    logDate: freezeDate,
    completed: true,
    actualMinutes: 0,
    quality: null,
    notes: 'Streak freeze applied',
    metadata: { type: 'freeze' },
  });

  streak.lastCompletedDate = freezeDate;
  await streak.save();

  return { streak, log };
}

// ── Analytics ────────────────────────────────────────────────────────────

async function getHabitAnalytics(userId) {
  const habits = await StudyHabit.findAll({
    where: { userId, status: 'active' },
  });

  const habitIds = habits.map((h) => h.id);
  if (habitIds.length === 0) {
    return {
      totalHabits: 0,
      activeHabits: 0,
      overallConsistency: 0,
      totalCompletionsThisWeek: 0,
      categoryBreakdown: {},
      streakSummary: { totalActiveStreaks: 0, longestStreak: 0 },
    };
  }

  const streaks = await HabitStreak.findAll({
    where: { habitId: { [Op.in]: habitIds } },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const weekLogs = await HabitLog.findAll({
    where: {
      userId,
      habitId: { [Op.in]: habitIds },
      completed: true,
      logDate: { [Op.gte]: weekAgoStr },
    },
  });

  // Category breakdown
  const categoryBreakdown = {};
  for (const habit of habits) {
    const cat = habit.category || 'custom';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, completions: 0 };
    }
    categoryBreakdown[cat].count += 1;
    const habitLogs = weekLogs.filter((l) => l.habitId === habit.id);
    categoryBreakdown[cat].completions += habitLogs.length;
  }

  // Streak summary
  const activeStreaks = streaks.filter((s) => s.currentStreak > 0);
  const longestStreak = streaks.reduce((max, s) => Math.max(max, s.bestStreak), 0);
  const overallConsistency = streaks.length > 0
    ? Math.round(streaks.reduce((sum, s) => sum + (s.consistencyScore || 0), 0) / streaks.length)
    : 0;

  // Today's habits completion
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = await HabitLog.findAll({
    where: { userId, logDate: todayStr, completed: true },
  });
  const todayCompletedHabits = new Set(todayLogs.map((l) => l.habitId)).size;

  return {
    totalHabits: habits.length,
    activeHabits: habits.length,
    overallConsistency,
    totalCompletionsThisWeek: weekLogs.length,
    todayCompletedHabits,
    todayTotalHabits: habits.length,
    todayCompletionRate: habits.length > 0
      ? Math.round((todayCompletedHabits / habits.length) * 100)
      : 0,
    categoryBreakdown,
    streakSummary: {
      totalActiveStreaks: activeStreaks.length,
      longestStreak,
      averageCurrentStreak: activeStreaks.length > 0
        ? Math.round(activeStreaks.reduce((sum, s) => sum + s.currentStreak, 0) / activeStreaks.length)
        : 0,
    },
  };
}

async function getHabitHistory(userId, habitId, { page = 1, limit = 30 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: logs } = await HabitLog.findAndCountAll({
    where: { userId, habitId },
    order: [['logDate', 'DESC']],
    offset,
    limit,
  });

  return {
    logs,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getWeeklySummary(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const habits = await StudyHabit.findAll({
    where: { userId, status: 'active' },
  });

  const habitIds = habits.map((h) => h.id);
  if (habitIds.length === 0) {
    return { dailyBreakdown: [], totalCompletions: 0, averageQuality: 0 };
  }

  const logs = await HabitLog.findAll({
    where: {
      userId,
      habitId: { [Op.in]: habitIds },
      completed: true,
      logDate: { [Op.gte]: weekAgoStr },
    },
    order: [['logDate', 'ASC']],
  });

  // Daily breakdown
  const dailyBreakdown = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyBreakdown[dateStr] = { completions: 0, totalMinutes: 0, habits: [] };
  }

  for (const log of logs) {
    const entry = dailyBreakdown[log.logDate];
    if (entry) {
      entry.completions += 1;
      entry.totalMinutes += log.actualMinutes || 0;
      entry.habits.push(log.habitId);
    }
  }

  const qualityLogs = logs.filter((l) => l.quality !== null);
  const averageQuality = qualityLogs.length > 0
    ? Math.round((qualityLogs.reduce((sum, l) => sum + l.quality, 0) / qualityLogs.length) * 10) / 10
    : 0;

  const totalMinutes = logs.reduce((sum, l) => sum + (l.actualMinutes || 0), 0);

  return {
    dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
      date,
      ...data,
      uniqueHabits: new Set(data.habits).size,
    })),
    totalCompletions: logs.length,
    totalMinutes,
    averageQuality,
    habitsTracked: habitIds.length,
  };
}

// ── Dashboard ────────────────────────────────────────────────────────────

async function getDashboard(userId) {
  const [analytics, weeklySummary] = await Promise.all([
    getHabitAnalytics(userId),
    getWeeklySummary(userId),
  ]);

  const habits = await StudyHabit.findAll({
    where: { userId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = await HabitLog.findAll({
    where: { userId, logDate: todayStr, completed: true },
  });
  const completedToday = new Set(todayLogs.map((l) => l.habitId));

  const todayHabits = habits.map((h) => ({
    id: h.id,
    name: h.name,
    category: h.category,
    completedToday: completedToday.has(h.id),
  }));

  return {
    analytics,
    weeklySummary,
    todayHabits,
    habitsSummary: {
      total: habits.length,
      completedToday: completedToday.size,
      remainingToday: habits.length - completedToday.size,
    },
  };
}

// ── Recommendations ──────────────────────────────────────────────────────

function generateHabitRecommendations(analytics) {
  const recs = [];

  if (analytics.todayCompletionRate < 50 && analytics.totalHabits > 0) {
    recs.push({
      category: 'completion',
      message: `You've completed ${analytics.todayCompletionRate}% of today's habits. Try to finish at least one more before bed.`,
      impact: 'high',
    });
  }

  if (analytics.overallConsistency < 40) {
    recs.push({
      category: 'consistency',
      message: 'Your consistency score is low. Focus on doing a little each day rather than cramming.',
      impact: 'high',
    });
  }

  if (analytics.streakSummary.longestStreak >= 7 && analytics.streakSummary.totalActiveStreaks === 0) {
    recs.push({
      category: 'streak',
      message: 'You had a great streak before! Time to start building it again.',
      impact: 'medium',
    });
  }

  if (analytics.streakSummary.averageCurrentStreak >= 14) {
    recs.push({
      category: 'streak',
      message: `Excellent! Average streak is ${analytics.streakSummary.averageCurrentStreak} days. Keep the momentum!`,
      impact: 'low',
    });
  }

  return recs;
}

// ── Exports ──────────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = {
  createHabit,
  getUserHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  useStreakFreeze,
  getHabitAnalytics,
  getHabitHistory,
  getWeeklySummary,
  getDashboard,
  generateHabitRecommendations,
  computeConsistencyScore,
  HABIT_CATEGORIES,
  MOOD_WEIGHTS,
  CONSISTENCY_WINDOW_DAYS,
  FREEZE_LIMIT_PER_MONTH,
  NotFoundError,
};
