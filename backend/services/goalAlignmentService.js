const { Op } = require('sequelize');
const GoalAlignment = require('../models/GoalAlignment');
const Subject = require('../models/Subject');
const StudyGoal = require('../models/StudyGoal');

// ── Constants ────────────────────────────────────────────────────────────

/** Minimum total study minutes before alignment is meaningful. */
const MIN_STUDY_MINUTES = 15;

/** Score thresholds for alignment status labels. */
const ALIGNMENT_EXCELLENT = 85;
const ALIGNMENT_GOOD = 65;
const ALIGNMENT_FAIR = 40;

// ── Alignment Computation ────────────────────────────────────────────────

/**
 * Compute alignment for a user over a given period.
 *
 * @param {string} userId
 * @param {object} opts
 * @param {Date|string} opts.periodStart
 * @param {Date|string} opts.periodEnd
 * @param {string} [opts.period] – 'daily' | 'weekly' | 'monthly'
 * @returns {Promise<GoalAlignment>}
 */
async function computeAlignment(userId, { periodStart, periodEnd, period = 'weekly' }) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // 1. Fetch subject weightages
  const subjects = await Subject.findAll({ where: { user: userId } });
  if (subjects.length === 0) {
    return createEmptyAlignment(userId, period, start, end);
  }

  // 2. Fetch active goals for this period
  const goals = await StudyGoal.findAll({
    where: {
      user: userId,
      status: { [Op.in]: ['active', 'completed'] },
      startDate: { [Op.lte]: end },
      endDate: { [Op.gte]: start },
    },
  });

  // 3. Compute ideal allocation from weightages
  const idealAllocation = computeIdealAllocation(subjects);

  // 4. Compute actual allocation from goals
  const actualAllocation = computeActualAllocation(goals, subjects);

  // 5. Compute per-subject scores
  const subjectBreakdown = computeSubjectBreakdown(idealAllocation, actualAllocation);

  // 6. Overall alignment score
  const totalGoalMinutes = Object.values(actualAllocation).reduce((s, v) => s + v.targetMinutes, 0);
  const totalStudyMinutes = Object.values(actualAllocation).reduce((s, v) => s + v.actualMinutes, 0);
  const overallScore = computeOverallScore(subjectBreakdown, totalStudyMinutes);

  // 7. Generate recommendations
  const recommendations = generateRecommendations(subjectBreakdown, totalStudyMinutes, totalGoalMinutes);

  // 8. Compute trend
  const previous = await getPreviousAlignment(userId, period, start);
  const trend = computeTrend(overallScore, previous?.overallScore || null);

  // 9. Persist snapshot
  const snapshot = await GoalAlignment.create({
    user: userId,
    period,
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
    overallScore,
    subjectBreakdown,
    totalStudyMinutes,
    totalGoalMinutes,
    recommendations,
    trend,
    previousScore: previous?.overallScore || null,
  });

  return snapshot;
}

/**
 * Get all alignment snapshots for a user.
 */
async function getAlignments(userId, { period, page = 1, limit = 10 } = {}) {
  const where = { user: userId };
  if (period) where.period = period;

  const offset = (Math.max(1, page) - 1) * limit;
  const { count, rows } = await GoalAlignment.findAndCountAll({
    where,
    order: [['periodStart', 'DESC']],
    offset,
    limit,
  });

  return {
    alignments: rows,
    pagination: { total: count, page, totalPages: Math.ceil(count / limit), limit },
  };
}

/**
 * Get the latest alignment snapshot.
 */
async function getLatestAlignment(userId, period = 'weekly') {
  return GoalAlignment.findOne({
    where: { user: userId, period },
    order: [['periodStart', 'DESC']],
  });
}

/**
 * Get alignment trend over time (last N snapshots).
 */
async function getAlignmentTrend(userId, { period = 'weekly', count = 8 } = {}) {
  const snapshots = await GoalAlignment.findAll({
    where: { user: userId, period },
    order: [['periodStart', 'DESC']],
    limit: count,
  });

  const reversed = [...snapshots].reverse();

  return {
    period,
    dataPoints: reversed.map((s) => ({
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      overallScore: s.overallScore,
      totalStudyMinutes: s.totalStudyMinutes,
      trend: s.trend,
    })),
    averageScore: reversed.length > 0
      ? Math.round(reversed.reduce((sum, s) => sum + s.overallScore, 0) / reversed.length)
      : 0,
    currentScore: reversed.length > 0 ? reversed[reversed.length - 1].overallScore : 0,
    improvement: reversed.length >= 2
      ? Math.round(reversed[reversed.length - 1].overallScore - reversed[0].overallScore)
      : 0,
  };
}

