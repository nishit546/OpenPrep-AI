const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

/**
 * Confidence Calibration & Metacognitive Accuracy Engine
 */

/**
 * Normalize confidence from percentage [0-100] to a proportion [0-1].
 * Optionally handles bucket strings.
 */
function normalizeConfidence(rawConfidence) {
  if (rawConfidence === undefined || rawConfidence === null) return null;
  
  // Handle string buckets if they exist
  if (typeof rawConfidence === 'string') {
    const lower = rawConfidence.toLowerCase();
    const buckets = {
      guess: 0.2,
      uncertain: 0.4,
      neutral: 0.6,
      confident: 0.8,
      certain: 1.0
    };
    if (buckets[lower] !== undefined) return buckets[lower];
  }
  
  let num = Number(rawConfidence);
  if (isNaN(num)) return null;
  
  // If it's already between 0 and 1, maybe it's already normalized, but user could input 0.5%
  // We'll assume if all confidence values are <= 1 it's normalized, but to be safe:
  // Requirements state input is 0-100.
  if (num > 1.0) num = num / 100;
  if (num < 0) num = 0;
  if (num > 1) num = 1;
  
  return num;
}

/**
 * Calculate the binary Brier Score for a single answer.
 * (confidence - outcome)^2
 */
function calculateBrierScore(confidence, isCorrect) {
  const normConf = normalizeConfidence(confidence);
  if (normConf === null) return null;
  
  const outcome = isCorrect ? 1 : 0;
  return Math.pow(normConf - outcome, 2);
}

/**
 * Aggregate metrics from a list of valid answers.
 * Returns Brier Score, ECE, MCE, Over/Under Confidence, Discrimination, etc.
 */
function calculateAggregateMetrics(answers) {
  if (!answers || answers.length === 0) {
    return {
      brierScore: null,
      ece: null,
      mce: null,
      overUnderConfidence: null,
      overUnderMessage: 'Not enough data.',
      discrimination: null,
      reliabilityCurve: [],
      sampleSize: 0,
      accuracy: 0,
      averageConfidence: 0,
    };
  }

  // 1. Reliability Curve Buckets
  // [0-10), [10-20), ... [90-100]
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    min: i * 0.1,
    max: i === 9 ? 1.01 : (i + 1) * 0.1, // make last bucket inclusive of 100%
    label: `${i * 10}-${(i + 1) * 10}%`,
    count: 0,
    correctCount: 0,
    totalConfidence: 0,
  }));

  let totalBrier = 0;
  let correctTotalConf = 0;
  let incorrectTotalConf = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let overallTotalConf = 0;

  answers.forEach((ans) => {
    const outcome = ans.isCorrect ? 1 : 0;
    const brier = Math.pow(ans.confidence - outcome, 2);
    totalBrier += brier;
    overallTotalConf += ans.confidence;
    
    if (ans.isCorrect) {
      correctCount++;
      correctTotalConf += ans.confidence;
    } else {
      incorrectCount++;
      incorrectTotalConf += ans.confidence;
    }

    // Find bucket
    const bucket = buckets.find(b => ans.confidence >= b.min && ans.confidence < b.max);
    if (bucket) {
      bucket.count++;
      bucket.totalConfidence += ans.confidence;
      if (ans.isCorrect) bucket.correctCount++;
    }
  });

  const n = answers.length;
  const brierScore = totalBrier / n;
  const accuracy = correctCount / n;
  const averageConfidence = overallTotalConf / n;

  // Over/Under-confidence Index: mean(confidence - accuracy)
  // Or mean(confidence) - accuracy since outcome is binary
  const overUnderConfidence = averageConfidence - accuracy;
  let overUnderMessage = 'Generally calibrated.';
  if (overUnderConfidence > 0.05) {
    overUnderMessage = `You are averaging ${Math.round(overUnderConfidence * 100)} percentage points above your observed accuracy.`;
  } else if (overUnderConfidence < -0.05) {
    overUnderMessage = `You are averaging ${Math.round(Math.abs(overUnderConfidence) * 100)} percentage points below your observed accuracy.`;
  }

  // Discrimination: Mean confidence correct - Mean confidence incorrect
  let discrimination = null;
  if (correctCount > 0 && incorrectCount > 0) {
    discrimination = (correctTotalConf / correctCount) - (incorrectTotalConf / incorrectCount);
  }

  // ECE & MCE
  let ece = 0;
  let mce = 0;
  let maxErrorBucket = null;
  const populatedBuckets = 0;
  
  const reliabilityCurve = buckets.map(b => {
    if (b.count === 0) return { ...b, avgConfidence: null, observedAccuracy: null, gap: null };
    
    const avgConfidence = b.totalConfidence / b.count;
    const observedAccuracy = b.correctCount / b.count;
    const gap = avgConfidence - observedAccuracy;
    const absGap = Math.abs(gap);
    
    ece += absGap * (b.count / n);
    
    if (absGap > mce) {
      mce = absGap;
      maxErrorBucket = { label: b.label, avgConfidence, observedAccuracy, count: b.count, gap };
    }
    
    return {
      ...b,
      avgConfidence,
      observedAccuracy,
      gap,
      absGap,
    };
  });

  return {
    brierScore,
    ece,
    mce,
    maxErrorBucket,
    overUnderConfidence,
    overUnderMessage,
    discrimination,
    reliabilityCurve,
    sampleSize: n,
    accuracy,
    averageConfidence,
  };
}

