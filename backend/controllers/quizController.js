const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError, normalizeQuizLanguage } = require('../services/geminiService');
const { runCalibration } = require('../services/difficultyCalibrator');

// Window (ms) during which duplicate quiz submissions for the same quiz are ignored.
// Prevents double-click on "Submit Quiz" from creating duplicate attempt records.
const DUPLICATE_SUBMIT_WINDOW_MS = 5000;

// @desc    Generate AI Quiz
// @route   POST /api/quizzes/generate-ai
// @access  Private
exports.generateAIQuiz = async (req, res, next) => {
  try {
    const { subjectId, topicId, count, language } = req.body;
    const normalizedLanguage = normalizeQuizLanguage(language);

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

    // Call Gemini Service
    const aiQuiz = await geminiService.generateQuiz(
      subject.name,
      topicName,
      notesText,
      count || 5,
      req.query.refresh === 'true',
      normalizedLanguage
    );

    // Assign unique question IDs (similar to Mongoose subdocument ids)
    const questionsWithIds = aiQuiz.questions.map((q) => ({
      _id: uuidv4(),
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    }));

    const quiz = await Quiz.create({
      title: aiQuiz.title || `${topicName} AI Practice Quiz`,
      subject: subjectId,
      topic: topicId || null,
      questions: questionsWithIds,
      type: 'AI_Generated',
      language: normalizedLanguage,
      createdBy: req.user.id,
    });

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

// @desc    Get quizzes for a subject
// @route   GET /api/quizzes
// @access  Private
exports.getQuizzes = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

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

    res.status(200).json({
      success: true,
      count: populatedQuizzes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: populatedQuizzes,
    });
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
      const evaluatedAnswers = questionsList.map((q) => {
        const userAns = answers.find((ans) => String(ans.questionId) === String(q._id || q.id));
        const selected = userAns && userAns.selectedAnswer !== undefined ? userAns.selectedAnswer : -1;
        const isCorrect = selected === q.correctAnswer;
        if (isCorrect) correctCount++;

        return {
          questionId: q._id || q.id,
          selectedAnswer: selected,
          isCorrect,
        };
      });

      const totalQuestions = questionsList.length;
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

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

    // Trigger AI weakness aggregation and adaptive planner rescheduling in background
    const weaknessAggregatorService = require('../services/weaknessAggregatorService');
    weaknessAggregatorService.aggregateUserWeakness(req.user.id)
      .then(() => weaknessAggregatorService.rescheduleAdaptivePlanner(req.user.id))
      .catch((err) => console.error('Background weakness aggregation error:', err));

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
    }, { transaction: t });

    res.status(201).json({
      success: true,
      data: attempt,
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { count: total, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: { user: req.user.id },
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
      limit,
    });

    const populatedAttempts = attempts.map((att) => {
      const json = att.toJSON();
      if (json.quizRef) {
        json.quiz = json.quizRef;
        json.quiz.subject = json.quizRef.subjectRef;
        json.quiz.topic = json.quizRef.topicRef;
      }
      return json;
    });

    res.status(200).json({
      success: true,
      count: populatedAttempts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: populatedAttempts,
    });
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

          const quizQuestions = attempt.quizRef.questions || [];
          const userAnswers = attempt.answers || [];

          mistookQuestions = quizQuestions
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
