const { Op } = require('sequelize');
const MistakeLogEntry = require('../models/MistakeLogEntry');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Quiz = require('../models/Quiz');

/**
 * Valid Root Cause Taxonomy
 */
const ROOT_CAUSES = [
  'conceptual',
  'application',
  'careless',
  'misread',
  'time_pressure',
  'guessed',
  'knowledge_gap',
  'unclassified',
];

/**
 * Heuristic Root Cause Classifier
 * Determines a preliminary root cause and confidence based on telemetry & question characteristics
 */
function classifyMistakeHeuristic({
  timeSpentSeconds = 0,
  medianTimeSeconds = 60,
  questionText = '',
  options = [],
  userSelectedAnswer = -1,
  correctAnswer = 0,
  isNearEndOfTimedSection = false,
  previouslyMastered = false,
}) {
  const stem = (questionText || '').toLowerCase();
  const hasNegationTrap =
    stem.includes(' not ') ||
    stem.includes(' except ') ||
    stem.includes(' least ') ||
    stem.includes(' incorrect') ||
    stem.includes(' neither ');

  // 1. Misread Qualifier Trap
  if (hasNegationTrap) {
    return {
      rootCause: 'misread',
      confidence: 0.82,
      remedy: 'Active-reading drill: highlight negative qualifiers and reverse conditions before selecting answers.',
    };
  }

  // 2. Far below median time -> Careless or Guessed
  if (medianTimeSeconds > 0 && timeSpentSeconds < medianTimeSeconds * 0.35) {
    if (previouslyMastered) {
      return {
        rootCause: 'careless',
        confidence: 0.78,
        remedy: 'Pacing & checking routine: double-check calculations and sign changes before confirming fast answers.',
      };
    }
    return {
      rootCause: 'guessed',
      confidence: 0.72,
      remedy: 'Concept breakdown: study the core definitions before taking timed practice.',
    };
  }

  // 3. High time spent near end of timed section -> Time Pressure
  if (
    isNearEndOfTimedSection ||
    (medianTimeSeconds > 0 && timeSpentSeconds > medianTimeSeconds * 1.9)
  ) {
    return {
      rootCause: 'time_pressure',
      confidence: 0.75,
      remedy: 'Pacing work: practice timed sections to improve problem identification and speed.',
    };
  }

  // 4. Topic previously mastered but failed now -> Careless slip
  if (previouslyMastered) {
    return {
      rootCause: 'careless',
      confidence: 0.68,
      remedy: 'Slow down and verify intermediate steps to prevent careless slips on familiar material.',
    };
  }

  // 5. Default triage prompt
  return {
    rootCause: 'conceptual',
    confidence: 0.55,
    remedy: 'Re-study the underlying theoretical concept and review solved examples.',
  };
}

/**
 * Log mistakes from a Quiz Attempt into MistakeLogEntry
 */
