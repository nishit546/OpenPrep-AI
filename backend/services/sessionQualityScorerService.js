const { Op, fn, col, literal } = require('sequelize');
const SessionQualityScore = require('../models/SessionQualityScore');
const StudySession = require('../models/StudySession');
const QuizAttempt = require('../models/QuizAttempt');

// ── Constants ────────────────────────────────────────────────────────────

/** Optimal session length range (minutes) for health scoring. */
const OPTIMAL_MIN_MINUTES = 20;
const OPTIMAL_MAX_MINUTES = 90;

/** Grade boundaries. */
const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 65, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 30, grade: 'D' },
  { min: 0,  grade: 'F' },
];

/** Peak productivity hours (default before user data available). */
const DEFAULT_PEAK_HOURS = [9, 10, 11, 14, 15, 16];

/** Weight each dimension contributes to the overall score. */
const DIMENSION_WEIGHTS = {
  focus: 0.30,
  efficiency: 0.25,
  retention: 0.25,
  health: 0.20,
};

// ── Scoring Engine ───────────────────────────────────────────────────────

/**
 * Score a single study session on all four dimensions.
 *
 * @param {string} userId
 * @param {object} sessionData
 * @param {string} sessionData.sessionId
 * @param {number} sessionData.durationMinutes
 * @param {string} [sessionData.topic]
 * @param {string} [sessionData.subjectName]
 * @param {number} [sessionData.focusRating]       – 1-5 self-rating
 * @param {number} [sessionData.interruptions]      – count of interruptions
 * @param {number} [sessionData.quizzesTaken]       – quizzes attempted
 * @param {number} [sessionData.quizAvgScore]       – average quiz score %
 * @param {number} [sessionData.flashcardsReviewed] – cards reviewed
 * @param {number} [sessionData.flashcardAccuracy]  – recall accuracy %
 * @param {number} [sessionData.notesCreated]       – notes created
 * @param {number} [sessionData.sessionHour]        – hour session started (0-23)
 * @returns {Promise<SessionQualityScore>}
 */
async function scoreSession(userId, sessionData) {
  const {
    sessionId,
    durationMinutes,
    topic,
    subjectName,
    focusRating = 3,
    interruptions = 0,
    quizzesTaken = 0,
    quizAvgScore = 0,
    flashcardsReviewed = 0,
    flashcardAccuracy = 0,
    notesCreated = 0,
    sessionHour,
  } = sessionData;

  if (!sessionId || !durationMinutes) {
    throw new Error('sessionId and durationMinutes are required');
  }

  const hour = sessionHour != null ? sessionHour : new Date().getHours();

  // ── Focus Score ────────────────────────────────────────────────────
  const focusScore = computeFocusScore(focusRating, interruptions, durationMinutes);

  // ── Efficiency Score ───────────────────────────────────────────────
  const efficiencyScore = computeEfficiencyScore(
    durationMinutes, quizzesTaken, flashcardsReviewed, notesCreated,
  );

  // ── Retention Score ────────────────────────────────────────────────
  const retentionScore = computeRetentionScore(quizAvgScore, flashcardAccuracy, quizzesTaken, flashcardsReviewed);

  // ── Health Score ───────────────────────────────────────────────────
  const healthScore = computeHealthScore(durationMinutes, hour);

  // ── Overall ────────────────────────────────────────────────────────
  const overallScore = computeOverallScore({ focusScore, efficiencyScore, retentionScore, healthScore });
  const grade = scoreToGrade(overallScore);

  // ── Suggestions ────────────────────────────────────────────────────
  const suggestions = generateSuggestions({
    focusScore, efficiencyScore, retentionScore, healthScore,
    durationMinutes, hour, interruptions, quizzesTaken,
  });

  const record = await SessionQualityScore.create({
    user: userId,
    sessionId,
    focusScore: round(focusScore),
    efficiencyScore: round(efficiencyScore),
    retentionScore: round(retentionScore),
    healthScore: round(healthScore),
    overallScore: round(overallScore),
    grade,
    durationMinutes,
    topic: topic || null,
    subjectName: subjectName || null,
    sessionDate: new Date().toISOString().split('T')[0],
    inputSignals: {
      focusRating, interruptions, quizzesTaken, quizAvgScore,
      flashcardsReviewed, flashcardAccuracy, notesCreated, sessionHour: hour,
    },
    suggestions,
  });

  return record;
}

/**
 * Batch-score multiple sessions.
 */
async function scoreSessions(userId, sessions) {
  const results = [];
  for (const s of sessions) {
    results.push(await scoreSession(userId, s));
  }
  return results;
}

// ── Analytics ────────────────────────────────────────────────────────────

/**
 * Get quality trend over time for the user.
 */
