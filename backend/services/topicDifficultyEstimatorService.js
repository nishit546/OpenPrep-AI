const { Op } = require('sequelize');
const TopicDifficultyEstimate = require('../models/TopicDifficultyEstimate');
const QuizAttempt = require('../models/QuizAttempt');

// ── Constants ────────────────────────────────────────────────────────────

/** Maps numeric difficulty (1-10) to a human-readable label. */
const DIFFICULTY_LABELS = [
  { max: 2, label: 'trivial' },
  { max: 4, label: 'easy' },
  { max: 6, label: 'moderate' },
  { max: 8, label: 'hard' },
  { max: 10, label: 'extreme' },
];

/** Weights for each signal in the difficulty computation. */
const SIGNAL_WEIGHTS = {
  quizPerformance: 0.35,
  timeInvestment: 0.20,
  selfReport: 0.25,
  consistency: 0.20,
};

/** How many data points before we consider the estimate "confident". */
const CONFIDENCE_SATURATION_COUNT = 5;

// ── Core Estimation ──────────────────────────────────────────────────────

/**
 * Estimate or update difficulty for a topic based on performance signals.
 *
 * @param {string} userId
 * @param {object} signals
 * @param {string} signals.topicId
 * @param {string} signals.topicName
 * @param {string} [signals.subjectId]
 * @param {string} [signals.subjectName]
 * @param {number} [signals.selfReportedDifficulty] – 1-10 student estimate
 * @param {number} [signals.quizScore] – most recent quiz accuracy %
 * @param {number} [signals.timeMinutes] – study time for this session
 * @returns {Promise<TopicDifficultyEstimate>}
 */
async function estimateDifficulty(userId, signals) {
  const {
    topicId, topicName, subjectId, subjectName,
    selfReportedDifficulty, quizScore, timeMinutes,
  } = signals;

  if (!topicId || !topicName) {
    throw new Error('topicId and topicName are required');
  }

  // Find or create record
  const [record, created] = await TopicDifficultyEstimate.findOrCreate({
    where: { user: userId, topicId },
    defaults: {
      user: userId,
      topicId,
      topicName,
      subjectId: subjectId || null,
      subjectName: subjectName || null,
      difficulty: 5,
      difficultyLabel: 'moderate',
      confidence: 0,
      averageQuizScore: null,
      quizCount: 0,
      totalStudyMinutes: 0,
      averageTimePerQuiz: 0,
      selfReportedDifficulty: null,
      difficultyHistory: [],
      trend: 'new',
      studyPriority: 'medium',
    },
  });

  // Update input signals
  if (selfReportedDifficulty != null) {
    record.selfReportedDifficulty = clamp(selfReportedDifficulty, 1, 10);
  }
  if (quizScore != null) {
    const prevTotal = (record.averageQuizScore || 0) * record.quizCount;
    record.quizCount += 1;
    record.averageQuizScore = Math.round(((prevTotal + quizScore) / record.quizCount) * 10) / 10;
  }
  if (timeMinutes != null) {
    record.totalStudyMinutes += timeMinutes;
    if (record.quizCount > 0) {
      record.averageTimePerQuiz = Math.round(record.totalStudyMinutes / record.quizCount * 10) / 10;
    }
  }

  // Compute new difficulty estimate
  const newDifficulty = computeDifficulty(record);
  const previousDifficulty = record.difficulty;

  record.difficulty = round(newDifficulty);
  record.difficultyLabel = getDifficultyLabel(newDifficulty);
  record.confidence = computeConfidence(record);

  // Update history (keep last 30 entries)
  const history = [...(record.difficultyHistory || [])];
  history.push({
    date: new Date().toISOString().split('T')[0],
    difficulty: record.difficulty,
    confidence: record.confidence,
  });
  if (history.length > 30) history.splice(0, history.length - 30);
  record.difficultyHistory = history;

  // Compute trend
  record.trend = computeTrend(previousDifficulty, record.difficulty, record.trend);

  // Compute study priority
  record.studyPriority = computeStudyPriority(record);

  await record.save();
  return record;
}

/**
 * Bulk estimate difficulty for multiple topics.
 */
