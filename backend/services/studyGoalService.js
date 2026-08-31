const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const StudyGoal = require('../models/StudyGoal');
const StudyGoalProgress = require('../models/StudyGoalProgress');
const WeeklyStudyReport = require('../models/WeeklyStudyReport');
const Subject = require('../models/Subject');

// ── Constants ────────────────────────────────────────────────────────────
const DAILY_GOAL_EXPIRY_HOURS = 28; // Allow some grace period past midnight
const STREAK_INCREMENT_THRESHOLD = 1; // Minimum value increment to count toward streak

// ── Goal Lifecycle ───────────────────────────────────────────────────────

/**
 * Create a new study goal with automatic end-date calculation for daily goals.
 */
async function createGoal(userId, goalData) {
  const { goalType, startDate, endDate, ...rest } = goalData;

  let computedEndDate = endDate;
  if (goalType === 'daily' && !endDate) {
    const start = startDate ? new Date(startDate) : new Date();
    computedEndDate = new Date(start);
    computedEndDate.setDate(computedEndDate.getDate() + 1);
  } else if (goalType === 'weekly' && !endDate) {
    const start = startDate ? new Date(startDate) : new Date();
    computedEndDate = new Date(start);
    computedEndDate.setDate(computedEndDate.getDate() + 7);
  }

  if (!computedEndDate) {
    computedEndDate = new Date();
    computedEndDate.setDate(computedEndDate.getDate() + 7);
  }

  const goal = await StudyGoal.create({
    user: userId,
    ...rest,
    goalType: goalType || 'daily',
    startDate: startDate || new Date(),
    endDate: computedEndDate,
    status: 'active',
  });

  return goal;
}

/**
 * Record a progress increment toward a goal and recalculate status.
 */
async function recordProgress(userId, goalId, { value, source, sourceId, note }) {
  const goal = await StudyGoal.findOne({ where: { id: goalId, user: userId } });
  if (!goal) {
    throw new NotFoundError('Study goal not found');
  }

  if (goal.status !== 'active') {
    throw new Error(`Cannot record progress for a goal with status "${goal.status}"`);
  }

  // Create progress entry
  const progress = await StudyGoalProgress.create({
    goalId: goal.id,
    user: userId,
    value,
    source: source || 'manual',
    sourceId: sourceId || null,
    note: note || null,
    recordedAt: new Date(),
  });

  // Recalculate currentValue from all progress entries for this goal
  const aggResult = await StudyGoalProgress.sum('value', {
    where: { goalId: goal.id },
  });
  goal.currentValue = aggResult || 0;

  // Update streak
  const today = new Date().toISOString().split('T')[0];
  const lastActive = goal.metadata?.lastActiveDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastActive === today) {
    // Already counted today
  } else if (lastActive === yesterdayStr) {
    goal.streakDays = (goal.streakDays || 0) + 1;
    goal.metadata = { ...goal.metadata, lastActiveDate: today };
  } else {
    goal.streakDays = 1;
    goal.metadata = { ...goal.metadata, lastActiveDate: today };
  }

  // Update best streak
  if (goal.streakDays > (goal.bestStreak || 0)) {
    goal.bestStreak = goal.streakDays;
  }

  // Check completion
  if (goal.currentValue >= goal.targetValue) {
    const isNewlyCompleted = goal.status !== 'completed';
    goal.status = 'completed';
    goal.completedAt = new Date();
    goal.currentValue = goal.targetValue; // cap at target

    if (isNewlyCompleted) {
      const gamificationService = require('./gamificationService');
      await gamificationService.awardCoins(userId, 50, 'Completed daily goal')
        .catch(err => console.error('Error awarding PrepCoins for goal completion:', err));
    }
  }

  // Check expiry
  if (new Date(goal.endDate) < new Date() && goal.status === 'active') {
    goal.status = 'expired';
  }

  await goal.save();

  return { goal, progress };
}

/**
 * Get all goals for a user with optional filters.
 */