async function getQualityTrend(userId, { days = 30, subjectName } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const where = { user: userId, sessionDate: { [Op.gte]: since } };
  if (subjectName) where.subjectName = subjectName;

  const records = await SessionQualityScore.findAll({
    where,
    order: [['sessionDate', 'ASC']],
  });

  if (records.length === 0) {
    return { dataPoints: [], averageScore: 0, gradeDistribution: {}, trend: 'new' };
  }

  const dataPoints = records.map((r) => ({
    date: r.sessionDate,
    overallScore: r.overallScore,
    grade: r.grade,
    focusScore: r.focusScore,
    efficiencyScore: r.efficiencyScore,
    retentionScore: r.retentionScore,
    healthScore: r.healthScore,
  }));

  const averageScore = Math.round(
    records.reduce((sum, r) => sum + r.overallScore, 0) / records.length,
  );

  const gradeDistribution = {};
  for (const r of records) {
    gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
  }

  // Trend: compare first half vs second half
  const mid = Math.floor(records.length / 2);
  const firstHalfAvg = records.slice(0, mid).reduce((s, r) => s + r.overallScore, 0) / (mid || 1);
  const secondHalfAvg = records.slice(mid).reduce((s, r) => s + r.overallScore, 0) / (records.length - mid || 1);
  const diff = secondHalfAvg - firstHalfAvg;
  const trend = diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';

  return { dataPoints, averageScore, gradeDistribution, trend, totalSessions: records.length };
}

/**
 * Get dimensional averages (focus, efficiency, retention, health).
 */
async function getDimensionalAverages(userId, { days = 14, subjectName } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const where = { user: userId, sessionDate: { [Op.gte]: since } };
  if (subjectName) where.subjectName = subjectName;

  const records = await SessionQualityScore.findAll({ where });

  if (records.length === 0) {
    return { focus: 0, efficiency: 0, retention: 0, health: 0, overall: 0, sessions: 0 };
  }

  return {
    focus: round(records.reduce((s, r) => s + r.focusScore, 0) / records.length),
    efficiency: round(records.reduce((s, r) => s + r.efficiencyScore, 0) / records.length),
    retention: round(records.reduce((s, r) => s + r.retentionScore, 0) / records.length),
    health: round(records.reduce((s, r) => s + r.healthScore, 0) / records.length),
    overall: round(records.reduce((s, r) => s + r.overallScore, 0) / records.length),
    sessions: records.length,
  };
}

/**
 * Get the weakest dimension across recent sessions.
 */
async function getWeakestDimension(userId, { days = 14 } = {}) {
  const avgs = await getDimensionalAverages(userId, { days });
  const dimensions = [
    { name: 'focus', score: avgs.focus },
    { name: 'efficiency', score: avgs.efficiency },
    { name: 'retention', score: avgs.retention },
    { name: 'health', score: avgs.health },
  ];
  dimensions.sort((a, b) => a.score - b.score);
  return { weakest: dimensions[0], strongest: dimensions[3], dimensions };
}

/**
 * Get a summary dashboard.
 */
async function getDashboard(userId) {
  const [trend, avgs, weakest] = await Promise.all([
    getQualityTrend(userId, { days: 30 }),
    getDimensionalAverages(userId, { days: 14 }),
    getWeakestDimension(userId, { days: 14 }),
  ]);

  // Best and worst sessions
  const recent = await SessionQualityScore.findAll({
    where: { user: userId },
    order: [['overallScore', 'DESC']],
    limit: 5,
  });

  return {
    trend,
    averages: avgs,
    weakest,
    topSessions: recent.map((r) => ({
      date: r.sessionDate,
      topic: r.topic,
      grade: r.grade,
      overallScore: r.overallScore,
    })),
  };
}

// ── Dimension Compute Functions ──────────────────────────────────────────

function computeFocusScore(focusRating, interruptions, durationMinutes) {
  // Focus rating contributes 60% (scaled to 0-100 from 1-5)
  const ratingScore = ((focusRating - 1) / 4) * 100;

  // Interruptions penalty: lose 12 points per interruption, min 0
  const interruptionPenalty = Math.min(60, interruptions * 12);

  // Bonus for sessions over 25 min (sustained focus indicator)
  const sustainBonus = durationMinutes >= 25 ? 10 : durationMinutes >= 15 ? 5 : 0;

  return Math.max(0, Math.min(100, ratingScore - interruptionPenalty + sustainBonus));
}

function computeEfficiencyScore(durationMinutes, quizzesTaken, flashcardsReviewed, notesCreated) {
  if (durationMinutes <= 0) return 0;

  // Activities per minute
  const totalActivities = quizzesTaken + flashcardsReviewed + notesCreated;
  const activityRate = totalActivities / durationMinutes;

  // Map activity rate to 0-100 (0.5 activities/min = 80 score)
  const rateScore = Math.min(100, activityRate * 160);

  // Bonus for variety (multiple activity types)
  const types = [quizzesTaken > 0, flashcardsReviewed > 0, notesCreated > 0].filter(Boolean).length;
  const varietyBonus = types >= 3 ? 15 : types >= 2 ? 10 : types >= 1 ? 5 : 0;

  return Math.min(100, rateScore + varietyBonus);
}