/**
 * Classify a single answer into one of four quadrants.
 * Threshold defaults to 0.70 (70%)
 */
function classifyConfidenceQuadrant(confidence, isCorrect, threshold = 0.70) {
  if (confidence === null || confidence === undefined) return null;
  
  const isHighConf = confidence >= threshold;
  
  if (isHighConf && isCorrect) return 'confidently_right';
  if (isHighConf && !isCorrect) return 'confidently_wrong'; // BLIND SPOT
  if (!isHighConf && isCorrect) return 'unsure_but_right';
  if (!isHighConf && !isCorrect) return 'unsure_and_wrong';
  return null;
}

/**
 * Extract and process all answers with confidence data from attempts.
 */
function extractAnalyzableAnswers(attempts) {
  const allAnswers = [];
  
  attempts.forEach(attempt => {
    if (!attempt.answers || !Array.isArray(attempt.answers)) return;
    
    const subjectId = attempt.quizRef?.subject;
    const topicId = attempt.quizRef?.topic;
    
    attempt.answers.forEach(ans => {
      const normConf = normalizeConfidence(ans.confidence);
      if (normConf !== null) {
        allAnswers.push({
          questionId: ans.questionId,
          isCorrect: ans.isCorrect,
          confidence: normConf,
          timeSpent: ans.timeSpent || 0,
          attemptId: attempt.id,
          createdAt: attempt.createdAt,
          subjectId,
          topicId,
        });
      }
    });
  });
  
  return allAnswers;
}

/**
 * Identify blind spots: incorrect answers with high confidence (>= 0.70).
 */
