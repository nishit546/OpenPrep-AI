const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
const StudyAnalyticsSnapshot = require('../models/StudyAnalyticsSnapshot');
const FocusSession = require('../models/FocusSession');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');
const Subject = require('../models/Subject');
const StudyGoal = require('../models/StudyGoal');
const StudyGoalProgress = require('../models/StudyGoalProgress');
const Progress = require('../models/Progress');
const ActivityLog = require('../models/ActivityLog');

// ── Constants ────────────────────────────────────────────────────────────

const INSIGHT_THRESHOLDS = {
  highConsistency: 80,
  mediumConsistency: 50,
  lowConsistency: 20,
  highBalance: 75,
  mediumBalance: 40,
  highRetention: 80,
  mediumRetention: 60,
  improvementThreshold: 3,
  declineThreshold: -3,
};

const INSIGHT_TYPES = {
  CONSISTENCY: 'consistency',
  BALANCE: 'balance',
  PERFORMANCE: 'performance',
  RETENTION: 'retention',
  READINESS: 'readiness',
  TIMING: 'timing',
  GOAL: 'goal',
};

const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// ── Snapshot Generation ──────────────────────────────────────────────────

/**
 * Generate an analytics snapshot for the given user and period.
 * @param {string} userId
 * @param {string} periodType - 'daily' | 'weekly' | 'monthly'
 * @param {string} periodStart - ISO date string
 * @param {string} periodEnd - ISO date string
 * @returns {Object} The created snapshot
 */
async function generateSnapshot(userId, periodType, periodStart, periodEnd) {
  const [consistency, subjectDist, performance, readiness, quality, timing, goals] = await Promise.all([
    computeConsistencyMetrics(userId, periodStart, periodEnd),
    computeSubjectDistribution(userId, periodStart, periodEnd),
    computePerformanceTrends(userId, periodStart, periodEnd),
    computeReadinessProjections(userId),
    computeStudyQuality(userId, periodStart, periodEnd),
    computeTimingAnalysis(userId, periodStart, periodEnd),
    computeGoalProgress(userId, periodStart, periodEnd),
  ]);

  const insights = generateInsights(consistency, subjectDist, performance, readiness, quality, goals);
  const recommendations = generateRecommendations(insistency, subjectDist, performance, readiness, quality);

  // Fetch previous snapshot for comparison
  const previousSnapshot = await StudyAnalyticsSnapshot.findOne({
    where: {
      user: userId,
      periodType,
      periodEnd: { [Op.lt]: periodStart },
    },
    order: [['periodEnd', 'DESC']],
  });

  const comparedToPrevious = previousSnapshot
    ? computeComparativeDelta(previousSnapshot, {
        totalStudyMinutes: consistency.totalStudyMinutes,
        averageQuizScore: performance.averageQuizScore,
        currentReadiness: readiness.currentReadiness,
        consistencyScore: consistency.consistencyScore,
      })
    : null;

  const snapshot = await StudyAnalyticsSnapshot.create({
    user: userId,
    snapshotDate: new Date().toISOString().split('T')[0],
    periodType,
    periodStart,
    periodEnd,
    ...consistency,
    subjectDistribution: subjectDist.distribution,
    balanceScore: subjectDist.balanceScore,
    mostStudiedSubject: subjectDist.mostStudied,
    leastStudiedSubject: subjectDist.leastStudied,
    ...performance,
    ...readiness,
    ...quality,
    ...timing,
    insights,
    recommendations,
    comparedToPrevious,
  });

  return snapshot;
}

// ── Consistency Metrics ──────────────────────────────────────────────────

async function computeConsistencyMetrics(userId, periodStart, periodEnd) {
  const sessions = await FocusSession.findAll({
    where: {
      user: userId,
      createdAt: {
        [Op.between]: [periodStart, periodEnd],
      },
    },
    order: [['createdAt', 'ASC']],
  });

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.activeSeconds || 0) / 60, 0);
  const avgMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const longestSession = totalSessions > 0
    ? Math.max(...sessions.map((s) => (s.activeSeconds || 0) / 60))
    : 0;

  // Calculate active days
  const studyDays = new Set();
  sessions.forEach((s) => {
    const day = new Date(s.createdAt).toISOString().split('T')[0];
    studyDays.add(day);
  });

  const periodDays = getDaysBetween(periodStart, periodEnd);
  const activeDays = studyDays.size;
  const consistencyScore = periodDays > 0
    ? Math.min(100, Math.round((activeDays / periodDays) * 100))
    : 0;

  // Streak calculation
  const { currentStreak, longestStreak } = computeStreaks(sessions);

  return {
    totalStudySessions: totalSessions,
    totalStudyMinutes: totalMinutes,
    averageSessionMinutes: avgMinutes,
    longestSessionMinutes: longestSession,
    activeDays,
    totalDays: periodDays,
    consistencyScore,
    currentStreak,
    longestStreak,
  };
}