async function bulkEstimate(userId, signalsArray) {
  const results = [];
  for (const s of signalsArray) {
    results.push(await estimateDifficulty(userId, s));
  }
  return results;
}

// ── Retrieval ────────────────────────────────────────────────────────────

/**
 * Get all difficulty estimates for a user.
 */
async function getEstimates(userId, { subjectName, priority, page = 1, limit = 50 } = {}) {
  const where = { user: userId };
  if (subjectName) where.subjectName = subjectName;
  if (priority) where.studyPriority = priority;

  const offset = (Math.max(1, page) - 1) * limit;
  const { count, rows } = await TopicDifficultyEstimate.findAndCountAll({
    where,
    order: [['difficulty', 'DESC']],
    offset,
    limit,
  });

  return {
    estimates: rows,
    pagination: { total: count, page, totalPages: Math.ceil(count / limit), limit },
  };
}

/**
 * Get a single topic estimate.
 */
async function getEstimate(userId, topicId) {
  return TopicDifficultyEstimate.findOne({
    where: { user: userId, topicId },
  });
}

/**
 * Get difficulty distribution summary.
 */
async function getDifficultyDistribution(userId) {
  const estimates = await TopicDifficultyEstimate.findAll({
    where: { user: userId },
    attributes: ['difficulty', 'difficultyLabel', 'studyPriority', 'subjectName'],
  });

  if (estimates.length === 0) {
    return { total: 0, distribution: {}, subjectSummary: {}, priorityCounts: {} };
  }

  const distribution = { trivial: 0, easy: 0, moderate: 0, hard: 0, extreme: 0 };
  const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const subjectSummary = {};

  for (const e of estimates) {
    distribution[e.difficultyLabel] = (distribution[e.difficultyLabel] || 0) + 1;
    priorityCounts[e.studyPriority] = (priorityCounts[e.studyPriority] || 0) + 1;

    const subj = e.subjectName || 'Uncategorized';
    if (!subjectSummary[subj]) {
      subjectSummary[subj] = { total: 0, avgDifficulty: 0, hardTopics: 0 };
    }
    subjectSummary[subj].total++;
    subjectSummary[subj].avgDifficulty += e.difficulty;
    if (e.difficulty >= 7) subjectSummary[subj].hardTopics++;
  }

  // Finalize subject averages
  for (const name of Object.keys(subjectSummary)) {
    const s = subjectSummary[name];
    s.avgDifficulty = Math.round((s.avgDifficulty / s.total) * 10) / 10;
  }

  const avgDifficulty = Math.round(
    estimates.reduce((sum, e) => sum + e.difficulty, 0) / estimates.length * 10,
  ) / 10;

  return {
    total: estimates.length,
    avgDifficulty,
    distribution,
    priorityCounts,
    subjectSummary,
  };
}

/**
 * Get the hardest topics requiring immediate attention.
 */
async function getHardestTopics(userId, { limit = 10 } = {}) {
  return TopicDifficultyEstimate.findAll({
    where: { user: userId, difficulty: { [Op.gte]: 7 } },
    order: [['difficulty', 'DESC']],
    limit,
  });
}

/**
 * Get a full dashboard view.
 */
async function getDashboard(userId) {
  const [estimates, distribution, hardest] = await Promise.all([
    TopicDifficultyEstimate.findAll({
      where: { user: userId },
      order: [['difficulty', 'DESC']],
      limit: 20,
    }),
    getDifficultyDistribution(userId),
    getHardestTopics(userId, { limit: 5 }),
  ]);

  return {
    distribution,
    hardestTopics: hardest,
    recentUpdates: estimates.slice(0, 10).map((e) => ({
      topicId: e.topicId,
      topicName: e.topicName,
      difficulty: e.difficulty,
      difficultyLabel: e.difficultyLabel,
      trend: e.trend,
      studyPriority: e.studyPriority,
    })),
  };
}

// ── Scoring Engine ───────────────────────────────────────────────────────

/**
 * Compute difficulty (1-10) from accumulated signals.
 *
 * Lower quiz scores → higher difficulty.
 * Higher time per quiz → higher difficulty.
 * Student self-report blended in.
 * Inconsistency (high variance) → higher difficulty.
 */