function identifyBlindSpots(analyzableAnswers, threshold = 0.70) {
  const blindSpots = analyzableAnswers
    .filter(ans => classifyConfidenceQuadrant(ans.confidence, ans.isCorrect, threshold) === 'confidently_wrong')
    .map(ans => ({
      questionId: ans.questionId,
      subjectId: ans.subjectId,
      topicId: ans.topicId,
      confidence: ans.confidence,
      timeSpent: ans.timeSpent,
      createdAt: ans.createdAt,
      priorityScore: ans.confidence, // base priority on confidence level
      reason: `High-confidence incorrect response — review recommended.`,
      action: `Review this concept before attempting similar questions.`,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore); // highest priority first

  return blindSpots;
}

/**
 * Generate full summary and quadrants breakdown.
 */
function generateSummary(analyzableAnswers, threshold = 0.70) {
  const metrics = calculateAggregateMetrics(analyzableAnswers);
  
  const quadrants = {
    confidently_right: 0,
    confidently_wrong: 0, // blind spots
    unsure_but_right: 0,
    unsure_and_wrong: 0,
  };

  analyzableAnswers.forEach(ans => {
    const q = classifyConfidenceQuadrant(ans.confidence, ans.isCorrect, threshold);
    if (q) quadrants[q]++;
  });

  return {
    ...metrics,
    quadrants,
    blindSpots: identifyBlindSpots(analyzableAnswers, threshold),
  };
}

/**
 * Calculate calibration metrics grouped by subject.
 * MIN_SAMPLE_SIZE = 5
 */
function calculateTopicCalibration(analyzableAnswers, minSampleSize = 5) {
  const subjectMap = {};
  
  analyzableAnswers.forEach(ans => {
    if (!ans.subjectId) return;
    if (!subjectMap[ans.subjectId]) {
      subjectMap[ans.subjectId] = { answers: [] };
    }
    subjectMap[ans.subjectId].answers.push(ans);
  });

  const topicStats = [];
  
  for (const [subjectId, data] of Object.entries(subjectMap)) {
    if (data.answers.length >= minSampleSize) {
      const summary = generateSummary(data.answers);
      
      let calibrationQuality = 'Poor';
      if (summary.brierScore !== null) {
        if (summary.brierScore < 0.1) calibrationQuality = 'Excellent';
        else if (summary.brierScore < 0.2) calibrationQuality = 'Good';
        else if (summary.brierScore < 0.25) calibrationQuality = 'Fair';
      }

      topicStats.push({
        subjectId,
        metrics: summary,
        calibrationQuality,
      });
    }
  }

  return topicStats;
}

/**
 * Calculate calibration trends over time (monthly).
 */
function calculateCalibrationTrend(analyzableAnswers) {
  const monthlyMap = {};

  analyzableAnswers.forEach(ans => {
    const date = new Date(ans.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = [];
    }
    monthlyMap[monthKey].push(ans);
  });

  const trend = Object.keys(monthlyMap).sort().map(month => {
    const metrics = generateSummary(monthlyMap[month]);
    return {
      period: month,
      brierScore: metrics.brierScore,
      ece: metrics.ece,
      accuracy: metrics.accuracy,
      averageConfidence: metrics.averageConfidence,
      blindSpotCount: metrics.quadrants.confidently_wrong,
      sampleSize: metrics.sampleSize,
    };
  });

  return trend;
}

module.exports = {
  normalizeConfidence,
  calculateBrierScore,
  calculateAggregateMetrics,
  classifyConfidenceQuadrant,
  extractAnalyzableAnswers,
  identifyBlindSpots,
  generateSummary,
  calculateTopicCalibration,
  calculateCalibrationTrend,
const { Op } = require('sequelize');
const ConfidenceRating = require('../models/ConfidenceRating');
const QuizAttempt = require('../models/QuizAttempt');

// ── Constants ────────────────────────────────────────────────────────────

/** Gap thresholds for calibration status classification. */
const GAP_THRESHOLD_BLIND_SPOT = 20;   // confidence >> actual
const GAP_THRESHOLD_UNDERCONFIDENT = -15; // confidence << actual
const GAP_THRESHOLD_CALIBRATED = 10;   // within acceptable range

// ── Rating CRUD ──────────────────────────────────────────────────────────

/**
 * Record or update a confidence rating for a topic.
 * If the user already rated this topic, the rating is updated (averaged).
 */
async function rateTopic(userId, {
  topicId,
  topicName,
  subjectId,
  subjectName,
  confidence,
}) {
  if (confidence < 1 || confidence > 10) {
    throw new Error('Confidence must be between 1 and 10');
  }

  const [record, created] = await ConfidenceRating.findOrCreate({
    where: { user: userId, topicId },
    defaults: {
      user: userId,
      topicId,
      topicName,
      subjectId: subjectId || null,
      subjectName: subjectName || null,
      confidence,
      actualScore: null,
      calibrationGap: 0,
      ratingCount: 1,
      quizAttempts: 0,
      status: 'untested',
    },
  });

  if (!created) {
    // Running average of confidence
    const total = record.confidence * record.ratingCount + confidence;
    record.ratingCount += 1;
    record.confidence = Math.round((total / record.ratingCount) * 10) / 10;
    record.topicName = topicName || record.topicName;
    record.subjectName = subjectName || record.subjectName;
    record.subjectId = subjectId || record.subjectId;
    await recalcStatus(record);
    await record.save();
  }

  return record;
}

/**
 * Bulk rate multiple topics at once.
 */
async function bulkRate(userId, ratings) {
  const results = [];
  for (const r of ratings) {
    const record = await rateTopic(userId, r);
    results.push(record);
  }
  return results;
}

/**
 * Get all confidence ratings for a user, optionally filtered.
 */
async function getRatings(userId, { subjectName, status, page = 1, limit = 50 } = {}) {
  const where = { user: userId };
  if (subjectName) where.subjectName = subjectName;
  if (status) where.status = status;

  const offset = (Math.max(1, page) - 1) * limit;
  const { count, rows } = await ConfidenceRating.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    offset,
    limit,
  });

  return {
    ratings: rows,
    pagination: { total: count, page, totalPages: Math.ceil(count / limit), limit },
  };
}

/**
 * Delete a single confidence rating.
 */
async function deleteRating(userId, topicId) {
  const deleted = await ConfidenceRating.destroy({
    where: { user: userId, topicId },
  });
  return deleted > 0;
}

// ── Calibration Engine ───────────────────────────────────────────────────

/**
 * Run full calibration analysis: compare all confidence ratings against
 * quiz performance data and update statuses.
 */
async function runCalibration(userId) {
  const ratings = await ConfidenceRating.findAll({ where: { user: userId } });

  // Fetch recent quiz attempts to compute actual scores per topic
  const quizScores = await computeTopicScores(userId);

  for (const rating of ratings) {
    const score = quizScores[rating.topicId] || quizScores[rating.topicName] || null;
    if (score !== null) {
      rating.actualScore = score;
      rating.quizAttempts = (quizScores[`${rating.topicId}_attempts`] || 0);
      rating.lastQuizDate = new Date().toISOString().split('T')[0];
    }
    await recalcStatus(rating);
    await rating.save();
  }

  return getCalibrationReport(userId);
}

/**
 * Compute actual quiz scores per topic from quiz attempt history.
 * Returns a map of topicId/topicName → percentage score.
 */
async function computeTopicScores(userId) {
  // Get recent attempts (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const attempts = await QuizAttempt.findAll({
    where: {
      user: userId,
      createdAt: { [Op.gte]: thirtyDaysAgo },
    },
    order: [['createdAt', 'DESC']],
  });

  const scoreMap = {};
  const attemptCountMap = {};

  for (const attempt of attempts) {
    const data = attempt.toJSON();
    const topicId = data.topicId || data.topic_id;
    const topicName = data.topicName || data.topic_name || data.subject;
    const score = data.score != null ? data.score : (data.correctAnswers / data.totalQuestions) * 100;
    const key = topicId || topicName;

    if (key && score != null && !isNaN(score)) {
      // Running average
      const existing = scoreMap[key] || 0;
      const count = attemptCountMap[key] || 0;
      scoreMap[key] = ((existing * count) + score) / (count + 1);
      scoreMap[key] = Math.round(scoreMap[key] * 10) / 10;
      attemptCountMap[key] = count + 1;

      // Store attempt counts for suffix keys
      scoreMap[`${key}_attempts`] = attemptCountMap[key];
    }
  }

  return scoreMap;
}

