const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const LearningJournal = require('../models/LearningJournal');
const ActivityLog = require('../models/ActivityLog');
const QuizAttempt = require('../models/QuizAttempt');
const Flashcard = require('../models/Flashcard');
const FocusSession = require('../models/FocusSession');
const Note = require('../models/Note');
const Subject = require('../models/Subject');
const StudyGoal = require('../models/StudyGoal');
const StudyHabit = require('../models/StudyHabit');
const HabitLog = require('../models/HabitLog');

// ── Constants ────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = {
  QUIZ: 'quiz_attempt',
  PYQ: 'pyq_upload',
  FLASHCARD: 'flashcard_review',
  STUDY_PLAN: 'study_plan_create',
  NOTE: 'note_upload',
};

const MILESTONE_TYPES = {
  STREAK_7: { type: 'streak_7', label: '🔥 7-Day Streak!', description: 'Maintained a 7-day study streak' },
  STREAK_14: { type: 'streak_14', label: '🔥🔥 14-Day Streak!', description: 'Maintained a 14-day study streak' },
  STREAK_30: { type: 'streak_30', label: '🔥🔥🔥 30-Day Streak!', description: 'Maintained a 30-day study streak — legendary!' },
  FIRST_QUIZ: { type: 'first_quiz', label: '📝 First Quiz!', description: 'Completed your first quiz' },
  QUIZ_10: { type: 'quiz_10', label: '🎯 Quiz Master', description: 'Completed 10 quizzes' },
  QUIZ_50: { type: 'quiz_50', label: '🏆 Quiz Champion', description: 'Completed 50 quizzes' },
  PERFECT_SCORE: { type: 'perfect_score', label: '💯 Perfect Score!', description: 'Scored 100% on a quiz' },
  FLASHCARD_100: { type: 'flashcard_100', label: '📇 100 Flashcards', description: 'Reviewed 100 flashcards' },
  FIRST_NOTE: { type: 'first_note', label: '📓 First Note!', description: 'Created your first note' },
  STUDY_HOUR_10: { type: 'study_hour_10', label: '⏰ 10 Hours Studied', description: 'Accumulated 10 hours of study' },
  STUDY_HOUR_50: { type: 'study_hour_50', label: '⏰ 50 Hours Studied', description: 'Accumulated 50 hours of study' },
  ALL_SUBJECTS: { type: 'all_subjects', label: '📚 Well-Rounded!', description: 'Studied every subject at least once' },
  DAILY_GOALS_MET: { type: 'daily_goals_met', label: '✅ All Goals Met!', description: 'Completed all study goals for the day' },
  EARLY_BIRD: { type: 'early_bird', label: '🌅 Early Bird', description: 'Started studying before 7 AM' },
  NIGHT_OWL: { type: 'night_owl', label: '🦉 Night Owl', description: 'Studied past midnight' },
};

// ── Journal Generation ───────────────────────────────────────────────────

/**
 * Generate or update a learning journal entry for a given date.
 * Aggregates all activity data from the day and creates a comprehensive entry.
 */