async function getUserGoals(userId, { status, goalType, subjectId, page = 1, limit = 20 } = {}) {
  const where = { user: userId };
  if (status) where.status = status;
  if (goalType) where.goalType = goalType;
  if (subjectId) where.subject = subjectId;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: goals } = await StudyGoal.findAndCountAll({
    where,
    include: [{ model: Subject, as: 'subjectRef', attributes: ['id', 'name'] }],
    order: [
      ['status', 'ASC'],
      ['priority', 'DESC'],
      ['endDate', 'ASC'],
    ],
    offset,
    limit,
  });

  return {
    goals,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

/**
 * Get a single goal with its progress history.
 */
async function getGoalById(userId, goalId) {
  const goal = await StudyGoal.findOne({
    where: { id: goalId, user: userId },
    include: [{ model: Subject, as: 'subjectRef', attributes: ['id', 'name'] }],
  });

  if (!goal) return null;

  const progressEntries = await StudyGoalProgress.findAll({
    where: { goalId: goal.id },
    order: [['recordedAt', 'DESC']],
    limit: 50,
  });

  return { goal, progressEntries };
}

/**
 * Update a goal's properties.
 */
async function updateGoal(userId, goalId, updates) {
  const goal = await StudyGoal.findOne({ where: { id: goalId, user: userId } });
  if (!goal) return null;

  const allowedFields = ['title', 'description', 'targetValue', 'priority', 'reminderTime', 'tags', 'status'];
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      goal[key] = updates[key];
    }
  }

  await goal.save();
  return goal;
}

/**
 * Delete a goal and its associated progress entries.
 */
async function deleteGoal(userId, goalId) {
  const goal = await StudyGoal.findOne({ where: { id: goalId, user: userId } });
  if (!goal) return null;

  await StudyGoalProgress.destroy({ where: { goalId: goal.id } });
  await goal.destroy();
  return true;
}

// ── Analytics & Reports ──────────────────────────────────────────────────

/**
 * Get daily summary stats for a user within a date range.
 */
async function getDailyStats(userId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Aggregate all goals in the range
  const goals = await StudyGoal.findAll({
    where: {
      user: userId,
      startDate: { [Op.lte]: end },
      endDate: { [Op.gte]: start },
    },
  });

  // Get all progress entries in the range
  const progressEntries = await StudyGoalProgress.findAll({
    where: {
      user: userId,
      recordedAt: { [Op.between]: [start, end] },
    },
    order: [['recordedAt', 'ASC']],
  });

  // Build daily breakdown
  const dailyMap = {};
  const current = new Date(start);
  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    dailyMap[dateKey] = {
      date: dateKey,
      studyMinutes: 0,
      goalsActive: 0,
      goalsCompleted: 0,
      totalValue: 0,
    };
    current.setDate(current.getDate() + 1);
  }

  // Populate goals count per day
  for (const goal of goals) {
    const gStart = new Date(goal.startDate);
    const gEnd = new Date(goal.endDate);
    const iter = new Date(start);
    while (iter <= end) {
      const dk = iter.toISOString().split('T')[0];
      if (iter >= gStart && iter <= gEnd && dailyMap[dk]) {
        dailyMap[dk].goalsActive++;
      }
      if (goal.status === 'completed' && goal.completedAt) {
        const completedDate = new Date(goal.completedAt).toISOString().split('T')[0];
        if (dk === completedDate && dailyMap[dk]) {
          dailyMap[dk].goalsCompleted++;
        }
      }
      iter.setDate(iter.getDate() + 1);
    }
  }

  // Populate progress values per day
  for (const entry of progressEntries) {
    const dk = new Date(entry.recordedAt).toISOString().split('T')[0];
    if (dailyMap[dk]) {
      dailyMap[dk].totalValue += entry.value;
      if (entry.source === 'focus_session') {
        dailyMap[dk].studyMinutes += Math.round(entry.value * 60);
      }
    }
  }

  const totalGoalsSet = goals.length;
  const totalGoalsCompleted = goals.filter((g) => g.status === 'completed').length;
  const totalProgress = progressEntries.reduce((sum, e) => sum + e.value, 0);

  return {
    summary: {
      totalGoalsSet,
      totalGoalsCompleted,
      completionRate: totalGoalsSet > 0 ? Math.round((totalGoalsCompleted / totalGoalsSet) * 100) : 0,
      totalProgressValue: Math.round(totalProgress * 100) / 100,
      dateRange: { startDate, endDate },
    },
    dailyBreakdown: Object.values(dailyMap),
    goals,
  };
}

/**
 * Get subject-level analytics for a user.
 */
