const { Op, Transaction } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const { sequelize } = require('../config/db');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const PYQAnalysis = require('../models/PYQAnalysis');
const PYQQuestion = require('../models/PYQQuestion');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const QuizTelemetryEvent = require('../models/QuizTelemetryEvent');
const QuizBookmark = require('../models/QuizBookmark');

// Refactored Services
const quizGenerationService = require('../services/quizGenerationService');
const quizEvaluationService = require('../services/quizEvaluationService');
const quizAnalyticsService = require('../services/quizAnalyticsService');

const geminiService = require('../services/geminiService');
const cacheService = require('../services/cacheService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { runCalibration } = require('../services/difficultyCalibrator');
const { calculateTopicProficiency, getDifficultyLevel } = require('../services/proficiencyService');
const Flashcard = require('../models/Flashcard');
const remediationService = require('../services/remediationService');
let uploadFileToFirebase = null;
try {
  const firebaseService = require('../services/firebaseStorageService');
  uploadFileToFirebase = firebaseService.uploadFileToFirebase;
} catch (e) {
  // Graceful fallback if firebase storage service is omitted or missing
}
const { checkAndAwardBadges } = require('../services/achievementService');
const { createNotification } = require('../services/notificationService');

// Window (ms) during which duplicate quiz submissions for the same quiz are ignored.
// Prevents double-click on "Submit Quiz" from creating duplicate attempt records.
const DUPLICATE_SUBMIT_WINDOW_MS = 5000;

// Extract the questions the student answered incorrectly from a loaded quiz
// attempt, together with the attempt's quiz topic/subject metadata.
function extractMistookQuestions(attempt) {
  const quizRef = attempt && attempt.quizRef;
  if (!quizRef) return [];

  const quizQuestions = quizRef.questions || [];
  const userAnswers = attempt.answers || [];

  return quizQuestions
    .filter((q) => {
      const ans = userAnswers.find((a) => String(a.questionId) === String(q._id || q.id));
      return ans && !ans.isCorrect;
    })
    .map((q) => {
      const userAns = userAnswers.find((a) => String(a.questionId) === String(q._id || q.id));
      return {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        userSelectedAnswer: userAns ? userAns.selectedAnswer : -1,
      };
    });
}

// @desc    Generate AI Quiz
// @route   POST /api/quizzes/generate-ai
// @access  Private
exports.generateAIQuiz = async (req, res, next) => {
  try {
    const { subjectId, topicId, count, language, questionType = 'MCQ' } = req.body;
    const normalizedLanguage = normalizeQuizLanguage(language);

    const MAX_QUIZ_COUNT = 50;
    const requestedCount = parseInt(count, 10) || 5;
    if (requestedCount < 1 || requestedCount > MAX_QUIZ_COUNT) {
      return res.status(400).json({
        success: false,
        error: `Invalid count parameter. Must be between 1 and ${MAX_QUIZ_COUNT}.`,
      });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    let topicName = 'General Overview';
    let topicObj = null;
    if (topicId) {
      topicObj = await Topic.findByPk(topicId);
      if (topicObj) topicName = topicObj.name;
    }

    // Try to find notes to feed context to Gemini API
    const notes = await Note.findAll({ where: { subject: subjectId, user: req.user.id } });
    let notesText = '';
    if (notes && notes.length > 0) {
      notesText = notes
        .map((n) => n.content || '')
        .join('\n');
    }

    // Adaptive difficulty calculation
    const proficiency = await calculateTopicProficiency(req.user.id, subjectId, topicId);
    const difficultyLevel = getDifficultyLevel(proficiency);

    // Build canonical prompt memoization payload & cache key
    const isRefresh = req.query.refresh === 'true';
    const cacheKey = cacheService.hashPayload('quiz', {
      subject: subject.name,
      topic: topicName,
      count: requestedCount,
      language: normalizedLanguage,
      difficulty: difficultyLevel,
      questionType,
    });

    let aiQuiz = null;
    let cacheStatus = 'MISS';

    if (!isRefresh) {
      const cached = await cacheService.getWithMetadata(cacheKey);
      if (cached.isHit && cached.data) {
        aiQuiz = cached.data;
        cacheStatus = 'HIT';
      }
    }

    if (!aiQuiz) {
      aiQuiz = await geminiService.generateQuiz(
        subject.name,
        topicName,
        notesText,
        requestedCount,
        isRefresh,
        normalizedLanguage,
        difficultyLevel,
        questionType
      );
      if (aiQuiz && !aiQuiz._mock) {
        await cacheService.set(cacheKey, aiQuiz, cacheService.QUIZ_TTL);
      }
    }

    res.setHeader('X-Cache-Status', cacheStatus);

    // Assign unique question IDs (similar to Mongoose subdocument ids)
    const questionsWithIds = aiQuiz.questions.map((q) => {
      let normalizedCorrectAnswer = q.correctAnswer;
      if (Array.isArray(normalizedCorrectAnswer)) {
        normalizedCorrectAnswer = normalizedCorrectAnswer.length > 0 ? normalizedCorrectAnswer[0] : null;
      }
      if (typeof normalizedCorrectAnswer === 'string' && !isNaN(normalizedCorrectAnswer) && normalizedCorrectAnswer.trim() !== '') {
        normalizedCorrectAnswer = parseInt(normalizedCorrectAnswer, 10);
      }

      return {
        _id: uuidv4(),
        questionType: q.questionType || (q.options ? 'MCQ' : 'SUBJECTIVE'),
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: normalizedCorrectAnswer !== undefined ? normalizedCorrectAnswer : null,
        idealAnswer: q.idealAnswer || '',
        rubricCriteria: q.rubricCriteria || [],
        maxScore: q.maxScore || 10,
        explanation: q.explanation || '',
      };
    });

    const quiz = await sequelize.transaction(async (t) => {
      const createdQuiz = await Quiz.create({
        title: aiQuiz.title || `${topicName} AI Practice Quiz`,
        subject: subjectId,
        topic: topicId || null,
        questions: questionsWithIds,
        type: 'AI_Generated',
        language: normalizedLanguage,
        createdBy: req.user.id,
      }, { transaction: t });
      
      // Mocking associated QuizSettings or QuizMetadata creation
      // await QuizSettings.create({ quizId: createdQuiz.id, timer: 300 }, { transaction: t });

      return createdQuiz;
    });

    await createNotification(
      req.user.id,
      '🧠 AI Quiz Ready',
      `Your practice quiz "${quiz.title}" has been generated.`,
      'ai_quiz',
      `/quiz/${quiz.id}`,
      global.io
    );

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Generate a custom revision quiz from PYQ bank
// @route   POST /api/quizzes/generate-custom
// @access  Private
exports.generateCustomQuiz = async (req, res, next) => {
  try {
    const { subjectId, topics = [], difficulty = 'medium', years = [], count = 5, timeLimit = 20, language = 'english' } = req.body;

    const MAX_QUIZ_COUNT = 50;
    const requestedCount = parseInt(count, 10) || 5;
    if (requestedCount < 1 || requestedCount > MAX_QUIZ_COUNT) {
      return res.status(400).json({
        success: false,
        error: `Invalid count parameter. Must be between 1 and ${MAX_QUIZ_COUNT}.`,
      });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Retrieve PYQ analyses for this subject
    const analyses = await PYQAnalysis.findAll({ where: { subjectId } });
    const analysisIds = analyses.map((a) => a.id);

    // Retrieve matching PYQ questions
    const whereClause = {
      pyqAnalysisId: analysisIds,
    };
    if (topics.length > 0) {
      whereClause.topicName = topics;
    }
    if (years.length > 0) {
      whereClause.year = years;
    }

    const pyqQuestions = await PYQQuestion.findAll({ where: whereClause });
    const pyqQuestionsText = pyqQuestions
      .map((q) => `[Year: ${q.year}, Topic: ${q.topicName}, Marks: ${q.marks}] ${q.questionText}`)
      .join('\n\n');

    const difficultyLevel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    // Call Gemini Service
    const aiQuiz = await geminiService.generateCustomQuiz(
      subject.name,
      topics,
      difficultyLevel,
      requestedCount,
      pyqQuestionsText,
      language
    );

    // Assign unique IDs to the questions
    const questionsWithIds = aiQuiz.questions.map((q) => ({
      _id: uuidv4(),
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    }));

    const quiz = await Quiz.create({
      title: aiQuiz.title || `${subject.name} Custom Revision Quiz`,
      subject: subjectId,
      topic: null, // Covers multiple topics
      questions: questionsWithIds,
      type: 'AI_Generated',
      language: language || 'english',
      createdBy: req.user.id,
      timeLimit: timeLimit || 20,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

const { getPaginationParams, formatPaginatedResponse } = require('../utils/paginationParams');

// @desc    Get quizzes for a subject
// @route   GET /api/quizzes
// @access  Private
exports.getQuizzes = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);

    const filter = { createdBy: req.user.id };
    if (subjectId) filter.subject = subjectId;

    const { count: total, rows: quizzes } = await Quiz.findAndCountAll({
      where: filter,
      distinct: true,
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
      ],
      offset,
      limit,
    });

    const populatedQuizzes = quizzes.map((q) => {
      const json = q.toJSON();
      json.subject = json.subjectRef;
      json.topic = json.topicRef;
      return json;
    });

    res.status(200).json(formatPaginatedResponse(populatedQuizzes, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz details (including questions)
// @route   GET /api/quizzes/:id
// @access  Private
exports.getQuizDetails = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      where: { id: req.params.id, createdBy: req.user.id },
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
      ],
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const json = quiz.toJSON();
    json.subject = json.subjectRef;
    json.topic = json.topicRef;

    res.status(200).json({ success: true, data: json });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private
exports.submitQuizAttempt = async (req, res, next) => {
  try {
    const { answers, timeSpent } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'Answers must be provided as an array' });
    }

    const quiz = await Quiz.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const questionsList = quiz.questions || [];

    // Validate that all questions are answered
    if (answers.length !== questionsList.length) {
      return res.status(400).json({ 
        success: false, 
        error: `Incomplete submission: expected ${questionsList.length} answers but received ${answers.length}` 
      });
    }

    // Validate that all submitted questionIds actually belong to this quiz
    const quizQuestionIds = questionsList.map(q => String(q._id || q.id));
    const invalidAnswers = answers.filter(ans => !quizQuestionIds.includes(String(ans.questionId)));
    if (invalidAnswers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid questionId(s) submitted that do not belong to this quiz' 
      });
    }

    // Atomically check for duplicate submissions and persist the attempt.
    // READ COMMITTED is required so that, after waiting for the row lock, the
    // duplicate check sees the committed attempt of a concurrent request.
    const result = await sequelize.transaction(
      { isolationLevel: 'READ COMMITTED' },
      async (transaction) => {
      const lockedQuiz = await Quiz.findOne({
        where: { id: quiz.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lockedQuiz) {
        return { error: 'Quiz not found' };
      }

      // Ignore duplicate submissions for the same quiz within the 5-second window
      const existingAttempt = await QuizAttempt.findOne({
        where: {
          user: req.user.id,
          quiz: quiz.id,
          createdAt: { [Op.gte]: new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS) },
        },
        transaction,
      });
      if (existingAttempt) {
        return { attempt: existingAttempt, duplicate: true };
      }

      // Evaluate answers
      let correctCount = 0;
      let totalEarnedPoints = 0;
      let totalMaxPoints = 0;

      const evaluatedAnswers = questionsList.map((q) => {
        const userAns = answers.find((ans) => String(ans.questionId) === String(q._id || q.id));
        const isSubjective = q.questionType === 'SUBJECTIVE' || (!q.options && q.idealAnswer);

        if (isSubjective) {
          const evalObj = userAns ? (userAns.evaluation || (userAns.selectedAnswer && userAns.selectedAnswer.evaluation) || null) : null;
          const earned = evalObj ? (evalObj.score || 0) : 0;
          const maxSc = (evalObj && evalObj.maxScore) ? evalObj.maxScore : (q.maxScore || 10);
          totalEarnedPoints += earned;
          totalMaxPoints += maxSc;
          const isCorrect = maxSc > 0 ? (earned / maxSc) >= 0.5 : false;
          if (isCorrect) correctCount++;

          return {
            questionId: q._id || q.id,
            questionType: 'SUBJECTIVE',
            userAnswerText: userAns ? (userAns.userAnswerText || (userAns.selectedAnswer && userAns.selectedAnswer.userAnswerText) || (typeof userAns.selectedAnswer === 'string' ? userAns.selectedAnswer : '') || '') : '',
            isCorrect,
            evaluation: evalObj,
          };
        } else {
          totalMaxPoints += 1;
          const selected = userAns && userAns.selectedAnswer !== undefined ? userAns.selectedAnswer : -1;
          const isCorrect = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.includes(selected)
            : selected === q.correctAnswer;
          if (isCorrect) {
            correctCount++;
            totalEarnedPoints += 1;
          }

          return {
            questionId: q._id || q.id,
            questionType: 'MCQ',
            selectedAnswer: selected,
            isCorrect,
          };
        }
      });

      const totalQuestions = questionsList.length;
      const score = totalMaxPoints > 0 ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) : 0;

      // Determine weak vs strong areas based on score (<50% Weak, 50-80% Medium, >80% Strong)
      const weakTopics = [];
      const strongTopics = [];
      if (quiz.topic) {
        const topicObj = await Topic.findByPk(quiz.topic, { transaction });
        if (topicObj) {
          if (score < 50) {
            weakTopics.push(quiz.topic);
            topicObj.status = 'Weak';
          } else if (score > 80) {
            strongTopics.push(quiz.topic);
            topicObj.status = 'Strong';
          } else {
            topicObj.status = 'Medium';
          }
          await topicObj.save({ transaction });
        }
      }

      // Save Attempt
      const attempt = await QuizAttempt.create(
        {
          user: req.user.id,
          quiz: quiz.id,
          score,
          totalQuestions,
          answers: evaluatedAnswers,
          timeSpent: timeSpent || 0,
          weakTopics,
          strongTopics,
        },
        { transaction }
      );

      return { attempt, duplicate: false, score };
      }
    );

    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }

    const { attempt, duplicate, score } = result;

    // Duplicate submission detected — return the original attempt without
    // re-running side effects (progress, activity log, weakness aggregation).
    if (duplicate) {
      return res.status(200).json({ success: true, data: attempt, duplicate: true });
    }

    if (score >= 80) {
      const gamificationService = require('../services/gamificationService');
      await gamificationService.awardCoins(req.user.id, 25, 'High quiz score bonus')
        .catch(err => console.error('Error awarding PrepCoins for quiz:', err));
    }

    // Trigger AI weakness aggregation and adaptive planner rescheduling in background
    const weaknessAggregatorService = require('../services/weaknessAggregatorService');
    weaknessAggregatorService.aggregateUserWeakness(req.user.id)
      .then(() => weaknessAggregatorService.rescheduleAdaptivePlanner(req.user.id))
      .catch((err) => console.error('Background weakness aggregation error:', err));

    // Issue #2003: Log mistakes with error-taxonomy classification into Mistake Notebook
    const mistakeNotebookService = require('../services/mistakeNotebookService');
    mistakeNotebookService.logAttemptMistakes(attempt, quiz)
      .catch((err) => console.error('Error logging mistake notebook entries:', err));

    // Update Progress (supports both topic-level and subject-level quizzes)
    const progressWhere = {
      user: req.user.id,
      subject: quiz.subject,
    };
    if (quiz.topic) {
      progressWhere.topic = quiz.topic;
    }

    let progress = await Progress.findOne({ where: progressWhere });

    if (progress) {
      const quizScores = [...progress.quizScores];
      quizScores.push({ attempt: attempt.id, score, date: new Date() });
      progress.quizScores = quizScores;

      if (score > progress.completionPercentage) {
        progress.completionPercentage = Math.min(score, 100);
      }
      await progress.save();
    } else {
      await Progress.create({
        user: req.user.id,
        subject: quiz.subject,
        topic: quiz.topic || null,
        completionPercentage: score,
        quizScores: [{ attempt: attempt.id, score, date: new Date() }],
      });
    }

// Log Activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'quiz_attempt',
      description: `Completed practice quiz: "${quiz.title}" with score ${score}%`,
    });

    // Issue #764: Post a "Quiz completed" milestone to the user's study squad feeds.
    // The service reports failures rather than throwing — a squad feed post must
    // not take down a submission whose attempt has already been committed, and
    // must not skip the XP/streak/badge work that follows it.
    const { logSquadActivity } = require('../services/squadActivityService');
    await logSquadActivity(
      req.user.id,
      'quiz_completed',
      `completed "${quiz.title}" scoring ${score}%`,
      { quizId: quiz.id, attemptId: attempt.id, score }
    );

    // Award XP and check gamification badges/streaks
    const gamificationService = require('../services/gamificationService');    const progression = await gamificationService.awardXP(req.user.id, 100, 'quiz_complete');

    const timeZoneParam = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    await gamificationService.updateStreak(req.user.id, timeZoneParam);

    const user = await User.findByPk(req.user.id);
    const badgeDetails = req.headers['x-timezone']
      ? { timeZone: req.headers['x-timezone'] }
      : { timezoneOffsetMinutes: Number(req.headers['x-timezone-offset']) || 0 };
    const newBadges = await gamificationService.checkAndUnlockBadges(user, 'quiz_complete', badgeDetails);
    progression.newBadges = newBadges;

    // Issue #1053: Check for Quiz Master and Sharpshooter
    let consecutiveHighScores = 0;
    if (score > 85) {
      const pastAttempts = await QuizAttempt.findAll({
        where: { user: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      if (pastAttempts.length === 3 && pastAttempts.every(a => a.score > 85)) {
        consecutiveHighScores = 3;
      }
    }
    
    const earnedAchievements = await checkAndAwardBadges(req.user.id, {
      type: 'QUIZ_SUBMIT',
      payload: { score, consecutiveHighScores }
    });
    
    if (earnedAchievements.length > 0) {
      progression.earnedAchievements = earnedAchievements;
    }

    res.status(201).json({
      success: true,
      data: attempt,
      progression,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz attempt history & performance reports
// @route   GET /api/quizzes/attempts/history
// @access  Private
exports.getAttemptHistory = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    let whereClause = { user: req.user.id };
    let offset = undefined;

    if (req.query.cursor) {
      let cursorDate;
      try {
        const decoded = Buffer.from(req.query.cursor, 'base64').toString('ascii');
        cursorDate = new Date(decoded);
      } catch (err) {
        cursorDate = new Date(req.query.cursor);
      }

      if (!isNaN(cursorDate.getTime())) {
        whereClause.createdAt = { [Op.lt]: cursorDate };
      }
    } else if (req.query.page) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const { count: total, rows: rawAttempts } = await QuizAttempt.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['answers'] },
      distinct: true,
      include: [
        {
          model: Quiz,
          as: 'quizRef',
          include: [
            { model: Subject, as: 'subjectRef' },
            { model: Topic, as: 'topicRef' },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limit + 1,
    });

    const hasMore = rawAttempts.length > limit;
    const attempts = hasMore ? rawAttempts.slice(0, limit) : rawAttempts;

    const nextCursor = (hasMore && attempts.length > 0)
      ? Buffer.from(attempts[attempts.length - 1].createdAt.toISOString()).toString('base64')
      : null;

    const populatedAttempts = attempts.map((att) => {
      const json = att.toJSON();
      if (json.quizRef) {
        json.quiz = json.quizRef;
        json.quiz.subject = json.quizRef.subjectRef;
        json.quiz.topic = json.quizRef.topicRef;
      }
      return json;
    });

    const responsePayload = {
      success: true,
      count: populatedAttempts.length,
      total,
      hasMore,
      nextCursor,
      data: populatedAttempts,
    };

    if (!req.query.cursor) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      responsePayload.page = page;
      responsePayload.totalPages = Math.ceil(total / limit);
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Revision Sheet for weak concepts from quiz history
// @route   POST /api/quizzes/generate-revision-sheet or POST /api/quiz/generate-revision-sheet
// @access  Private
exports.generateRevisionSheet = async (req, res, next) => {
  try {
    const { quizAttemptId, mistookQuestions: payloadQuestions, subjectId, topicId, saveToNotes = true } = req.body;

    let mistookQuestions = payloadQuestions || [];
    let targetSubjectName = 'General Subject';
    let targetTopicName = 'Weak Topics';
    let matchedSubjectId = subjectId || null;
    let matchedTopicId = topicId || null;

    if (quizAttemptId) {
      const attempt = await QuizAttempt.findOne({
        where: { id: quizAttemptId, user: req.user.id },
        include: [
          {
            model: Quiz,
            as: 'quizRef',
            include: [
              { model: Subject, as: 'subjectRef' },
              { model: Topic, as: 'topicRef' },
            ],
          },
        ],
      });

      if (attempt) {
        if (attempt.quizRef) {
          matchedSubjectId = matchedSubjectId || attempt.quizRef.subject;
          matchedTopicId = matchedTopicId || attempt.quizRef.topic;

          if (attempt.quizRef.subjectRef) targetSubjectName = attempt.quizRef.subjectRef.name;
          if (attempt.quizRef.topicRef) targetTopicName = attempt.quizRef.topicRef.name;

          mistookQuestions = extractMistookQuestions(attempt);
        }
      }
    }

    if (subjectId && targetSubjectName === 'General Subject') {
      const sub = await Subject.findByPk(subjectId);
      if (sub) targetSubjectName = sub.name;
    }

    if (topicId && targetTopicName === 'Weak Topics') {
      const top = await Topic.findByPk(topicId);
      if (top) targetTopicName = top.name;
    }

    // Call Gemini Service
    const revisionSheet = await geminiService.generateRevisionSheet(
      mistookQuestions,
      targetSubjectName,
      targetTopicName,
      req.query.refresh === 'true'
    );

    let savedNote = null;
    if (saveToNotes && matchedSubjectId) {
      savedNote = await Note.create({
        title: revisionSheet.title || `AI Revision Sheet: ${targetTopicName}`,
        content: revisionSheet.summaryMarkdown,
        subject: matchedSubjectId,
        topic: matchedTopicId,
        category: 'Summary',
        user: req.user.id,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        title: revisionSheet.title,
        summaryMarkdown: revisionSheet.summaryMarkdown,
        savedNote,
      },
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Generate AI Remediation Plan for weak concepts from failed quiz questions
// @route   POST /api/quizzes/generate-remediation-plan
// @access  Private
exports.generateRemediationPlan = async (req, res, next) => {
  try {
    const { quizAttemptId, saveToNotes = true } = req.body;

    let mistookQuestions = req.body.mistookQuestions || [];
    let targetSubjectName = 'General Subject';
    let targetTopicName = 'Weak Concepts';
    let matchedSubjectId = req.body.subjectId || null;
    let matchedTopicId = req.body.topicId || null;

    if (quizAttemptId) {
      const attempt = await QuizAttempt.findOne({
        where: { id: quizAttemptId, user: req.user.id },
        include: [
          {
            model: Quiz,
            as: 'quizRef',
            include: [
              { model: Subject, as: 'subjectRef' },
              { model: Topic, as: 'topicRef' },
            ],
          },
        ],
      });

      if (attempt && attempt.quizRef) {
        matchedSubjectId = matchedSubjectId || attempt.quizRef.subject;
        matchedTopicId = matchedTopicId || attempt.quizRef.topic;

        if (attempt.quizRef.subjectRef) targetSubjectName = attempt.quizRef.subjectRef.name;
        if (attempt.quizRef.topicRef) targetTopicName = attempt.quizRef.topicRef.name;

        mistookQuestions = extractMistookQuestions(attempt);
      }
    }

    if (req.body.subjectId && targetSubjectName === 'General Subject') {
      const sub = await Subject.findByPk(req.body.subjectId);
      if (sub) targetSubjectName = sub.name;
    }

    if (req.body.topicId && targetTopicName === 'Weak Concepts') {
      const top = await Topic.findByPk(req.body.topicId);
      if (top) targetTopicName = top.name;
    }

    if (mistookQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No failed questions found. Generate a remediation plan after reviewing a quiz with mistakes.',
      });
    }

    // Call Gemini Service to structure the 3-day remediation micro-modules
    const remediationPlan = await geminiService.generateRemediationPlan(
      mistookQuestions,
      targetSubjectName,
      targetTopicName,
      req.body.weakTopics || [],
      req.query.refresh === 'true'
    );

    let savedNote = null;
    if (saveToNotes && matchedSubjectId) {
      savedNote = await Note.create({
        title: remediationPlan.title || `3-Day AI Remediation Plan: ${targetTopicName}`,
        content: remediationPlan.summaryMarkdown,
        subject: matchedSubjectId,
        topic: matchedTopicId,
        category: 'Summary',
        user: req.user.id,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        title: remediationPlan.title,
        summaryMarkdown: remediationPlan.summaryMarkdown,
        plan: remediationPlan.plan,
        savedNote,
      },
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Run difficulty calibration report
// @route   GET /api/quizzes/admin/calibration-report
// @access  Private/Admin
exports.getCalibrationReport = async (req, res, next) => {
  try {
    // Check if user is admin if role exists
    if (req.user && req.user.role && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized as admin' });
    }

const report = await runCalibration();
    
    if (report.success) {
      res.status(200).json({ success: true, data: report });
    } else {
      res.status(500).json({ success: false, error: report.error });
    }
  } catch (error) {
    next(error);
  }
};

const TELEMETRY_EVENT_TYPES = ['question_view', 'option_select', 'flag_toggle', 'quiz_submit', 'quiz_exit'];
const MAX_TELEMETRY_EVENTS_PER_BATCH = 200;

// @desc    Ingest a batch of client-buffered quiz telemetry events (question
//          views, option selections, flag toggles) in a single request,
//          instead of one HTTP call per interaction.
// @route   POST /api/quiz/telemetry/batch
// @access  Private (Bearer header, or body.token for sendBeacon calls)
exports.submitTelemetryBatch = async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
    }

    const records = events.slice(0, MAX_TELEMETRY_EVENTS_PER_BATCH).reduce((acc, evt) => {
      if (!evt || !TELEMETRY_EVENT_TYPES.includes(evt.eventType)) return acc;
      acc.push({
        user: req.user.id,
        quiz: evt.quizId || null,
        eventType: evt.eventType,
        questionIndex: Number.isInteger(evt.questionIndex) ? evt.questionIndex : null,
        payload: {
          questionId: evt.questionId || null,
          selectedOption: evt.selectedOption ?? null,
          timeSpentMs: evt.timeSpentMs ?? null,
        },
        clientTimestamp: evt.clientTimestamp ? new Date(evt.clientTimestamp) : new Date(),
      });
      return acc;
    }, []);

    if (records.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid telemetry events found in the batch' });
    }

    await QuizTelemetryEvent.bulkCreate(records);

    // One log line per HTTP request covering many buffered client events —
    // confirms batching is reducing per-interaction network traffic.
    console.log(`[Quiz Telemetry] Batched ${records.length} event(s) from user ${req.user.id} in a single request`);

    res.status(201).json({ success: true, received: records.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the current user's bookmarked question IDs for a quiz
// @route   GET /api/quizzes/:id/bookmarks
// @access  Private
exports.getQuizBookmarks = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const bookmarks = await QuizBookmark.findAll({
      where: { user: req.user.id, quiz: quiz.id },
      attributes: ['questionId'],
    });

    res.status(200).json({ success: true, data: bookmarks.map((b) => b.questionId) });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle bookmark on a single quiz question (used by Review Mode)
// @route   POST /api/quizzes/:id/bookmarks/toggle
// @access  Private
exports.toggleQuizBookmark = async (req, res, next) => {
  try {
    const { questionId } = req.body;

    const quiz = await Quiz.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const questionExists = (quiz.questions || []).some((q) => String(q._id || q.id) === String(questionId));
    if (!questionExists) {
      return res.status(400).json({ success: false, error: 'Question not found in this quiz' });
    }

    const existing = await QuizBookmark.findOne({
      where: { user: req.user.id, quiz: quiz.id, questionId },
    });

    if (existing) {
      await existing.destroy();
      return res.status(200).json({ success: true, bookmarked: false });
    }

    await QuizBookmark.create({ user: req.user.id, quiz: quiz.id, questionId });
    res.status(201).json({ success: true, bookmarked: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed quiz performance report card as PDF
// @route   GET /api/quizzes/attempts/:attemptId/pdf
// @access  Private
exports.getQuizAttemptReportPDF = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findOne({
      where: { id: req.params.attemptId, user: req.user.id },
    });
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Quiz attempt not found' });
    }

    const quiz = await Quiz.findByPk(attempt.quiz);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const subject = await Subject.findByPk(quiz.subject);

    // Calculate topic breakdown
    const topicBreakdown = {};
    const questionsList = quiz.questions || [];
    for (const q of questionsList) {
      const userAns = (attempt.answers || []).find(
        (ans) => String(ans.questionId) === String(q._id || q.id)
      );
      const isCorrect = userAns ? userAns.isCorrect : false;
      const tName = q.topicName || 'General';
      if (!topicBreakdown[tName]) {
        topicBreakdown[tName] = { total: 0, correct: 0 };
      }
      topicBreakdown[tName].total++;
      if (isCorrect) {
        topicBreakdown[tName].correct++;
      }
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `quiz_report_${attempt.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // 1. Header Banner
    doc.rect(0, 0, 595.28, 120).fill('#1a365d'); // Dark Navy

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('Quiz Performance Report', 50, 40);
    doc.font('Helvetica').fontSize(11).text('OpenPrep AI • Smart Diagnostic System', 50, 70);

    // Metadata Block (Right aligned in banner)
    doc.fillColor('#ffffff').fontSize(10);
    doc.text(`Attempt ID: ${attempt.id.substring(0, 8)}...`, 380, 40, { align: 'right', width: 165 });
    doc.text(`Date: ${new Date(attempt.createdAt).toLocaleDateString()}`, 380, 55, { align: 'right', width: 165 });
    doc.text(`Time Spent: ${Math.floor(attempt.timeSpent / 60)}m ${attempt.timeSpent % 60}s`, 380, 70, { align: 'right', width: 165 });

    doc.y = 150;

    // 2. Stats Dashboard Cards
    // Score Card
    doc.rect(50, 150, 150, 80).fill('#edf2f7');
    doc.fillColor('#2d3748').font('Helvetica-Bold').fontSize(28).text(`${attempt.score}%`, 50, 175, { width: 150, align: 'center' });
    doc.fillColor('#718096').font('Helvetica').fontSize(9).text('SCORE PERCENTAGE', 50, 160, { width: 150, align: 'center' });

    // Accuracy Card
    doc.rect(222, 150, 150, 80).fill('#edf2f7');
    const correctCount = (attempt.answers || []).filter((a) => a.isCorrect).length;
    doc.fillColor('#2d3748').font('Helvetica-Bold').fontSize(28).text(`${correctCount}/${attempt.totalQuestions}`, 222, 175, { width: 150, align: 'center' });
    doc.fillColor('#718096').font('Helvetica').fontSize(9).text('QUESTIONS CORRECT', 222, 160, { width: 150, align: 'center' });

    // Accuracy Gauge Box
    doc.rect(395, 150, 150, 80).fill('#edf2f7');
    doc.fillColor('#718096').font('Helvetica').fontSize(9).text('PERFORMANCE STATUS', 395, 160, { width: 150, align: 'center' });
    const statusStr = attempt.score >= 80 ? 'EXCELLENT' : (attempt.score >= 50 ? 'MEDIUM' : 'REQUIRES FOCUS');
    const statusColor = attempt.score >= 80 ? '#38a169' : (attempt.score >= 50 ? '#dd6b20' : '#e53e3e');
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(14).text(statusStr, 395, 175, { width: 150, align: 'center' });
    
    // Draw horizontal progress indicator bar
    doc.fillColor('#e2e8f0').rect(420, 200, 100, 8).fill();
    doc.fillColor(statusColor).rect(420, 200, (attempt.score / 100) * 100, 8).fill();

    // 3. Subject and Topic Title
    doc.y = 260;
    doc.fillColor('#1a365d').font('Helvetica-Bold').fontSize(16).text(quiz.title, 50, doc.y);
    if (subject) {
      doc.fillColor('#4a5568').font('Helvetica').fontSize(11).text(`Subject: ${subject.name}`, 50, doc.y + 20);
      doc.y += 35;
    } else {
      doc.y += 20;
    }

    // 4. Topic Breakdown Table
    doc.fillColor('#1a365d').font('Helvetica-Bold').fontSize(12).text('Topic Breakdown & Analytics', 50, doc.y, { underline: true });
    doc.moveDown(0.4);

    const tableStartY = doc.y;
    doc.fillColor('#2d3748').font('Helvetica-Bold').fontSize(9);
    doc.text('Topic Name', 50, tableStartY, { width: 220 });
    doc.text('Questions', 280, tableStartY, { width: 80, align: 'center' });
    doc.text('Correct', 370, tableStartY, { width: 80, align: 'center' });
    doc.text('Accuracy', 460, tableStartY, { width: 85, align: 'center' });
    doc.moveDown(0.3);
    
    doc.strokeColor('#cbd5e0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font('Helvetica').fontSize(9).fillColor('#4a5568');
    Object.entries(topicBreakdown).forEach(([topicName, data]) => {
      const rowY = doc.y;
      const acc = Math.round((data.correct / data.total) * 100);
      doc.text(topicName, 50, rowY, { width: 220 });
      doc.text(String(data.total), 280, rowY, { width: 80, align: 'center' });
      doc.text(String(data.correct), 370, rowY, { width: 80, align: 'center' });
      doc.text(`${acc}%`, 460, rowY, { width: 85, align: 'center' });
      doc.moveDown(0.4);
    });

    doc.moveDown(1.5);

    // 5. Question Analysis Section
    doc.fillColor('#1a365d').font('Helvetica-Bold').fontSize(12).text('Question-by-Question Diagnostic Review', { underline: true });
    doc.moveDown(0.6);

    questionsList.forEach((q, idx) => {
      if (doc.y > 600) {
        doc.addPage();
      }

      const qNum = idx + 1;
      const userAns = (attempt.answers || []).find(
        (ans) => String(ans.questionId) === String(q._id || q.id)
      );
      const isCorrect = userAns ? userAns.isCorrect : false;

      const cardStartY = doc.y;
      
      // Draw status line indicator
      const barColor = isCorrect ? '#38a169' : '#e53e3e';
      doc.save().rect(50, cardStartY, 4, 80).fill(barColor).restore();

      // Question Title
      doc.fillColor(isCorrect ? '#2f855a' : '#c53030').font('Helvetica-Bold').fontSize(10);
      doc.text(`Question ${qNum} • ${isCorrect ? 'Correct' : 'Incorrect'}`, 65, cardStartY + 8);
      
      doc.fillColor('#2d3748').font('Helvetica').fontSize(9);
      doc.text(q.questionText || '', 65, doc.y + 6, { width: 460 });
      doc.moveDown(0.4);

      const options = q.options || [];
      options.forEach((optStr, optIdx) => {
        const isUserSelection = userAns && userAns.selectedAnswer === optIdx;
        const isCorrectOption = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.includes(optIdx)
          : q.correctAnswer === optIdx;
        
        let prefix = '   [ ] ';
        let optionColor = '#4a5568';
        let optionFont = 'Helvetica';

        if (isCorrectOption) {
          prefix = '   [✓] ';
          optionColor = '#38a169';
          optionFont = 'Helvetica-Bold';
        } else if (isUserSelection && !isCorrect) {
          prefix = '   [✗] ';
          optionColor = '#e53e3e';
          optionFont = 'Helvetica-Bold';
        }

        doc.fillColor(optionColor).font(optionFont).fontSize(8.5);
        doc.text(`${prefix}${optStr}`, 65, doc.y, { width: 460 });
        doc.moveDown(0.25);
      });

      if (q.explanation) {
        doc.moveDown(0.3);
        doc.fillColor('#718096').font('Helvetica-Oblique').fontSize(8);
        doc.text(`Explanation: ${q.explanation}`, 65, doc.y, { width: 460 });
      }

      doc.moveDown(1.5);
    });

    // Footer
    doc.fillColor('#a0aec0').font('Helvetica').fontSize(8).text('Generated by OpenPrep AI Analytical Diagnostic Engine', { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate student's written response for a subjective question against rubric using Gemini
// @route   POST /api/quizzes/evaluate-subjective
// @access  Private
exports.evaluateSubjectiveAnswer = async (req, res, next) => {
  try {
    const { questionId, quizId, userAnswerText } = req.body;
    let targetQuestion = null;

    if (quizId) {
      const quiz = await Quiz.findByPk(quizId);
      if (quiz && Array.isArray(quiz.questions)) {
        targetQuestion = quiz.questions.find((q) => String(q._id || q.id) === String(questionId));
      }
    }

    const questionText = targetQuestion ? targetQuestion.questionText : (req.body.questionText || '');
    const idealAnswer = targetQuestion ? targetQuestion.idealAnswer : (req.body.idealAnswer || '');
    const rubricCriteria = targetQuestion ? targetQuestion.rubricCriteria : (req.body.rubricCriteria || []);
    const maxScore = targetQuestion ? (targetQuestion.maxScore || 10) : (req.body.maxScore || 10);

    const evaluation = await geminiService.evaluateSubjectiveAnswer(
      questionText,
      idealAnswer,
      rubricCriteria,
      userAnswerText || '',
      maxScore,
      req.query.refresh === 'true'
    );

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Generate a targeted MCQ diagnostic quiz from forgotten flashcards
// @route   POST /api/quizzes/generate-remediation
// @access  Private
exports.generateRemediationQuiz = async (req, res, next) => {
  try {
    const { deckId, failedCardIds, count = 5 } = req.body;

    // Validate deck ownership
    const subject = await Subject.findOne({ where: { id: deckId, user: req.user.id } });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Flashcard deck not found or access denied' });
    }

    // Edge case: fewer than 2 failed cards → fallback message
    if (!Array.isArray(failedCardIds) || failedCardIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 failed card IDs are required to generate a remediation quiz.',
        fallback: 'standard_revision',
      });
    }

    // Retrieve and validate that the caller owns all provided card IDs
    const weakCards = await Flashcard.findAll({
      where: { id: failedCardIds, user: req.user.id, subject: deckId },
      attributes: ['id', 'front', 'back'],
    });

    if (weakCards.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Fewer than 2 valid failed cards found for this deck. Standard revision recommended.',
        fallback: 'standard_revision',
      });
    }

    const forceRefresh = req.query.refresh === 'true';
    const aiQuiz = await remediationService.generateRemediationQuiz({
      userId: req.user.id,
      deckId,
      subjectName: subject.name,
      weakCards: weakCards.map((c) => ({ id: c.id, front: c.front, back: c.back })),
      count,
      forceRefresh,
    });

    const questionsWithIds = (aiQuiz.questions || []).map((q) => {
      let normalizedCorrectAnswer = q.correctAnswer;
      if (Array.isArray(normalizedCorrectAnswer)) {
        normalizedCorrectAnswer = normalizedCorrectAnswer.length > 0 ? normalizedCorrectAnswer[0] : null;
      }
      if (typeof normalizedCorrectAnswer === 'string' && !isNaN(normalizedCorrectAnswer) && normalizedCorrectAnswer.trim() !== '') {
        normalizedCorrectAnswer = parseInt(normalizedCorrectAnswer, 10);
      }

      return {
        _id: uuidv4(),
        questionType: 'MCQ',
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: normalizedCorrectAnswer !== undefined ? normalizedCorrectAnswer : null,
        explanation: q.explanation || '',
      };
    });

    const quiz = await Quiz.create({
      title: aiQuiz.title || `Remediation Quiz: ${subject.name}`,
      subject: deckId,
      topic: null,
      questions: questionsWithIds,
      type: 'AI_Generated',
      sourceType: 'REMEDIATION',
      linkedDeckId: deckId,
      language: 'english',
      createdBy: req.user.id,
      timeLimit: 10,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'quiz_attempt',
      description: `Generated remediation diagnostic quiz for deck: "${subject.name}" targeting ${weakCards.length} weak cards`,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({ success: false, error: error.message, retryAfter: error.retryAfter });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Get next dynamic question filtered by user's computed adaptive difficulty rating
// @route   GET /api/quiz/next
// @access  Public / Private
exports.getNextAdaptiveQuestionEndpoint = async (req, res, next) => {
  try {
    const userId = req.query.userId || (req.user && req.user.id);
    const { subjectId, topicId } = req.query;

    const User = require('../models/User');
    const { getDifficultyFromSkill } = require('../src/services/adaptive');

    let user = null;
    if (userId) {
      try {
        user = await User.findByPk(userId);
      } catch (dbErr) {}
    }

    const currentSkillScore = user && user.skillScore !== undefined && user.skillScore !== null
      ? Number(user.skillScore)
      : 1000.0;

    const targetDifficulty = getDifficultyFromSkill(currentSkillScore);

    const whereClause = {};
    if (subjectId) whereClause.subject = subjectId;
    if (topicId) whereClause.topic = topicId;

    let matchingQuestion = null;
    try {
      const quizzes = await Quiz.findAll({ where: whereClause, limit: 20 });

      for (const q of quizzes) {
        if (Array.isArray(q.questions)) {
          const found = q.questions.find(
            (item) => String(item.difficulty || '').toLowerCase() === targetDifficulty.toLowerCase()
          );
          if (found) {
            matchingQuestion = {
              id: found._id || found.id || uuidv4(),
              questionText: found.questionText || found.question,
              options: found.options || [],
              correctAnswer: found.correctAnswer ?? 0,
              difficulty: targetDifficulty,
              explanation: found.explanation || '',
              quizId: q.id,
            };
            break;
          }
        }
      }
    } catch (e) {}

    // Fallback dynamic question generator matching computed difficulty
    if (!matchingQuestion) {
      const fallbackOptions = {
        Easy: {
          questionText: 'Which of the following is a basic fundamental concept in study planning?',
          options: ['Active Recall', 'Passive Skimming', 'Ignoring Deadlines', 'Cramming Overnight'],
          correctAnswer: 0,
        },
        Medium: {
          questionText: 'How does spaced repetition impact long-term memory retention?',
          options: [
            'It decreases memory decay by reviewing at expanding intervals',
            'It accelerates forgetting by delaying reviews',
            'It eliminates the need for active recall',
            'It requires constant daily review of all topics',
          ],
          correctAnswer: 0,
        },
        Hard: {
          questionText: 'Under the Leitner system with SuperMemo SM-2 modifications, how does a failed review affect the interval?',
          options: [
            'Resets interval to step 1 and decreases ease factor',
            'Doubles the current interval regardless of score',
            'Maintains current interval with no change',
            'Increases ease factor by 0.55',
          ],
          correctAnswer: 0,
        },
      };

      const fallback = fallbackOptions[targetDifficulty] || fallbackOptions.Medium;
      matchingQuestion = {
        id: uuidv4(),
        questionText: fallback.questionText,
        options: fallback.options,
        correctAnswer: fallback.correctAnswer,
        difficulty: targetDifficulty,
        explanation: `Dynamically selected at ${targetDifficulty} difficulty matching your skill rating (${currentSkillScore}).`,
      };
    }

    res.status(200).json({
      success: true,
      userId: userId || null,
      skillScore: currentSkillScore,
      difficulty: targetDifficulty,
      question: matchingQuestion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate question distractors quality & plausibility metrics
// @route   POST /api/quiz/evaluate-distractors
// @access  Private
exports.evaluateDistractors = async (req, res, next) => {
  try {
    const { evaluateDistractors } = require('../services/distractorScorerService');
    const { question, options, correctAnswerIndex = 0, context } = req.body;

    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input. "question" string and "options" array (min 2 choices) are required.',
      });
    }

    const result = await evaluateDistractors({
      question,
      options,
      correctAnswerIndex: parseInt(correctAnswerIndex, 10) || 0,
      context,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate misconception-based distractors
// @route   POST /api/quizzes/generate-distractors
// @access  Private
exports.generateDistractors = async (req, res, next) => {
  try {
    const { generateDistractors } = require('../services/distractorGeneratorService');
    const { question, correctAnswer, context = '', language = 'english' } = req.body;
    const result = await generateDistractors({ question, correctAnswer, context, language });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.status === 400 || error.status === 502) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
};