async function generateJournalEntry(userId, dateStr) {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // Fetch all activity data for the day
  const [activities, quizAttempts, focusSessions, notes, flashcards, habitLogs] = await Promise.all([
    ActivityLog.findAll({
      where: {
        user: userId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
    }),
    QuizAttempt.findAll({
      where: {
        user: userId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ['id', 'score', 'quiz', 'createdAt'],
    }),
    FocusSession.findAll({
      where: {
        user: userId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
    }),
    Note.findAll({
      where: {
        user: userId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ['id', 'subject'],
    }),
    Flashcard.findAll({
      where: {
        user: userId,
        updatedAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ['id', 'subject'],
    }),
    HabitLog.findAll({
      where: {
        userId,
        logDate: dateStr,
        completed: true,
      },
    }),
  ]);

  // Compute metrics
  const studyMinutes = focusSessions.reduce((sum, s) => sum + (s.activeSeconds || 0) / 60, 0);
  const scores = quizAttempts.map((a) => a.score).filter((s) => typeof s === 'number');
  const averageQuizScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const bestQuizScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Subject breakdown
  const subjectMinutes = {};
  for (const session of focusSessions) {
    const subId = session.subject || 'general';
    subjectMinutes[subId] = (subjectMinutes[subId] || 0) + (session.activeSeconds || 0) / 60;
  }

  // Fetch subject names
  const subjectIds = Object.keys(subjectMinutes).filter((id) => id !== 'general');
  const subjects = subjectIds.length > 0
    ? await Subject.findAll({ where: { id: { [Op.in]: subjectIds }, user: userId }, attributes: ['id', 'name'] })
    : [];
  const subjectNameMap = {};
  subjects.forEach((s) => { subjectNameMap[s.id] = s.name; });

  const subjectsStudied = Object.entries(subjectMinutes).map(([id, minutes]) => ({
    subjectId: id,
    name: subjectNameMap[id] || 'General',
    minutes: Math.round(minutes),
  }));

  // Check milestones
  const milestones = await detectMilestones(userId, dateStr, {
    studyMinutes,
    quizzesCompleted: quizAttempts.length,
    flashcardsReviewed: flashcards.length,
    notesCreated: notes.length,
    focusSessions: focusSessions.length,
    averageQuizScore,
    bestQuizScore,
  });

  // Generate title and summary
  const title = generateTitle(dateStr, studyMinutes, quizAttempts.length, flashcards.length);
  const summary = generateSummary(studyMinutes, quizAttempts.length, flashcards.length, notes.length, focusSessions.length, subjectsStudied);

  // Upsert journal entry
  const [entry, created] = await LearningJournal.findOrCreate({
    where: { user: userId, entryDate: dateStr },
    defaults: {
      entryType: 'auto',
      title,
      summary,
      studyMinutes: Math.round(studyMinutes),
      quizzesCompleted: quizAttempts.length,
      averageQuizScore,
      flashcardsReviewed: flashcards.length,
      notesCreated: notes.length,
      focusSessions: focusSessions.length,
      activitiesCount: activities.length,
      milestones,
      bestQuizScore,
      subjectsStudied,
    },
  });

  if (!created) {
    // Update existing entry
    entry.title = title;
    entry.summary = summary;
    entry.studyMinutes = Math.round(studyMinutes);
    entry.quizzesCompleted = quizAttempts.length;
    entry.averageQuizScore = averageQuizScore;
    entry.flashcardsReviewed = flashcards.length;
    entry.notesCreated = notes.length;
    entry.focusSessions = focusSessions.length;
    entry.activitiesCount = activities.length;
    entry.milestones = milestones;
    entry.bestQuizScore = bestQuizScore;
    entry.subjectsStudied = subjectsStudied;
    await entry.save();
  }

  return entry;
}

// ── Milestone Detection ──────────────────────────────────────────────────

async function detectMilestones(userId, dateStr, metrics) {
  const milestones = [];
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // Quiz milestones
  const totalQuizzes = await QuizAttempt.count({ where: { user: userId } });
  if (totalQuizzes === 1 && metrics.quizzesCompleted >= 1) {
    milestones.push(MILESTONE_TYPES.FIRST_QUIZ);
  }
  if (totalQuizzes >= 10 && totalQuizzes - metrics.quizzesCompleted < 10) {
    milestones.push(MILESTONE_TYPES.QUIZ_10);
  }
  if (totalQuizzes >= 50 && totalQuizzes - metrics.quizzesCompleted < 50) {
    milestones.push(MILESTONE_TYPES.QUIZ_50);
  }

  // Perfect score
  if (metrics.bestQuizScore === 100) {
    milestones.push(MILESTONE_TYPES.PERFECT_SCORE);
  }

  // Flashcard milestones
  const totalFlashcards = await Flashcard.count({
    where: { user: userId, updatedAt: { [Op.lte]: endOfDay } },
  });
  if (totalFlashcards >= 100 && totalFlashcards - metrics.flashcardsReviewed < 100) {
    milestones.push(MILESTONE_TYPES.FLASHCARD_100);
  }

  // Note milestone
  const totalNotes = await Note.count({ where: { user: userId } });
  if (totalNotes === 1 && metrics.notesCreated >= 1) {
    milestones.push(MILESTONE_TYPES.FIRST_NOTE);
  }

  // Study hour milestones
  const totalSessions = await FocusSession.findAll({
    where: { user: userId, createdAt: { [Op.lte]: endOfDay } },
    attributes: ['activeSeconds'],
  });
  const totalMinutes = totalSessions.reduce((sum, s) => sum + (s.activeSeconds || 0), 0) / 60;
  if (totalMinutes >= 600 && totalMinutes - metrics.studyMinutes < 600) {
    milestones.push(MILESTONE_TYPES.STUDY_HOUR_10);
  }
  if (totalMinutes >= 3000 && totalMinutes - metrics.studyMinutes < 3000) {
    milestones.push(MILESTONE_TYPES.STUDY_HOUR_50);
  }

  // Streak milestones
  const streak = await computeJournalStreak(userId, dateStr);
  if (streak === 7) milestones.push(MILESTONE_TYPES.STREAK_7);
  if (streak === 14) milestones.push(MILESTONE_TYPES.STREAK_14);
  if (streak === 30) milestones.push(MILESTONE_TYPES.STREAK_30);

  // Daily goals met
  const dayGoals = await StudyGoal.findAll({
    where: {
      user: userId,
      startDate: { [Op.lte]: dateStr },
      endDate: { [Op.gte]: dateStr },
      status: 'active',
    },
  });
  const completedGoals = dayGoals.filter((g) => g.currentValue >= g.targetValue);
  if (dayGoals.length > 0 && completedGoals.length === dayGoals.length) {
    milestones.push(MILESTONE_TYPES.DAILY_GOALS_MET);
  }

  // Time-based milestones
  const hour = new Date(startOfDay).getUTCHours();
  if (hour < 7 && metrics.studyMinutes > 0) {
    milestones.push(MILESTONE_TYPES.EARLY_BIRD);
  }

  return milestones;
}

async function computeJournalStreak(userId, dateStr) {
  const entries = await LearningJournal.findAll({
    where: {
      user: userId,
      entryDate: { [Op.lte]: dateStr },
      studyMinutes: { [Op.gt]: 0 },
    },
    order: [['entryDate', 'DESC']],
    attributes: ['entryDate'],
  });

  let streak = 0;
  let checkDate = new Date(dateStr);

  for (const entry of entries) {
    const entryDate = new Date(entry.entryDate).toISOString().split('T')[0];
    const checkStr = checkDate.toISOString().split('T')[0];

    if (entryDate === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (entryDate < checkStr) {
      break;
    }
  }

  return streak;
}

// ── Title & Summary Generation ───────────────────────────────────────────

function generateTitle(dateStr, studyMinutes, quizCount, flashcardCount) {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  if (studyMinutes === 0 && quizCount === 0 && flashcardCount === 0) {
    return `📚 ${dayName} — Rest Day`;
  }

  const parts = [];
  if (studyMinutes > 0) parts.push(`${Math.round(studyMinutes)} min studied`);
  if (quizCount > 0) parts.push(`${quizCount} quiz${quizCount > 1 ? 'zes' : ''}`);
  if (flashcardCount > 0) parts.push(`${flashcardCount} cards reviewed`);

  return `📚 ${dayName} — ${parts.join(', ')}`;
}

function generateSummary(studyMinutes, quizCount, flashcardCount, noteCount, sessionCount, subjects) {
  const parts = [];

  if (studyMinutes === 0 && quizCount === 0) {
    return 'No study activity recorded for this day.';
  }

  if (studyMinutes > 0) {
    const hours = Math.floor(studyMinutes / 60);
    const mins = Math.round(studyMinutes % 60);
    if (hours > 0) parts.push(`${hours}h ${mins}m of study`);
    else parts.push(`${mins} minutes of study`);
  }

  if (sessionCount > 0) {
    parts.push(`${sessionCount} focus session${sessionCount > 1 ? 's' : ''}`);
  }

  if (quizCount > 0) {
    parts.push(`${quizCount} quiz${quizCount > 1 ? 'zes' : ''} completed`);
  }

  if (flashcardCount > 0) {
    parts.push(`${flashcardCount} flashcards reviewed`);
  }

  if (noteCount > 0) {
    parts.push(`${noteCount} note${noteCount > 1 ? 's' : ''} created`);
  }

  if (subjects.length > 0) {
    const names = subjects.map((s) => s.name).slice(0, 3);
    parts.push(`Subjects: ${names.join(', ')}${subjects.length > 3 ? ` +${subjects.length - 3} more` : ''}`);
  }

  return parts.join('. ') + '.';
}

// ── Query / Retrieval ────────────────────────────────────────────────────

async function getJournalEntries(userId, { startDate, endDate, page = 1, limit = 20 } = {}) {
  const where = { user: userId };
  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) where.entryDate[Op.gte] = startDate;
    if (endDate) where.entryDate[Op.lte] = endDate;
  }

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: entries } = await LearningJournal.findAndCountAll({
    where,
    order: [['entryDate', 'DESC']],
    offset,
    limit,
  });

  return {
    entries,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getEntryByDate(userId, dateStr) {
  return LearningJournal.findOne({ where: { user: userId, entryDate: dateStr } });
}

async function getEntryById(userId, entryId) {
  return LearningJournal.findOne({ where: { id: entryId, user: userId } });
}

async function addReflection(userId, entryId, reflection) {
  const entry = await LearningJournal.findOne({ where: { id: entryId, user: userId } });
  if (!entry) return null;

  entry.reflection = reflection;
  entry.entryType = 'reflection';
  await entry.save();
  return entry;
}

async function updateMoodAndEnergy(userId, entryId, mood, energyLevel) {
  const entry = await LearningJournal.findOne({ where: { id: entryId, user: userId } });
  if (!entry) return null;

  if (mood) entry.mood = mood;
  if (energyLevel) entry.energyLevel = energyLevel;
  await entry.save();
  return entry;
}

async function deleteEntry(userId, entryId) {
  const entry = await LearningJournal.findOne({ where: { id: entryId, user: userId } });
  if (!entry) return false;
  await entry.destroy();
  return true;
}

// ── Analytics ────────────────────────────────────────────────────────────

async function getJournalAnalytics(userId, { startDate, endDate } = {}) {
  const where = { user: userId };
  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) where.entryDate[Op.gte] = startDate;
    if (endDate) where.entryDate[Op.lte] = endDate;
  }

  const entries = await LearningJournal.findAll({
    where,
    order: [['entryDate', 'ASC']],
  });

  if (entries.length === 0) {
    return {
      totalDays: 0,
      totalStudyMinutes: 0,
      averageStudyMinutes: 0,
      totalQuizzes: 0,
      averageQuizScore: 0,
      totalFlashcards: 0,
      totalNotes: 0,
      activeDays: 0,
      restDays: 0,
      totalMilestones: 0,
      milestoneTypes: {},
      subjectDistribution: {},
      moodDistribution: {},
      energyTrend: [],
      studyTrend: [],
    };
  }

  const totalStudyMinutes = entries.reduce((sum, e) => sum + e.studyMinutes, 0);
  const totalQuizzes = entries.reduce((sum, e) => sum + e.quizzesCompleted, 0);
  const quizScores = entries.filter((e) => e.averageQuizScore > 0).map((e) => e.averageQuizScore);
  const totalFlashcards = entries.reduce((sum, e) => sum + e.flashcardsReviewed, 0);
  const totalNotes = entries.reduce((sum, e) => sum + e.notesCreated, 0);
  const activeDays = entries.filter((e) => e.studyMinutes > 0).length;

  // Milestone analytics
  const milestoneTypes = {};
  let totalMilestones = 0;
  for (const entry of entries) {
    for (const m of entry.milestones || []) {
      milestoneTypes[m.type] = (milestoneTypes[m.type] || 0) + 1;
      totalMilestones++;
    }
  }

  // Subject distribution
  const subjectDistribution = {};
  for (const entry of entries) {
    for (const sub of entry.subjectsStudied || []) {
      const key = sub.name || 'General';
      subjectDistribution[key] = (subjectDistribution[key] || 0) + sub.minutes;
    }
  }

  // Mood distribution
  const moodDistribution = {};
  for (const entry of entries) {
    if (entry.mood) {
      moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
    }
  }

  // Trend data
  const studyTrend = entries.map((e) => ({
    date: e.entryDate,
    minutes: e.studyMinutes,
    quizzes: e.quizzesCompleted,
    score: e.averageQuizScore,
  }));

  const energyTrend = entries
    .filter((e) => e.energyLevel != null)
    .map((e) => ({ date: e.entryDate, energy: e.energyLevel }));

  return {
    totalDays: entries.length,
    totalStudyMinutes: Math.round(totalStudyMinutes),
    averageStudyMinutes: Math.round(totalStudyMinutes / entries.length),
    totalQuizzes,
    averageQuizScore: quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0,
    totalFlashcards,
    totalNotes,
    activeDays,
    restDays: entries.length - activeDays,
    consistencyRate: entries.length > 0
      ? Math.round((activeDays / entries.length) * 100)
      : 0,
    totalMilestones,
    milestoneTypes,
    subjectDistribution,
    moodDistribution,
    studyTrend,
    energyTrend,
  };
}

// ── Timeline ─────────────────────────────────────────────────────────────

async function getTimeline(userId, { page = 1, limit = 10 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: entries } = await LearningJournal.findAndCountAll({
    where: { user: userId, studyMinutes: { [Op.gt]: 0 } },
    order: [['entryDate', 'DESC']],
    offset,
    limit,
  });

  const timeline = entries.map((entry) => ({
    date: entry.entryDate,
    title: entry.title,
    studyMinutes: entry.studyMinutes,
    milestones: entry.milestones,
    subjectsStudied: entry.subjectsStudied,
    mood: entry.mood,
    reflection: entry.reflection,
  }));

  return {
    timeline,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

// ── Dashboard ────────────────────────────────────────────────────────────

async function getDashboard(userId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const [todayEntry, weekEntries, streak, analytics] = await Promise.all([
    getEntryByDate(userId, todayStr),
    LearningJournal.findAll({
      where: {
        user: userId,
        entryDate: { [Op.between]: [weekAgoStr, todayStr] },
      },
      order: [['entryDate', 'DESC']],
    }),
    computeJournalStreak(userId, todayStr),
    getJournalAnalytics(userId, { startDate: weekAgoStr, endDate: todayStr }),
  ]);

  return {
    today: todayEntry,
    streak,
    weekSummary: {
      totalStudyMinutes: analytics.totalStudyMinutes,
      totalQuizzes: analytics.totalQuizzes,
      activeDays: analytics.activeDays,
      totalMilestones: analytics.totalMilestones,
    },
    recentEntries: weekEntries.slice(0, 5),
  };
}

// ── Batch Generation ─────────────────────────────────────────────────────

/**
 * Generate journal entries for a date range. Useful for backfilling
 * historical data or running a daily cron job.
 */
async function generateJournalRange(userId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const entries = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const entry = await generateJournalEntry(userId, dateStr);
    entries.push(entry);
  }

  return entries;
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
  generateJournalEntry,
  getJournalEntries,
  getEntryByDate,
  getEntryById,
  addReflection,
  updateMoodAndEnergy,
  deleteEntry,
  getJournalAnalytics,
  getTimeline,
  getDashboard,
  generateJournalRange,
  computeJournalStreak,
  detectMilestones,
  generateTitle,
  generateSummary,
  MILESTONE_TYPES,
  ACTIVITY_TYPES,
  NotFoundError,
};