// ── Allocation Helpers ───────────────────────────────────────────────────

/**
 * Compute ideal time allocation based on subject weightages.
 * Higher weightage = more time should be spent.
 */
function computeIdealAllocation(subjects) {
  const totalWeightage = subjects.reduce((sum, s) => sum + (s.weightage || 1), 0);
  const allocation = {};

  for (const subject of subjects) {
    const weight = subject.weightage || 1;
    allocation[subject.id] = {
      subjectId: subject.id,
      subjectName: subject.name,
      idealPct: Math.round((weight / totalWeightage) * 1000) / 10,
      weightage: weight,
    };
  }

  return allocation;
}

/**
 * Compute actual time allocation from study goals.
 * Maps goals to subjects and aggregates minutes.
 */
function computeActualAllocation(goals, subjects) {
  const subjectMinutes = {};
  const subjectTargets = {};

  for (const subject of subjects) {
    subjectMinutes[subject.id] = 0;
    subjectTargets[subject.id] = 0;
  }

  for (const goal of goals) {
    const subjectId = goal.subject;
    if (!subjectId || !subjectMinutes.hasOwnProperty(subjectId)) continue;

    const studyMinutes = goal.metricType === 'study_hours'
      ? (goal.currentValue || 0) * 60
      : (goal.currentValue || 0);
    const targetMinutes = goal.metricType === 'study_hours'
      ? (goal.targetValue || 0) * 60
      : (goal.targetValue || 0);

    subjectMinutes[subjectId] += studyMinutes;
    subjectTargets[subjectId] += targetMinutes;
  }

  const totalActual = Object.values(subjectMinutes).reduce((s, v) => s + v, 0);

  const allocation = {};
  for (const subject of subjects) {
    const actualMinutes = subjectMinutes[subject.id] || 0;
    const targetMinutes = subjectTargets[subject.id] || 0;
    allocation[subject.id] = {
      subjectId: subject.id,
      subjectName: subject.name,
      actualMinutes,
      targetMinutes,
      actualPct: totalActual > 0 ? Math.round((actualMinutes / totalActual) * 1000) / 10 : 0,
    };
  }

  return allocation;
}

/**
 * Merge ideal and actual allocations into a per-subject breakdown with scores.
 */
function computeSubjectBreakdown(idealAllocation, actualAllocation) {
  const breakdown = [];

  for (const [id, ideal] of Object.entries(idealAllocation)) {
    const actual = actualAllocation[id] || { actualPct: 0, actualMinutes: 0, targetMinutes: 0 };
    const gap = Math.round((actual.actualPct - ideal.idealPct) * 10) / 10;
    const score = computeSubjectScore(ideal.idealPct, actual.actualPct, actual.actualMinutes);

    breakdown.push({
      subjectId: ideal.subjectId,
      subjectName: ideal.subjectName,
      idealPct: ideal.idealPct,
      actualPct: actual.actualPct,
      gap,
      actualMinutes: actual.actualMinutes,
      targetMinutes: actual.targetMinutes,
      score,
      status: getStatus(score),
    });
  }

  // Sort by gap magnitude (biggest misalignment first)
  breakdown.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return breakdown;
}

// ── Scoring ──────────────────────────────────────────────────────────────

/**
 * Compute score for a single subject (0-100).
 * Considers both allocation accuracy and absolute study time.
 */
function computeSubjectScore(idealPct, actualPct, studyMinutes) {
  // Allocation accuracy: how close actual % is to ideal %
  const pctDiff = Math.abs(actualPct - idealPct);
  const allocationScore = Math.max(0, 100 - pctDiff * 2.5);

  // Effort score: penalise if no study time at all
  const effortScore = studyMinutes >= 60 ? 100 : studyMinutes >= 30 ? 70 : studyMinutes > 0 ? 40 : 0;

  // Weight: 60% allocation accuracy, 40% effort
  return Math.round(allocationScore * 0.6 + effortScore * 0.4);
}

function computeOverallScore(subjectBreakdown, totalStudyMinutes) {
  if (subjectBreakdown.length === 0 || totalStudyMinutes < MIN_STUDY_MINUTES) {
    return 0;
  }

  const avgScore = subjectBreakdown.reduce((sum, s) => sum + s.score, 0) / subjectBreakdown.length;

  // Bonus for studying enough total time
  const volumeBonus = Math.min(10, Math.round(totalStudyMinutes / 120));

  return Math.min(100, Math.round(avgScore + volumeBonus));
}

