const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');

/**
 * Pacing Coach Service
 * Handles time-budget allocation, live pacing state, and post-attempt autopsies.
 */

const DIFFICULTY_MULTIPLIERS = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.2,
};

function getDifficultyMultiplier(diff) {
  if (!diff) return 1.0;
  const lowerDiff = String(diff).toLowerCase();
  return DIFFICULTY_MULTIPLIERS[lowerDiff] || 1.0;
}

/**
 * Core Feature 1 - Time Budget Allocation
 * Calculates the recommended time budget for each question.
 */
function createPacingPlan(params) {
  const {
    totalDurationSeconds, // total exam duration in seconds
    questions = [], // Array of { id, maxScore, difficulty }
    reviewBufferPercent = 8,
    personalizationFactor = 1.0, // multiplier based on history
  } = params;

  // Handle invalid/edge cases
  if (totalDurationSeconds <= 0 || questions.length === 0) {
    return {
      error: 'Invalid duration or question count',
      usableTimeSeconds: 0,
      reviewBufferSeconds: 0,
      questionBudgets: [],
    };
  }

  let bufferPct = reviewBufferPercent / 100;
  if (bufferPct < 0) bufferPct = 0;
  if (bufferPct > 0.9) bufferPct = 0.9;

  const reviewBufferSeconds = Math.round(totalDurationSeconds * bufferPct);
  const usableTimeSeconds = totalDurationSeconds - reviewBufferSeconds;

  let totalWeight = 0;
  const questionWeights = questions.map((q) => {
    const marks = q.maxScore !== undefined && q.maxScore !== null && q.maxScore > 0 ? Number(q.maxScore) : 1;
    const diffMult = getDifficultyMultiplier(q.difficulty);
    const weight = marks * diffMult;
    totalWeight += weight;
    return { id: q._id || q.id || q.questionId, marks, diffMult, weight, q };
  });

  if (totalWeight <= 0) totalWeight = 1;

  let allocatedTotal = 0;
  let cumulative = 0;
  const questionBudgets = questionWeights.map((qw, index) => {
    // Proportional budget. Apply personalization factor safely.
    // Actually, personalization shouldn't exceed total usable time. It modifies relative weights or overall pacing?
    // The prompt says "allocated budget proportional to weight". Personalization might mean they are faster/slower.
    // If they are faster, they might need less budget overall, but we have a fixed total duration. 
    // We can just allocate the usable time proportionally.
    // Let's keep it purely proportional to ensure total allocated <= usable time.
    let rawBudget = (qw.weight / totalWeight) * usableTimeSeconds;
    
    // Applying personalization: If user is typically 20% faster (factor = 0.8), they might finish early, 
    // but the budget recommended for the *available* time should probably still sum up to usable time 
    // to give them a safe pacing guide, OR we can show them finishing early. 
    // Let's apply personalizationFactor to rawBudget, but ensure we don't exceed usable time.
    let adjustedBudget = Math.round(rawBudget * personalizationFactor);
    
    // Enforce minimum practical budget
    if (adjustedBudget < 5) adjustedBudget = 5;

    allocatedTotal += adjustedBudget;
    cumulative += adjustedBudget;

    return {
      questionId: qw.id,
      marks: qw.marks,
      difficulty: qw.q.difficulty || 'medium',
      budgetSeconds: adjustedBudget,
      cumulativeBudgetSeconds: cumulative,
      order: index + 1,
    };
  });

  // Normalization so total allocated does not exceed usable time (if personalization made it larger)
  if (allocatedTotal > usableTimeSeconds) {
    const scale = usableTimeSeconds / allocatedTotal;
    cumulative = 0;
    questionBudgets.forEach((qb) => {
      qb.budgetSeconds = Math.max(5, Math.floor(qb.budgetSeconds * scale));
      cumulative += qb.budgetSeconds;
      qb.cumulativeBudgetSeconds = cumulative;
    });
  }

  return {
    totalDurationSeconds,
    reviewBufferPercent,
    reviewBufferSeconds,
    usableTimeSeconds,
    allocatedTotalSeconds: cumulative,
    questionBudgets,
  };
}