function computeStreaks(sessions) {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const days = [...new Set(
    sessions.map((s) => new Date(s.createdAt).toISOString().split('T')[0])
  )].sort();

  let longestStreak = 0;
  let currentStreak = 0;
  let streakStart = null;

  for (let i = 0; i < days.length; i++) {
    if (i === 0) {
      currentStreak = 1;
      streakStart = days[i];
    } else {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
        streakStart = days[i];
      }
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Current streak: count backwards from today
  const today = new Date().toISOString().split('T')[0];
  let trailingStreak = 0;
  const sortedDays = days.slice().reverse();
  let checkDate = new Date(today);

  for (const day of sortedDays) {
    if (day === checkDate.toISOString().split('T')[0]) {
      trailingStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (day < checkDate.toISOString().split('T')[0]) {
      break;
    }
  }

  return {
    currentStreak: trailingStreak,
    longestStreak,
  };
}

// ── Subject Distribution ─────────────────────────────────────────────────

async function computeSubjectDistribution(userId, periodStart, periodEnd) {
  const sessions = await FocusSession.findAll({
    where: {
      user: userId,
      createdAt: { [Op.between]: [periodStart, periodEnd] },
    },
  });

  // Fetch subject names separately (FocusSession has no belongsTo Subject association)
  const subjectIds = [...new Set(sessions.map((s) => s.subject).filter(Boolean))];
  const subjects = subjectIds.length > 0
    ? await Subject.findAll({ where: { id: { [Op.in]: subjectIds }, user: userId }, attributes: ['id', 'name'] })
    : [];
  const subjectNameMap = {};
  subjects.forEach((s) => { subjectNameMap[s.id] = s.name; });

  const dist = {};
  let totalMinutes = 0;

  for (const session of sessions) {
    const subjectId = session.subject || 'unassigned';
    const subjectName = subjectNameMap[session.subject] || 'Unassigned';
    const minutes = (session.activeSeconds || 0) / 60;
    totalMinutes += minutes;

    if (!dist[subjectId]) {
      dist[subjectId] = { name: subjectName, minutes: 0, percentage: 0, sessionCount: 0 };
    }
    dist[subjectId].minutes += minutes;
    dist[subjectId].sessionCount += 1;
  }

  // Calculate percentages
  for (const id of Object.keys(dist)) {
    dist[id].percentage = totalMinutes > 0
      ? Math.round((dist[id].minutes / totalMinutes) * 100)
      : 0;
  }

  // Balance score: inverse coefficient of variation of time distribution
  const values = Object.values(dist).map((d) => d.percentage);
  const balanceScore = computeBalanceScore(values);

  const sorted = Object.entries(dist).sort((a, b) => b[1].minutes - a[1].minutes);
  const mostStudied = sorted.length > 0 ? { id: sorted[0][0], ...sorted[0][1] } : null;
  const leastStudied = sorted.length > 0 ? { id: sorted[sorted.length - 1][0], ...sorted[sorted.length - 1][1] } : null;

  return {
    distribution: dist,
    balanceScore,
    mostStudied,
    leastStudied,
  };
}

function computeBalanceScore(percentages) {
  if (percentages.length <= 1) return 100;
  const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
  if (mean === 0) return 0;

  const variance = percentages.reduce((sum, v) => sum + (v - mean) ** 2, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  // Perfect distribution (cv=0) => 100, highly uneven (cv>=1) => 0
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

// ── Performance Trends ───────────────────────────────────────────────────

async function computePerformanceTrends(userId, periodStart, periodEnd) {
  const attempts = await QuizAttempt.findAll({
    where: {
      user: userId,
      createdAt: { [Op.between]: [periodStart, periodEnd] },
    },
    include: [{ model: Quiz, as: 'quizRef', attributes: ['id', 'title', 'subject'] }],
  });

  const quizzesCompleted = attempts.length;
  const scores = attempts
    .map((a) => (typeof a.score === 'number' ? a.score : null))
    .filter((s) => s !== null);

  const averageQuizScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Trend detection: compare first-half vs second-half scores
  const { trend, improvementRate } = computeScoreTrend(scores);

  // Flashcard metrics
  const flashcardStats = await computeFlashcardStats(userId, periodStart, periodEnd);

  return {
    quizzesCompleted,
    averageQuizScore,
    quizScoreTrend: trend,
    improvementRate,
    flashcardsReviewed: flashcardStats.totalReviewed,
    flashcardRetentionRate: flashcardStats.retentionRate,
  };
}

function computeScoreTrend(scores) {
  if (scores.length < 4) {
    return { trend: 'insufficient_data', improvementRate: 0 };
  }

  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const delta = avgSecond - avgFirst;
  const improvementRate = avgFirst > 0 ? Math.round((delta / avgFirst) * 100) : 0;

  if (improvementRate >= INSIGHT_THRESHOLDS.improvementThreshold) {
    return { trend: 'improving', improvementRate };
  }
  if (improvementRate <= INSIGHT_THRESHOLDS.declineThreshold) {
    return { trend: 'declining', improvementRate };
  }
  return { trend: 'stable', improvementRate };
}

async function computeFlashcardStats(userId, periodStart, periodEnd) {
  const flashcards = await Flashcard.findAll({
    where: {
      user: userId,
      lastReviewedAt: { [Op.between]: [periodStart, periodEnd] },
    },
  });

  const totalReviewed = flashcards.length;
  const reviewedCards = flashcards.filter((f) => typeof f.confidence === 'number');
  const retentionRate = reviewedCards.length > 0
    ? Math.round(
        (reviewedCards.filter((f) => f.confidence >= 3).length / reviewedCards.length) * 100
      )
    : 0;

  return { totalReviewed, retentionRate };
}

// ── Readiness Projections ────────────────────────────────────────────────

async function computeReadinessProjections(userId) {
  // Get recent progress entries to compute current readiness
  const recentProgress = await Progress.findAll({
    where: { user: userId },
    order: [['createdAt', 'DESC']],
    limit: 30,
  });

  const scores = recentProgress
    .map((p) => (typeof p.score === 'number' ? p.score : null))
    .filter((s) => s !== null);

  const currentReadiness = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Get historical snapshots for trajectory
  const snapshots = await StudyAnalyticsSnapshot.findAll({
    where: { user: userId },
    order: [['snapshotDate', 'ASC']],
    limit: 12,
    attributes: ['snapshotDate', 'currentReadiness'],
  });

  const readinessHistory = snapshots.map((s) => ({
    date: s.snapshotDate,
    actual: s.currentReadiness,
    projected: null,
  }));

  // Linear regression for projection
  const projected = linearRegression(readinessHistory.map((h) => h.actual));
  const lastDate = readinessHistory.length > 0
    ? new Date(readinessHistory[readinessHistory.length - 1].date)
    : new Date();
  const futureDate = new Date(lastDate);
  futureDate.setDate(futureDate.getDate() + 30);

  const projectedReadiness = Math.min(100, Math.max(0, Math.round(
    projected.slope * (readinessHistory.length + 4) + projected.intercept
  )));

  // Build trajectory with projected points
  const trajectory = [...readinessHistory];
  const nextMonth = new Date(lastDate);
  for (let i = 1; i <= 4; i++) {
    nextMonth.setDate(nextMonth.getDate() + 7);
    trajectory.push({
      date: nextMonth.toISOString().split('T')[0],
      actual: null,
      projected: Math.min(100, Math.max(0, Math.round(
        projected.slope * (readinessHistory.length + i) + projected.intercept
      ))),
    });
  }

  const readinessDelta = snapshots.length >= 2
    ? currentReadiness - (snapshots[snapshots.length - 2].currentReadiness || 0)
    : 0;

  return {
    currentReadiness,
    readinessDelta,
    projectedReadiness,
    readinessTrajectory: trajectory,
  };
}

function linearRegression(values) {
  if (values.length < 2) return { slope: 0, intercept: values[0] || 50 };
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n || 50;

  return { slope, intercept };
}

// ── Study Quality ────────────────────────────────────────────────────────

async function computeStudyQuality(userId, periodStart, periodEnd) {
  const sessions = await FocusSession.findAll({
    where: {
      user: userId,
      createdAt: { [Op.between]: [periodStart, periodEnd] },
    },
  });

  if (sessions.length === 0) {
    return {
      focusScore: 0,
      efficiencyRating: 'needs_improvement',
      peakStudyHour: 9,
      dailyDistribution: new Array(24).fill(0),
    };
  }

  // Focus score: based on session duration patterns and consistency
  const durations = sessions.map((s) => (s.activeSeconds || 0) / 60);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const hasGoodDuration = avgDuration >= 25 && avgDuration <= 120; // Pomodoro to 2 hours
  const durationVariance = durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / durations.length;
  const durationStdDev = Math.sqrt(durationVariance);
  const consistencyFactor = Math.max(0, 1 - (durationStdDev / (avgDuration || 1)));

  const focusScore = Math.round(
    (hasGoodDuration ? 50 : 25) + (consistencyFactor * 50)
  );

  // Efficiency rating
  let efficiencyRating;
  if (focusScore >= 80) efficiencyRating = 'excellent';
  else if (focusScore >= 60) efficiencyRating = 'good';
  else if (focusScore >= 40) efficiencyRating = 'average';
  else efficiencyRating = 'needs_improvement';

  // Hour distribution
  const hourDist = new Array(24).fill(0);
  sessions.forEach((s) => {
    const hour = new Date(s.createdAt).getHours();
    hourDist[hour] += (s.activeSeconds || 0) / 60;
  });
  const peakStudyHour = hourDist.indexOf(Math.max(...hourDist));

  return {
    focusScore,
    efficiencyRating,
    peakStudyHour,
    dailyDistribution: hourDist,
  };
}

// ── Timing Analysis ──────────────────────────────────────────────────────

async function computeTimingAnalysis(userId, periodStart, periodEnd) {
  // This enriches the quality metrics with timing-specific data
  const focusSessions = await FocusSession.findAll({
    where: {
      user: userId,
      createdAt: { [Op.between]: [periodStart, periodEnd] },
    },
  });

  // For now, return timing info derived from existing data
  // This can be expanded with focus session telemetry later
  return {};
}

// ── Goal Progress ────────────────────────────────────────────────────────

async function computeGoalProgress(userId, periodStart, periodEnd) {
  const goals = await StudyGoal.findAll({
    where: {
      user: userId,
      status: 'active',
    },
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  return {
    totalGoals,
    completedGoals,
    goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
  };
}

// ── Insight Generation ───────────────────────────────────────────────────

function generateInsights(consistency, subjectDist, performance, readiness, quality, goals) {
  const insights = [];

  // Consistency insights
  if (consistency.consistencyScore >= INSIGHT_THRESHOLDS.highConsistency) {
    insights.push({
      type: INSIGHT_TYPES.CONSISTENCY,
      priority: PRIORITY.LOW,
      message: `Excellent consistency! You studied ${consistency.activeDays} of ${consistency.totalDays} days (${consistency.consistencyScore}%).`,
      actionable: false,
    });
  } else if (consistency.consistencyScore < INSIGHT_THRESHOLDS.lowConsistency) {
    insights.push({
      type: INSIGHT_TYPES.CONSISTENCY,
      priority: PRIORITY.HIGH,
      message: `Study consistency is low — only ${consistency.activeDays} of ${consistency.totalDays} days active. Try setting daily reminders.`,
      actionable: true,
    });
  }

  // Balance insights
  if (subjectDist.balanceScore < INSIGHT_THRESHOLDS.mediumBalance && subjectDist.mostStudied) {
    insights.push({
      type: INSIGHT_TYPES.BALANCE,
      priority: PRIORITY.MEDIUM,
      message: `Your study time is heavily skewed toward "${subjectDist.mostStudied.name}" (${subjectDist.mostStudied.percentage}%). Consider distributing time more evenly.`,
      actionable: true,
    });
  }

  // Performance insights
  if (performance.quizScoreTrend === 'declining') {
    insights.push({
      type: INSIGHT_TYPES.PERFORMANCE,
      priority: PRIORITY.HIGH,
      message: `Quiz scores have declined by ${Math.abs(performance.improvementRate)}% this period. Review challenging topics.`,
      actionable: true,
    });
  } else if (performance.quizScoreTrend === 'improving') {
    insights.push({
      type: INSIGHT_TYPES.PERFORMANCE,
      priority: PRIORITY.LOW,
      message: `Great improvement! Quiz scores are up ${performance.improvementRate}% this period.`,
      actionable: false,
    });
  }

  // Retention insights
  if (performance.flashcardRetentionRate > 0 && performance.flashcardRetentionRate < INSIGHT_THRESHOLDS.mediumRetention) {
    insights.push({
      type: INSIGHT_TYPES.RETENTION,
      priority: PRIORITY.MEDIUM,
      message: `Flashcard retention is at ${performance.flashcardRetentionRate}%. Consider more spaced repetition sessions.`,
      actionable: true,
    });
  }

  // Readiness insights
  if (readiness.readinessDelta < -5) {
    insights.push({
      type: INSIGHT_TYPES.READINESS,
      priority: PRIORITY.CRITICAL,
      message: `Readiness has dropped by ${Math.abs(readiness.readinessDelta)} points. Immediate attention needed.`,
      actionable: true,
    });
  }

  // Timing insights
  if (quality.peakStudyHour >= 22 || quality.peakStudyHour <= 5) {
    insights.push({
      type: INSIGHT_TYPES.TIMING,
      priority: PRIORITY.MEDIUM,
      message: `You tend to study late at night (peak: ${quality.peakStudyHour}:00). Early morning study can improve retention.`,
      actionable: true,
    });
  }

  // Goal insights
  if (goals.totalGoals > 0 && goals.goalCompletionRate < 30) {
    insights.push({
      type: INSIGHT_TYPES.GOAL,
      priority: PRIORITY.HIGH,
      message: `Only ${goals.goalCompletionRate}% of your study goals are being met. Consider setting smaller, more achievable targets.`,
      actionable: true,
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateRecommendations(consistency, subjectDist, performance, readiness, quality) {
  const recommendations = [];

  // Study time recommendations
  if (consistency.totalStudyMinutes < 600) {
    recommendations.push({
      category: 'study_time',
      suggestion: 'Aim for at least 2 hours of study per day to maintain progress.',
      impact: 'high',
    });
  }

  // Session length recommendations
  if (quality.efficiencyRating === 'needs_improvement') {
    recommendations.push({
      category: 'session_quality',
      suggestion: 'Try the Pomodoro technique: 25 minutes focused study, 5 minutes break.',
      impact: 'high',
    });
  }

  // Subject balance recommendations
  if (subjectDist.balanceScore < 50 && subjectDist.leastStudied) {
    recommendations.push({
      category: 'subject_balance',
      suggestion: `Increase time on "${subjectDist.leastStudied.name}" — currently at ${subjectDist.leastStudied.percentage}% of total study time.`,
      impact: 'medium',
    });
  }

  // Performance recommendations
  if (performance.quizScoreTrend === 'declining') {
    recommendations.push({
      category: 'performance',
      suggestion: 'Review topics where you scored lowest and create targeted flashcards.',
      impact: 'high',
    });
  }

  // Flashcard recommendations
  if (performance.flashcardsReviewed > 0 && performance.flashcardRetentionRate < 70) {
    recommendations.push({
      category: 'retention',
      suggestion: 'Increase flashcard review frequency. Aim for daily reviews with spaced repetition.',
      impact: 'medium',
    });
  }

  // Readiness recommendations
  if (readiness.projectedReadiness < 70) {
    recommendations.push({
      category: 'readiness',
      suggestion: 'Based on current pace, projected readiness may fall short. Consider increasing daily study hours.',
      impact: 'high',
    });
  }

  // Timing recommendations
  if (quality.peakStudyHour >= 22) {
    recommendations.push({
      category: 'timing',
      suggestion: 'Shifting study sessions to morning hours (8-12) can boost information retention.',
      impact: 'medium',
    });
  }

  return recommendations;
}

// ── Comparative Analytics ────────────────────────────────────────────────

function computeComparitiveDelta(previousSnapshot, currentMetrics) {
  return {
    studyMinutes: currentMetrics.totalStudyMinutes - (previousSnapshot.totalStudyMinutes || 0),
    quizScore: currentMetrics.averageQuizScore - (previousSnapshot.averageQuizScore || 0),
    readiness: currentMetrics.currentReadiness - (previousSnapshot.currentReadiness || 0),
    consistency: currentMetrics.consistencyScore - (previousSnapshot.consistencyScore || 0),
  };
}

// ── Query / Retrieval ────────────────────────────────────────────────────

async function getSnapshots(userId, { periodType, page = 1, limit = 10 } = {}) {
  const where = { user: userId };
  if (periodType) where.periodType = periodType;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: snapshots } = await StudyAnalyticsSnapshot.findAndCountAll({
    where,
    order: [['periodStart', 'DESC']],
    offset,
    limit,
  });

  return {
    snapshots,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getLatestSnapshot(userId, periodType = 'weekly') {
  return StudyAnalyticsSnapshot.findOne({
    where: { user: userId, periodType },
    order: [['snapshotDate', 'DESC']],
  });
}

async function getSnapshotById(userId, snapshotId) {
  return StudyAnalyticsSnapshot.findOne({
    where: { id: snapshotId, user: userId },
  });
}

async function deleteSnapshot(userId, snapshotId) {
  const snapshot = await StudyAnalyticsSnapshot.findOne({
    where: { id: snapshotId, user: userId },
  });
  if (!snapshot) return false;
  await snapshot.destroy();
  return true;
}

async function deleteExpiredSnapshots(userId, retentionDays = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const deleted = await StudyAnalyticsSnapshot.destroy({
    where: {
      user: userId,
      snapshotDate: { [Op.lt]: cutoffStr },
    },
  });

  return deleted;
}

// ── Dashboard ────────────────────────────────────────────────────────────

async function getDashboard(userId) {
  const [latestWeekly, latestMonthly, recentSnapshots] = await Promise.all([
    getLatestSnapshot(userId, 'weekly'),
    getLatestSnapshot(userId, 'monthly'),
    StudyAnalyticsSnapshot.findAll({
      where: { user: userId, periodType: 'weekly' },
      order: [['snapshotDate', 'DESC']],
      limit: 8,
      attributes: ['snapshotDate', 'consistencyScore', 'averageQuizScore', 'currentReadiness', 'totalStudyMinutes'],
    }),
  ]);

  const trendData = recentSnapshots.reverse().map((s) => ({
    date: s.snapshotDate,
    consistency: s.consistencyScore,
    quizScore: s.averageQuizScore,
    readiness: s.currentReadiness,
    studyMinutes: s.totalStudyMinutes,
  }));

  return {
    latestWeekly,
    latestMonthly,
    trendData,
    summary: latestWeekly
      ? {
          consistency: latestWeekly.consistencyScore,
          studyMinutes: latestWeekly.totalStudyMinutes,
          quizScore: latestWeekly.averageQuizScore,
          readiness: latestWeekly.currentReadiness,
          insightCount: (latestWeekly.insights || []).length,
          recommendationCount: (latestWeekly.recommendations || []).length,
        }
      : null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getDaysBetween(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

// ── Period Helpers ───────────────────────────────────────────────────────

/**
 * Formats a Date as YYYY-MM-DD using its local calendar fields.
 *
 * The period helpers below build their boundaries in local time —
 * `new Date(year, month, 1)`, `setHours(0, 0, 0, 0)` — and used to serialise
 * them with `toISOString()`, which converts to UTC first. For any timezone
 * ahead of UTC that shifts the label back a day: local midnight on 1 August in
 * IST (UTC+5:30) is 2026-07-31T18:30:00Z, so `getMonthPeriod` labelled August
 * as starting on 31 July. Every snapshot period was off by one for the
 * majority of this app's users.
 *
 * Reading the fields back off the same local Date keeps the label and the
 * boundary in the same calendar.
 */
function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekPeriod(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    periodStart: toDateString(weekStart),
    periodEnd: toDateString(weekEnd),
  };
}

function getMonthPeriod(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthStart = new Date(year, month, 1);
  // Day 0 of the next month is the last day of this one.
  const monthEnd = new Date(year, month + 1, 0);

  return {
    periodStart: toDateString(monthStart),
    periodEnd: toDateString(monthEnd),
  };
}

function getDayPeriod(date = new Date()) {
  const dayStr = toDateString(new Date(date));
  return { periodStart: dayStr, periodEnd: dayStr };
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
  generateSnapshot,
  getSnapshots,
  getLatestSnapshot,
  getSnapshotById,
  deleteSnapshot,
  deleteExpiredSnapshots,
  getDashboard,
  computeConsistencyMetrics,
  computeSubjectDistribution,
  computePerformanceTrends,
  computeReadinessProjections,
  computeStudyQuality,
  generateInsights,
  generateRecommendations,
  getWeekPeriod,
  getMonthPeriod,
  getDayPeriod,
  linearRegression,
  computeBalanceScore,
  toDateString,
  INSIGHT_TYPES,
  PRIORITY,
  INSIGHT_THRESHOLDS,
  NotFoundError,
};