function getStatus(score) {
  if (score >= ALIGNMENT_EXCELLENT) return 'excellent';
  if (score >= ALIGNMENT_GOOD) return 'good';
  if (score >= ALIGNMENT_FAIR) return 'fair';
  return 'poor';
}

// ── Recommendations ──────────────────────────────────────────────────────

function generateRecommendations(subjectBreakdown, totalStudyMinutes, totalGoalMinutes) {
  const recs = [];

  // 1. Highlight biggest over-studied subjects
  const overStudied = subjectBreakdown.filter((s) => s.gap > 10);
  if (overStudied.length > 0) {
    recs.push({
      priority: 'medium',
      type: 'reduce_time',
      message: `You're over-investing in "${overStudied[0].subjectName}" (+${overStudied[0].gap}% above ideal). ` +
        `Shift some time to under-studied areas for better overall alignment.`,
      subjectId: overStudied[0].subjectId,
    });
  }

  // 2. Highlight biggest under-studied subjects
  const underStudied = subjectBreakdown.filter((s) => s.gap < -10);
  if (underStudied.length > 0) {
    const names = underStudied.slice(0, 3).map((s) => `"${s.subjectName}"`).join(', ');
    recs.push({
      priority: 'high',
      type: 'increase_time',
      message: `${underStudied.length} subject${underStudied.length > 1 ? 's' : ''} ${underStudied.length > 1 ? 'need' : 'needs'} more attention: ${names}. ` +
        `These carry exam weight but receive less study time than ideal.`,
      subjectIds: underStudied.map((s) => s.subjectId),
    });
  }

  // 3. Flag subjects with zero study time
  const untouched = subjectBreakdown.filter((s) => s.actualMinutes === 0);
  if (untouched.length > 0) {
    recs.push({
      priority: 'critical',
      type: 'untouched_subjects',
      message: `${untouched.length} subject${untouched.length > 1 ? 's have' : ' has'} zero study time this period: ` +
        untouched.slice(0, 3).map((s) => `"${s.subjectName}"`).join(', ') + '. Start studying these immediately.',
      subjectIds: untouched.map((s) => s.subjectId),
    });
  }

  // 4. Overall volume check
  if (totalStudyMinutes > 0 && totalGoalMinutes > 0) {
    const completionRate = Math.round((totalStudyMinutes / totalGoalMinutes) * 100);
    if (completionRate < 50) {
      recs.push({
        priority: 'high',
        type: 'low_volume',
        message: `You've completed only ${completionRate}% of your study goals this period. ` +
          'Increase daily study time to improve overall alignment.',
      });
    }
  } else if (totalStudyMinutes === 0) {
    recs.push({
      priority: 'critical',
      type: 'no_activity',
      message: 'No study activity recorded this period. Set and complete study goals to build alignment.',
    });
  }

  return recs;
}

// ── Trend & History ──────────────────────────────────────────────────────

async function getPreviousAlignment(userId, period, currentStart) {
  return GoalAlignment.findOne({
    where: {
      user: userId,
      period,
      periodStart: { [Op.lt]: currentStart.toISOString().split('T')[0] },
    },
    order: [['periodStart', 'DESC']],
  });
}

function computeTrend(currentScore, previousScore) {
  if (previousScore === null || previousScore === undefined) return 'new';
  const delta = currentScore - previousScore;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'stable';
}

function createEmptyAlignment(userId, period, start, end) {
  return GoalAlignment.create({
    user: userId,
    period,
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
    overallScore: 0,
    subjectBreakdown: [],
    totalStudyMinutes: 0,
    totalGoalMinutes: 0,
    recommendations: [{ priority: 'high', type: 'no_subjects', message: 'Add subjects to begin tracking alignment.' }],
    trend: 'new',
  });
}

// ── Delete ───────────────────────────────────────────────────────────────

async function deleteAlignment(userId, alignmentId) {
  const deleted = await GoalAlignment.destroy({
    where: { id: alignmentId, user: userId },
  });
  return deleted > 0;
}

module.exports = {
  computeAlignment,
  getAlignments,
  getLatestAlignment,
  getAlignmentTrend,
  deleteAlignment,
  computeIdealAllocation,
  computeActualAllocation,
  computeSubjectBreakdown,
  computeSubjectScore,
  computeOverallScore,
  getStatus,
  MIN_STUDY_MINUTES,
  ALIGNMENT_EXCELLENT,
  ALIGNMENT_GOOD,
  ALIGNMENT_FAIR,
};