/**
 * Core Feature 2 - Personalization From History
 * Calculates a personalization factor based on previous attempts.
 */
async function getSubjectPacingProfile(userId, subjectId) {
  const attempts = await QuizAttempt.findAll({
    where: { user: userId },
    include: [{
      model: Quiz,
      as: 'quizRef', // We might need to check association alias
      where: { subject: subjectId },
      required: true,
    }]
  });

  if (!attempts || attempts.length === 0) {
    return { factor: 1.0, message: 'Not enough historical data.' };
  }

  let totalMarks = 0;
  let totalTime = 0;
  let timeSinks = 0;
  let efficient = 0;
  let totalAnswered = 0;

  attempts.forEach(attempt => {
    const timeSpent = attempt.timeSpent || 0;
    const score = attempt.score || 0; // percentage
    const maxScore = attempt.totalQuestions || 10; // rough approximation if maxScore per q is unknown
    
    totalTime += timeSpent;
    // Just a rough global pace if detailed answers are missing
    totalMarks += (score / 100) * maxScore;
    
    if (attempt.answers && Array.isArray(attempt.answers)) {
      attempt.answers.forEach(ans => {
        totalAnswered++;
        // Very rough classification based on correctness
        if (ans.isCorrect) efficient++;
        else timeSinks++;
      });
    }
  });

  // Let's say baseline average is 60 seconds per mark.
  const baselineSecondsPerMark = 60;
  const userSecondsPerMark = totalMarks > 0 ? totalTime / totalMarks : baselineSecondsPerMark;
  
  let factor = userSecondsPerMark / baselineSecondsPerMark;
  
  // Bound the factor
  if (factor < 0.5) factor = 0.5;
  if (factor > 1.5) factor = 1.5;

  let message = 'Approximately on pace with baseline.';
  if (factor < 0.9) {
    message = `Your recent pace is ~${Math.round((1 - factor) * 100)}% faster than baseline.`;
  } else if (factor > 1.1) {
    message = `Your recent pace is ~${Math.round((factor - 1) * 100)}% slower than baseline.`;
  }

  return {
    factor,
    message,
    averageTimePerMark: userSecondsPerMark,
    totalAttempts: attempts.length,
    efficientRatio: totalAnswered > 0 ? efficient / totalAnswered : 0,
  };
}

/**
 * Core Feature 3 - Live Pacing & Core Feature 5 - Projected Completion
 */
function calculateRunningPace(params) {
  const {
    elapsedSeconds,
    totalDurationSeconds,
    completedQuestions = [], // Array of { questionId, timeSpent }
    pacingPlan,
  } = params;

  const totalAnswered = completedQuestions.length;
  const totalQuestions = pacingPlan.questionBudgets.length;

  let consumedBudget = 0;
  completedQuestions.forEach(cq => {
    const plan = pacingPlan.questionBudgets.find(qb => String(qb.questionId) === String(cq.questionId));
    if (plan) consumedBudget += plan.budgetSeconds;
  });

  const remainingTime = Math.max(0, totalDurationSeconds - elapsedSeconds);
  const remainingBudget = Math.max(0, pacingPlan.allocatedTotalSeconds - consumedBudget);

  // Pace state
  let paceState = 'on_track';
  if (elapsedSeconds > consumedBudget * 1.2) paceState = 'behind';
  else if (elapsedSeconds < consumedBudget * 0.8) paceState = 'ahead';
  
  if (remainingTime < remainingBudget * 0.8) paceState = 'critical';

  // Projected completion
  let estimatedFinishingTime = 0;
  let projectedUnanswered = 0;
  let projectedCompletionPct = 0;

  if (elapsedSeconds > 0 && totalAnswered > 0) {
    const rate = elapsedSeconds / totalAnswered; // seconds per question
    estimatedFinishingTime = elapsedSeconds + (rate * (totalQuestions - totalAnswered));
    
    if (estimatedFinishingTime > totalDurationSeconds) {
      const remainingQuestionsPossible = Math.floor(remainingTime / rate);
      projectedUnanswered = Math.max(0, (totalQuestions - totalAnswered) - remainingQuestionsPossible);
    }
    
    const totalPossibleCompleted = totalAnswered + Math.floor(remainingTime / rate);
    projectedCompletionPct = Math.min(100, (totalPossibleCompleted / totalQuestions) * 100);
  }

  return {
    paceState,
    elapsedSeconds,
    remainingTime,
    consumedBudget,
    remainingBudget,
    projectedCompletion: {
      estimatedFinishingTime,
      projectedUnanswered,
      projectedCompletionPercentage: Math.round(projectedCompletionPct),
    }
  };
}