function computeRetentionScore(quizAvgScore, flashcardAccuracy, quizzesTaken, flashcardsReviewed) {
  const hasQuiz = quizzesTaken > 0;
  const hasFlashcards = flashcardsReviewed > 0;

  if (!hasQuiz && !hasFlashcards) return 50; // Neutral when no retention data

  let totalScore = 0;
  let weights = 0;

  if (hasQuiz) {
    totalScore += quizAvgScore * 0.6;
    weights += 0.6;
  }
  if (hasFlashcards) {
    totalScore += flashcardAccuracy * 0.4;
    weights += 0.4;
  }

  return weights > 0 ? (totalScore / weights) : 50;
}

function computeHealthScore(durationMinutes, sessionHour) {
  // Duration scoring: bell curve around optimal range
  let durationScore;
  if (durationMinutes >= OPTIMAL_MIN_MINUTES && durationMinutes <= OPTIMAL_MAX_MINUTES) {
    durationScore = 100;
  } else if (durationMinutes < OPTIMAL_MIN_MINUTES) {
    durationScore = Math.max(0, (durationMinutes / OPTIMAL_MIN_MINUTES) * 100);
  } else {
    // Over-optimal: gradual decline
    const overBy = durationMinutes - OPTIMAL_MAX_MINUTES;
    durationScore = Math.max(20, 100 - overBy * 1.5);
  }

  // Time-of-day scoring
  const timeScore = DEFAULT_PEAK_HOURS.includes(sessionHour) ? 100 : 60;

  return durationScore * 0.6 + timeScore * 0.4;
}

function computeOverallScore({ focusScore, efficiencyScore, retentionScore, healthScore }) {
  return (
    focusScore * DIMENSION_WEIGHTS.focus +
    efficiencyScore * DIMENSION_WEIGHTS.efficiency +
    retentionScore * DIMENSION_WEIGHTS.retention +
    healthScore * DIMENSION_WEIGHTS.health
  );
}

function scoreToGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return 'F';
}

// ── Suggestions ──────────────────────────────────────────────────────────

function generateSuggestions({
  focusScore, efficiencyScore, retentionScore, healthScore,
  durationMinutes, hour, interruptions, quizzesTaken,
}) {
  const suggestions = [];

  if (focusScore < 50) {
    suggestions.push({
      category: 'focus',
      message: interruptions > 2
        ? `You had ${interruptions} interruptions. Try silencing notifications and using a focused environment.`
        : 'Your focus rating was low. Consider shorter, more intense sessions or the Pomodoro technique.',
      priority: 'high',
    });
  }

  if (efficiencyScore < 40) {
    suggestions.push({
      category: 'efficiency',
      message: 'Your activity rate was low. Mix active recall (quizzes, flashcards) with passive reading.',
      priority: 'high',
    });
  }

  if (retentionScore < 50 && retentionScore > 0) {
    suggestions.push({
      category: 'retention',
      message: 'Quiz/flashcard accuracy was below 50%. Review the material before attempting again.',
      priority: 'medium',
    });
  }

  if (retentionScore === 50 && quizzesTaken === 0) {
    suggestions.push({
      category: 'retention',
      message: 'No quizzes or flashcards used this session. Add active recall to boost retention.',
      priority: 'medium',
    });
  }

  if (healthScore < 60) {
    if (durationMinutes < OPTIMAL_MIN_MINUTES) {
      suggestions.push({
        category: 'health',
        message: `Session was only ${durationMinutes} min. Aim for ${OPTIMAL_MIN_MINUTES}–${OPTIMAL_MAX_MINUTES} min for optimal learning.`,
        priority: 'medium',
      });
    } else if (!DEFAULT_PEAK_HOURS.includes(hour)) {
      suggestions.push({
        category: 'health',
        message: `You studied at ${formatHour(hour)}. Your peak hours are typically 9–11 AM and 2–4 PM.`,
        priority: 'low',
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      category: 'general',
      message: 'Great session! Keep maintaining this quality level.',
      priority: 'info',
    });
  }

  return suggestions;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function round(n) {
  return Math.round(n * 10) / 10;
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

module.exports = {
  scoreSession,
  scoreSessions,
  getQualityTrend,
  getDimensionalAverages,
  getWeakestDimension,
  getDashboard,
  computeFocusScore,
  computeEfficiencyScore,
  computeRetentionScore,
  computeHealthScore,
  computeOverallScore,
  scoreToGrade,
  OPTIMAL_MIN_MINUTES,
  OPTIMAL_MAX_MINUTES,
  GRADE_THRESHOLDS,
  DIMENSION_WEIGHTS,
};