/**
 * Recalculate calibration status based on confidence vs actual score.
 */
function recalcStatus(rating) {
  if (rating.actualScore === null || rating.actualScore === undefined) {
    rating.status = 'untested';
    rating.calibrationGap = 0;
    return;
  }

  const confidenceNormalized = (rating.confidence / 10) * 100;
  const gap = confidenceNormalized - rating.actualScore;
  rating.calibrationGap = Math.round(gap * 10) / 10;

  if (gap >= GAP_THRESHOLD_BLIND_SPOT) {
    rating.status = 'blind_spot';
  } else if (gap <= GAP_THRESHOLD_UNDERCONFIDENT) {
    rating.status = 'underconfident';
  } else {
    rating.status = 'calibrated';
  }
}

// ── Reports & Analytics ──────────────────────────────────────────────────

/**
 * Generate a full calibration report for the user.
 */
async function getCalibrationReport(userId) {
  const ratings = await ConfidenceRating.findAll({ where: { user: userId } });

  const blindSpots = [];
  const underconfident = [];
  const calibrated = [];
  const untested = [];

  for (const r of ratings) {
    const json = r.toJSON();
    switch (json.status) {
      case 'blind_spot': blindSpots.push(json); break;
      case 'underconfident': underconfident.push(json); break;
      case 'calibrated': calibrated.push(json); break;
      default: untested.push(json); break;
    }
  }

  // Sort blind spots by gap descending (most dangerous first)
  blindSpots.sort((a, b) => b.calibrationGap - a.calibrationGap);
  underconfident.sort((a, b) => a.calibrationGap - b.calibrationGap);

  // Compute overall calibration score (0-100, 100 = perfectly calibrated)
  const scored = ratings.filter((r) => r.actualScore !== null);
  const avgGap = scored.length > 0
    ? scored.reduce((sum, r) => sum + Math.abs(r.calibrationGap), 0) / scored.length
    : 0;
  const calibrationScore = Math.round(Math.max(0, 100 - avgGap));

  // Subject-level aggregation
  const subjectBreakdown = aggregateBySubject(ratings);

  // Risk score: weighted combination of blind spot count and gap magnitude
  const riskScore = computeRiskScore(blindSpots, ratings.length);

  return {
    summary: {
      totalTopics: ratings.length,
      blindSpots: blindSpots.length,
      underconfident: underconfident.length,
      calibrated: calibrated.length,
      untested: untested.length,
      calibrationScore,
      riskScore,
    },
    blindSpots,
    underconfident,
    calibrated,
    untested,
    subjectBreakdown,
    recommendations: generateRecommendations(blindSpots, underconfident, untested),
  };
}

