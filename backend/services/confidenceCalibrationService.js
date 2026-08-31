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
};