/**
 * Core Feature 4 - Time-Bleed Detection
 */
function detectTimeBleed(currentElapsedSeconds, questionBudgetSeconds, thresholdMultiplier = 1.75) {
  const threshold = questionBudgetSeconds * thresholdMultiplier;
  return {
    isBleeding: currentElapsedSeconds > threshold,
    threshold,
    message: currentElapsedSeconds > threshold 
      ? "You're spending significantly longer than this question's budget. Consider flagging it and moving on." 
      : null,
  };
}

/**
 * Core Feature 7 - Post-Attempt Time Autopsy & Core Feature 8 & 9
 */
function analyzeAttempt(attempt, pacingPlan, bleedThresholdMultiplier = 1.75) {
  const { answers = [], timeSpent: totalElapsed = 0 } = attempt;

  let efficientCount = 0;
  let slowWinCount = 0;
  let timeSinkCount = 0;
  let rushedLossCount = 0;

  let totalTimeSpent = 0;
  let totalTimeSaved = 0;
  let totalTimeLost = 0;
  
  let opportunityCostMarks = 0;
  let skipRecommendations = [];

  const analyzedQuestions = answers.map((ans) => {
    const plan = pacingPlan.questionBudgets.find(qb => String(qb.questionId) === String(ans.questionId));
    const budget = plan ? plan.budgetSeconds : 60;
    const marks = plan ? plan.marks : 1;
    const spent = ans.timeSpent || budget; // Fallback if missing
    
    totalTimeSpent += spent;

    let classification = 'unknown';
    const isOverBudget = spent > (budget * bleedThresholdMultiplier);
    const isUnderBudget = spent <= budget;

    if (ans.isCorrect && isUnderBudget) {
      classification = 'efficient';
      efficientCount++;
      totalTimeSaved += (budget - spent);
    } else if (ans.isCorrect && isOverBudget) {
      classification = 'slow_win';
      slowWinCount++;
      totalTimeLost += (spent - budget);
    } else if (!ans.isCorrect && isOverBudget) {
      classification = 'time_sink';
      timeSinkCount++;
      totalTimeLost += (spent - budget);
      
      // Opportunity cost: time spent over budget could have been used for other questions
      opportunityCostMarks += marks;
      
      skipRecommendations.push({
        questionId: ans.questionId,
        message: `Consider skipping earlier next time. This consumed ${(spent / budget).toFixed(1)}x its budget and earned 0 marks.`,
        spent,
        budget,
      });
    } else if (!ans.isCorrect && isUnderBudget) {
      classification = 'rushed_loss';
      rushedLossCount++;
      totalTimeSaved += Math.max(0, budget - spent);
    }

    return {
      questionId: ans.questionId,
      timeSpent: spent,
      budget,
      ratio: (spent / budget).toFixed(2),
      isCorrect: ans.isCorrect,
      marksEarned: ans.isCorrect ? marks : 0,
      marksLost: !ans.isCorrect ? marks : 0,
      classification,
    };
  });
  
  // Sort skip recommendations by worst time sinks
  skipRecommendations.sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));

  return {
    totalTimeSpent,
    totalBudget: pacingPlan.allocatedTotalSeconds,
    totalTimeSaved,
    totalTimeLost,
    classifications: {
      efficient: efficientCount,
      slow_win: slowWinCount,
      time_sink: timeSinkCount,
      rushed_loss: rushedLossCount,
    },
    analyzedQuestions,
    estimatedOpportunityCostMarks: opportunityCostMarks,
    skipRecommendations,
  };
}

module.exports = {
  createPacingPlan,
  getSubjectPacingProfile,
  calculateRunningPace,
  detectTimeBleed,
  analyzeAttempt,
};