/**
 * Get calibration status for a single topic.
 */
async function getTopicCalibration(userId, topicId) {
  const rating = await ConfidenceRating.findOne({
    where: { user: userId, topicId },
  });
  if (!rating) return null;

  return {
    ...rating.toJSON(),
    interpretation: interpretGap(rating.calibrationGap, rating.status),
    suggestedActions: getSuggestedActions(rating),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function aggregateBySubject(ratings) {
  const subjects = {};
  for (const r of ratings) {
    const name = r.subjectName || 'Uncategorized';
    if (!subjects[name]) {
      subjects[name] = { total: 0, blindSpots: 0, calibrated: 0, underconfident: 0, untested: 0 };
    }
    subjects[name].total++;
    if (r.status === 'blind_spot') subjects[name].blindSpots++;
    else if (r.status === 'calibrated') subjects[name].calibrated++;
    else if (r.status === 'underconfident') subjects[name].underconfident++;
    else subjects[name].untested++;
  }

  // Compute subject risk level
  for (const name of Object.keys(subjects)) {
    const s = subjects[name];
    s.riskLevel = s.blindSpots > 2 ? 'high' : s.blindSpots > 0 ? 'medium' : 'low';
    s.calibrationRate = s.total > 0
      ? Math.round((s.calibrated / s.total) * 100)
      : 0;
  }

  return subjects;
}

function computeRiskScore(blindSpots, totalTopics) {
  if (totalTopics === 0) return 0;
  const blindSpotRatio = blindSpots.length / totalTopics;
  const avgGapMagnitude = blindSpots.length > 0
    ? blindSpots.reduce((sum, b) => sum + b.calibrationGap, 0) / blindSpots.length
    : 0;
  return Math.round(Math.min(100, (blindSpotRatio * 60) + (avgGapMagnitude * 0.8)));
}

function interpretGap(gap, status) {
  if (status === 'blind_spot') {
    return `You think you know this ${Math.round(gap)}% better than you actually do. This is a critical blind spot.`;
  }
  if (status === 'underconfident') {
    return `You're performing ${Math.round(Math.abs(gap))}% better than you think. Trust your knowledge here.`;
  }
  return 'Your confidence matches your performance. Well calibrated.';
}

function getSuggestedActions(rating) {
  const actions = [];
  if (rating.status === 'blind_spot') {
    actions.push('Take a focused quiz on this topic immediately');
    actions.push('Review core concepts before re-rating your confidence');
    actions.push('Ask for a study partner to test your understanding');
  } else if (rating.status === 'underconfident') {
    actions.push('This topic is stronger than you think — add it to your "known" list');
    actions.push('Try a harder quiz to challenge yourself further');
  } else if (rating.status === 'untested') {
    actions.push('Take a quiz on this topic to get an actual performance baseline');
  } else {
    actions.push('Maintain your current study routine for this topic');
  }
  return actions;
}

function generateRecommendations(blindSpots, underconfident, untested) {
  const recs = [];

  if (blindSpots.length > 0) {
    recs.push({
      priority: 'critical',
      type: 'blind_spot_alert',
      message: `You have ${blindSpots.length} blind spot${blindSpots.length > 1 ? 's' : ''}. ` +
        `Top concern: "${blindSpots[0].topicName}" (gap: ${blindSpots[0].calibrationGap}%). ` +
        'Prioritize review on these topics before your exam.',
      topicIds: blindSpots.slice(0, 5).map((b) => b.topicId),
    });
  }

  if (underconfident.length > 0) {
    recs.push({
      priority: 'medium',
      type: 'confidence_boost',
      message: `You're underconfident in ${underconfident.length} topic${underconfident.length > 1 ? 's' : ''}. ` +
        'These are actually strengths — allocate less review time here to focus on weak areas.',
      topicIds: underconfident.map((u) => u.topicId),
    });
  }

  if (untested.length > 3) {
    recs.push({
      priority: 'low',
      type: 'untested_topics',
      message: `${untested.length} topics have no quiz data yet. ` +
        'Take quick assessments to build a complete calibration picture.',
    });
  }

  return recs;
}

module.exports = {
  rateTopic,
  bulkRate,
  getRatings,
  deleteRating,
  runCalibration,
  getCalibrationReport,
  getTopicCalibration,
  computeTopicScores,
  recalcStatus,
  GAP_THRESHOLD_BLIND_SPOT,
  GAP_THRESHOLD_UNDERCONFIDENT,
  GAP_THRESHOLD_CALIBRATED,
};