async function logAttemptMistakes(attempt, quiz, transaction = null) {
  if (!attempt || !quiz || !Array.isArray(attempt.answers)) {
    return [];
  }

  const userAnswers = attempt.answers;
  const quizQuestions = quiz.questions || [];
  const entries = [];

  const medianTimePerQuestion =
    quizQuestions.length > 0 && attempt.timeSpent > 0
      ? Math.round(attempt.timeSpent / quizQuestions.length)
      : 45;

  for (let idx = 0; idx < quizQuestions.length; idx++) {
    const q = quizQuestions[idx];
    const qId = String(q._id || q.id || idx);
    const ans = userAnswers.find((a) => String(a.questionId) === qId);

    if (ans && !ans.isCorrect) {
      const isNearEnd = idx >= Math.floor(quizQuestions.length * 0.8);
      const timeSpentOnQuestion = ans.timeSpent || medianTimePerQuestion;

      const classification = classifyMistakeHeuristic({
        timeSpentSeconds: timeSpentOnQuestion,
        medianTimeSeconds: medianTimePerQuestion,
        questionText: q.questionText,
        options: q.options || [],
        userSelectedAnswer: ans.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isNearEndOfTimedSection: isNearEnd,
      });

      // Check if user already logged this exact question before to track recurrence
      const existing = await MistakeLogEntry.findOne({
        where: {
          user: attempt.user,
          questionId: qId,
        },
        transaction,
      });

      const recurrenceCount = existing ? existing.recurrenceCount + 1 : 1;

      const entry = await MistakeLogEntry.create(
        {
          user: attempt.user,
          quizAttemptId: attempt.id,
          quizId: quiz.id,
          subjectId: quiz.subject,
          topicId: quiz.topic || null,
          questionId: qId,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          userSelectedAnswer: ans.selectedAnswer,
          explanation: q.explanation || '',
          marksLost: 1.0,
          rootCause: classification.rootCause,
          heuristicPreFill: classification.rootCause,
          heuristicConfidence: classification.confidence,
          timeSpentSeconds: timeSpentOnQuestion,
          status: 'open',
          recurrenceCount,
        },
        { transaction }
      );

      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Get Mistake Notebook Analytics
 * Includes:
 * - Root-cause breakdown percentage and counts
 * - Marks lost per root cause (Cost Analysis)
 * - Recurrence warnings (Topic + Root Cause appearing repeatedly)
 * - Resolution metrics (Open vs Resolved)
 */
async function getMistakeAnalytics(userId) {
  const mistakes = await MistakeLogEntry.findAll({
    where: { user: userId },
    include: [
      { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
      { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const totalMistakes = mistakes.length;
  const openMistakes = mistakes.filter((m) => m.status === 'open');
  const resolvedMistakes = mistakes.filter((m) => m.status === 'resolved');

  // Distribution & Cost Analysis
  const rootCauseDistribution = {};
  const costAnalysis = {};
  ROOT_CAUSES.forEach((rc) => {
    rootCauseDistribution[rc] = { count: 0, percentage: 0 };
    costAnalysis[rc] = { marksLost: 0, count: 0 };
  });

  let totalMarksLost = 0;

  mistakes.forEach((m) => {
    const rc = m.rootCause || 'unclassified';
    if (!rootCauseDistribution[rc]) {
      rootCauseDistribution[rc] = { count: 0, percentage: 0 };
      costAnalysis[rc] = { marksLost: 0, count: 0 };
    }
    rootCauseDistribution[rc].count += 1;
    costAnalysis[rc].count += 1;
    costAnalysis[rc].marksLost += m.marksLost || 1.0;
    totalMarksLost += m.marksLost || 1.0;
  });

  if (totalMistakes > 0) {
    Object.keys(rootCauseDistribution).forEach((rc) => {
      rootCauseDistribution[rc].percentage = Math.round(
        (rootCauseDistribution[rc].count / totalMistakes) * 100
      );
    });
  }

  // Recurrence Detection: Topic / Subject + Root Cause repetition
  const recurrenceMap = {};
  mistakes.forEach((m) => {
    const topicName = m.topicRef ? m.topicRef.name : m.subjectRef ? m.subjectRef.name : 'General';
    const key = `${topicName}:::${m.rootCause}`;
    if (!recurrenceMap[key]) {
      recurrenceMap[key] = {
        topic: topicName,
        rootCause: m.rootCause,
        count: 0,
        marksLost: 0,
        mistakeIds: [],
      };
    }
    recurrenceMap[key].count += 1;
    recurrenceMap[key].marksLost += m.marksLost || 1.0;
    recurrenceMap[key].mistakeIds.push(m.id);
  });

  const recurrenceWarnings = Object.values(recurrenceMap)
    .filter((r) => r.count >= 2 && r.rootCause !== 'unclassified')
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      ...r,
      warningMessage: `You have made ${r.count} ${r.rootCause.replace('_', ' ')} mistakes in ${r.topic}.`,
    }));

  return {
    totalMistakes,
    openCount: openMistakes.length,
    resolvedCount: resolvedMistakes.length,
    resolutionRate:
      totalMistakes > 0 ? Math.round((resolvedMistakes.length / totalMistakes) * 100) : 0,
    totalMarksLost,
    rootCauseDistribution,
    costAnalysis,
    recurrenceWarnings,
  };
}

/**
 * Generate Spaced Redo Practice Drill from Open Mistakes
 * Prioritises by (recurrence × marks lost × staleness) respecting minimum spacing interval
 */
async function generateRedoDrill(userId, { limit = 10, subjectId = null, minSpacingHours = 1 } = {}) {
  const minSpacingDate = new Date(Date.now() - minSpacingHours * 60 * 60 * 1000);

  const whereClause = {
    user: userId,
    status: 'open',
    [Op.or]: [
      { lastRedoAt: null },
      { lastRedoAt: { [Op.lte]: minSpacingDate } },
    ],
  };

  if (subjectId) {
    whereClause.subjectId = subjectId;
  }

  const openMistakes = await MistakeLogEntry.findAll({
    where: whereClause,
    include: [
      { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
      { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
    ],
  });

  if (openMistakes.length === 0) {
    return {
      drillId: `drill_${Date.now()}`,
      items: [],
      totalCount: 0,
      message: 'No open mistakes ready for redo drill at this time.',
    };
  }

  // Priority Scoring: (recurrenceCount * 2) + (marksLost * 1.5) + stalenessScore
  const now = Date.now();
  const scoredItems = openMistakes.map((item) => {
    const ageHours = Math.max(1, (now - new Date(item.createdAt).getTime()) / (1000 * 60 * 60));
    const stalenessScore = Math.min(10, ageHours / 24); // Cap staleness bonus at 10
    const priorityScore =
      (item.recurrenceCount || 1) * 2.0 +
      (item.marksLost || 1.0) * 1.5 +
      stalenessScore;

    return {
      item,
      priorityScore,
    };
  });

  scoredItems.sort((a, b) => b.priorityScore - a.priorityScore);
  const selected = scoredItems.slice(0, limit).map((s) => s.item);

  return {
    drillId: `drill_${Date.now()}`,
    items: selected,
    totalCount: selected.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Submit Redo Attempt on a Mistake Item
 * If correct -> marks resolved; if wrong -> increments recurrence
 */
async function recordRedoAttempt(userId, mistakeId, { selectedAnswer, timeSpentSeconds = 0 }) {
  const mistake = await MistakeLogEntry.findOne({
    where: { id: mistakeId, user: userId },
  });

  if (!mistake) {
    throw new Error('Mistake log entry not found.');
  }

  const isCorrect = Number(selectedAnswer) === Number(mistake.correctAnswer);
  mistake.lastRedoAt = new Date();

  if (isCorrect) {
    mistake.status = 'resolved';
    mistake.resolvedAt = new Date();
    mistake.redoSuccessCount = (mistake.redoSuccessCount || 0) + 1;
  } else {
    mistake.recurrenceCount = (mistake.recurrenceCount || 1) + 1;
    mistake.status = 'open';
  }

  await mistake.save();

  return {
    isCorrect,
    status: mistake.status,
    correctAnswer: mistake.correctAnswer,
    explanation: mistake.explanation,
    recurrenceCount: mistake.recurrenceCount,
  };
}

module.exports = {
  ROOT_CAUSES,
  classifyMistakeHeuristic,
  logAttemptMistakes,
  getMistakeAnalytics,
  generateRedoDrill,
  recordRedoAttempt,
};