async function getSubjectAnalytics(userId) {
  const goals = await StudyGoal.findAll({
    where: { user: userId, subject: { [Op.not]: null } },
    include: [{ model: Subject, as: 'subjectRef', attributes: ['id', 'name'] }],
  });

  const subjectMap = {};
  for (const goal of goals) {
    const subId = goal.subject;
    const subName = goal.subjectRef?.name || 'Unknown';
    if (!subjectMap[subId]) {
      subjectMap[subId] = {
        subjectId: subId,
        subjectName: subName,
        totalGoals: 0,
        completedGoals: 0,
        totalTarget: 0,
        totalCurrent: 0,
        avgCompletionRate: 0,
      };
    }
    subjectMap[subId].totalGoals++;
    if (goal.status === 'completed') subjectMap[subId].completedGoals++;
    subjectMap[subId].totalTarget += goal.targetValue;
    subjectMap[subId].totalCurrent += goal.currentValue;
  }

  // Calculate avg completion rate per subject
  for (const sub of Object.values(subjectMap)) {
    sub.avgCompletionRate =
      sub.totalTarget > 0 ? Math.round((sub.totalCurrent / sub.totalTarget) * 100) : 0;
  }

  return Object.values(subjectMap);
}

/**
 * Get streak and consistency metrics for a user.
 */
async function getStreakMetrics(userId) {
  const goals = await StudyGoal.findAll({
    where: { user: userId },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'streakDays', 'bestStreak', 'status', 'startDate', 'endDate', 'completedAt'],
  });

  // Calculate longest active streak across all goals
  let longestStreak = 0;
  let currentStreak = 0;
  let totalGoalsCompleted = 0;
  let totalGoalsMissed = 0;

  for (const goal of goals) {
    if (goal.bestStreak > longestStreak) longestStreak = goal.bestStreak;
    if (goal.status === 'completed') totalGoalsCompleted++;
    if (goal.status === 'expired' || goal.status === 'missed') totalGoalsMissed++;
  }

  // Calculate active goal streak (consecutive days with at least one active/completed goal)
  const activeDays = new Set();
  const progressEntries = await StudyGoalProgress.findAll({
    where: { user: userId },
    attributes: ['recordedAt'],
    order: [['recordedAt', 'DESC']],
    limit: 100,
  });

  for (const entry of progressEntries) {
    const day = new Date(entry.recordedAt).toISOString().split('T')[0];
    activeDays.add(day);
  }

  // Calculate consecutive active days from today
  const today = new Date();
  currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = d.toISOString().split('T')[0];
    if (activeDays.has(dk)) {
      currentStreak++;
    } else {
      break;
    }
  }

  const consistencyScore =
    goals.length > 0
      ? Math.round((totalGoalsCompleted / Math.max(goals.length, 1)) * 100)
      : 0;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalGoalsCompleted,
    totalGoalsMissed,
    consistencyScore,
    activeDaysCount: activeDays.size,
  };
}

/**
 * Generate a weekly study report for a user.
 * Can be called on-demand or by a background scheduler.
 */