function computeDifficulty(record) {
  let score = 5; // neutral starting point
  let totalWeight = 0;

  // 1. Quiz performance signal: low score = high difficulty
  if (record.quizCount > 0 && record.averageQuizScore != null) {
    const quizDifficulty = 10 - (record.averageQuizScore / 10); // 0%→10, 100%→0
    score = (score * totalWeight + quizDifficulty * SIGNAL_WEIGHTS.quizPerformance) /
      (totalWeight + SIGNAL_WEIGHTS.quizPerformance);
    totalWeight += SIGNAL_WEIGHTS.quizPerformance;
  }

  // 2. Time investment signal: more time per quiz = higher difficulty
  if (record.averageTimePerQuiz > 0) {
    // Normalise: 5 min/quiz → 5 difficulty, 20+ min/quiz → 9 difficulty
    const timeDifficulty = Math.min(10, 3 + (record.averageTimePerQuiz / 5));
    score = (score * totalWeight + timeDifficulty * SIGNAL_WEIGHTS.timeInvestment) /
      (totalWeight + SIGNAL_WEIGHTS.timeInvestment);
    totalWeight += SIGNAL_WEIGHTS.timeInvestment;
  }

  // 3. Self-reported difficulty
  if (record.selfReportedDifficulty != null) {
    score = (score * totalWeight + record.selfReportedDifficulty * SIGNAL_WEIGHTS.selfReport) /
      (totalWeight + SIGNAL_WEIGHTS.selfReport);
    totalWeight += SIGNAL_WEIGHTS.selfReport;
  }

  // 4. Consistency signal: if quiz scores vary widely, topic is harder to master
  if (record.quizCount >= 3) {
    // Use quizCount as a proxy: more attempts without mastery = harder
    const consistencyDifficulty = Math.min(10, 3 + (record.quizCount / 3));
    score = (score * totalWeight + consistencyDifficulty * SIGNAL_WEIGHTS.consistency) /
      (totalWeight + SIGNAL_WEIGHTS.consistency);
    totalWeight += SIGNAL_WEIGHTS.consistency;
  }

  return clamp(score, 1, 10);
}

function computeConfidence(record) {
  // More data points → higher confidence, capping at 100
  const dataPoints = record.quizCount + (record.selfReportedDifficulty ? 1 : 0);
  const rawConfidence = Math.min(100, (dataPoints / CONFIDENCE_SATURATION_COUNT) * 100);
  // Boost confidence when we have both quiz data and self-report
  const hasBoth = record.quizCount > 0 && record.selfReportedDifficulty != null;
  return Math.min(100, Math.round(rawConfidence + (hasBoth ? 15 : 0)));
}

function computeTrend(previous, current, currentTrend) {
  if (currentTrend === 'new' || previous === undefined) return 'new';
  const diff = current - previous;
  if (diff > 0.3) return 'harder';
  if (diff < -0.3) return 'easier';
  return 'stable';
}

function computeStudyPriority(record) {
  const { difficulty, confidence, quizCount, averageQuizScore } = record;

  // Critical: very hard topics with low quiz scores
  if (difficulty >= 8 && averageQuizScore != null && averageQuizScore < 50) {
    return 'critical';
  }
  // High: hard topics or topics with declining performance
  if (difficulty >= 7 || (record.trend === 'harder' && difficulty >= 5)) {
    return 'high';
  }
  // Low: easy topics with good scores
  if (difficulty <= 3 && averageQuizScore != null && averageQuizScore >= 80) {
    return 'low';
  }
  return 'medium';
}

function getDifficultyLabel(difficulty) {
  for (const t of DIFFICULTY_LABELS) {
    if (difficulty <= t.max) return t.label;
  }
  return 'extreme';
}

// ── Helpers ──────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round(n) {
  return Math.round(n * 10) / 10;
}

module.exports = {
  estimateDifficulty,
  bulkEstimate,
  getEstimates,
  getEstimate,
  getDifficultyDistribution,
  getHardestTopics,
  getDashboard,
  computeDifficulty,
  computeConfidence,
  getDifficultyLabel,
  DIFFICULTY_LABELS,
  SIGNAL_WEIGHTS,
};