async function generateWeeklyReport(userId, weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);

  // Check if report already exists
  const existing = await WeeklyStudyReport.findOne({
    where: { user: userId, weekStart: weekStart, weekEnd: weekEnd },
  });
  if (existing) return existing;

  // Gather data
  const goals = await StudyGoal.findAll({
    where: {
      user: userId,
      startDate: { [Op.lte]: end },
      endDate: { [Op.gte]: start },
    },
  });

  const progressEntries = await StudyGoalProgress.findAll({
    where: {
      user: userId,
      recordedAt: { [Op.between]: [start, end] },
    },
  });

  // Calculate metrics
  const goalsSet = goals.length;
  const goalsCompleted = goals.filter((g) => g.status === 'completed').length;
  const goalCompletionRate = goalsSet > 0 ? Math.round((goalsCompleted / goalsSet) * 100) : 0;

  // Subject breakdown
  const subjectBreakdown = {};
  for (const goal of goals) {
    if (!goal.subject) continue;
    if (!subjectBreakdown[goal.subject]) {
      subjectBreakdown[goal.subject] = {
        subjectId: goal.subject,
        goalsSet: 0,
        goalsCompleted: 0,
        totalProgress: 0,
      };
    }
    subjectBreakdown[goal.subject].goalsSet++;
    if (goal.status === 'completed') subjectBreakdown[goal.subject].goalsCompleted++;
    subjectBreakdown[goal.subject].totalProgress += goal.currentValue;
  }

  // Daily breakdown
  const dailyBreakdown = [];
  const current = new Date(start);
  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    const dayEntries = progressEntries.filter((e) => {
      return new Date(e.recordedAt).toISOString().split('T')[0] === dateKey;
    });
    const dayValue = dayEntries.reduce((sum, e) => sum + e.value, 0);
    const studyMinutes = dayEntries
      .filter((e) => e.source === 'focus_session')
      .reduce((sum, e) => sum + Math.round(e.value * 60), 0);

    dailyBreakdown.push({
      date: dateKey,
      totalValue: Math.round(dayValue * 100) / 100,
      studyMinutes,
      entriesCount: dayEntries.length,
    });
    current.setDate(current.getDate() + 1);
  }

  // Identify strengths and improvements
  const strengths = [];
  const improvements = [];
  for (const goal of goals) {
    if (goal.status === 'completed') {
      strengths.push({
        title: goal.title,
        metricType: goal.metricType,
        targetValue: goal.targetValue,
        streakDays: goal.streakDays,
      });
    } else if (goal.currentValue / goal.targetValue < 0.5) {
      improvements.push({
        title: goal.title,
        metricType: goal.metricType,
        progress: Math.round((goal.currentValue / goal.targetValue) * 100),
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
      });
    }
  }

  // Streak days (days with at least one progress entry)
  const streakDays = dailyBreakdown.filter((d) => d.entriesCount > 0).length;

  // Total study minutes
  const totalStudyMinutes = dailyBreakdown.reduce((sum, d) => sum + d.studyMinutes, 0);

  const report = await WeeklyStudyReport.create({
    user: userId,
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
    totalStudyMinutes,
    goalsSet,
    goalsCompleted,
    goalCompletionRate,
    quizzesTaken: 0,
    averageQuizScore: 0,
    flashcardsReviewed: 0,
    focusSessions: progressEntries.filter((e) => e.source === 'focus_session').length,
    subjectBreakdown,
    dailyBreakdown,
    strengths,
    improvements,
    streakDays,
    aiInsight: generateInsightText(goalCompletionRate, streakDays, strengths, improvements),
  });

  return report;
}

/**
 * Get weekly reports for a user.
 */
async function getWeeklyReports(userId, { page = 1, limit = 10 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: reports } = await WeeklyStudyReport.findAndCountAll({
    where: { user: userId },
    order: [['weekStart', 'DESC']],
    offset,
    limit,
  });

  return {
    reports,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

/**
 * Auto-expire overdue goals that are still marked active.
 */
async function expireOverdueGoals() {
  const now = new Date();
  const [updatedCount] = await StudyGoal.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        endDate: { [Op.lt]: now },
      },
    }
  );
  return updatedCount;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function generateInsightText(completionRate, streakDays, strengths, improvements) {
  const parts = [];

  if (completionRate >= 80) {
    parts.push('Excellent week! You completed most of your goals.');
  } else if (completionRate >= 50) {
    parts.push('Good progress this week. Keep pushing toward your remaining goals.');
  } else if (completionRate > 0) {
    parts.push('You made some progress this week. Try breaking goals into smaller chunks.');
  } else {
    parts.push('No goals were completed this week. Consider setting smaller, more achievable targets.');
  }

  if (streakDays >= 5) {
    parts.push(`Amazing ${streakDays}-day streak! Consistency is key to mastering your subjects.`);
  } else if (streakDays >= 3) {
    parts.push(`You studied ${streakDays} out of 7 days. Try to study every day to build a stronger habit.`);
  } else if (streakDays > 0) {
    parts.push('Try to study more days per week for better retention.');
  }

  if (improvements.length > 0) {
    const weakestGoal = improvements[0];
    parts.push(
      `Focus on "${weakestGoal.title}" — currently at ${weakestGoal.progress}% of your target.`
    );
  }

  return parts.join(' ');
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = {
  createGoal,
  recordProgress,
  getUserGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  getDailyStats,
  getSubjectAnalytics,
  getStreakMetrics,
  generateWeeklyReport,
  getWeeklyReports,
  expireOverdueGoals,
  NotFoundError,
};
