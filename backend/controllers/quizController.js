const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const geminiService = require('../services/geminiService');

// @desc    Generate AI Quiz
// @route   POST /api/quizzes/generate-ai
// @access  Private
exports.generateAIQuiz = async (req, res, next) => {
  try {
    const { subjectId, topicId, count } = req.body;

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
        .join('\n')
        .substring(0, 5000);
    }

    // Call Gemini Service
    const aiQuiz = await geminiService.generateQuiz(subject.name, topicName, notesText, count || 5, req.query.refresh === 'true');

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
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
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

    const quiz = await Quiz.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    // Evaluate answers
    let correctCount = 0;
    const evaluatedAnswers = quiz.questions.map((q) => {
      const userAns = answers.find((ans) => ans.questionId === q._id || ans.questionId === q.id);
      const selected = userAns ? userAns.selectedAnswer : -1;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q._id || q.id,
        selectedAnswer: selected,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // Determine weak vs strong areas based on score
    const weakTopics = [];
    const strongTopics = [];
    if (quiz.topic) {
      const topicObj = await Topic.findByPk(quiz.topic);
      if (topicObj) {
        if (score < 60) {
          weakTopics.push(quiz.topic);
          topicObj.status = 'Weak';
        } else if (score >= 80) {
          strongTopics.push(quiz.topic);
          topicObj.status = 'Strong';
        } else {
          topicObj.status = 'Medium';
        }
        await topicObj.save();
      }
    }

    // Save Attempt
    const attempt = await QuizAttempt.create({
      user: req.user.id,
      quiz: quiz.id,
      score,
      totalQuestions,
      answers: evaluatedAnswers,
      timeSpent: timeSpent || 0,
      weakTopics,
      strongTopics,
    });

    // Update Progress
    if (quiz.topic) {
      let progress = await Progress.findOne({
        where: {
          user: req.user.id,
          subject: quiz.subject,
          topic: quiz.topic,
        },
      });

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
          topic: quiz.topic,
          completionPercentage: score,
          quizScores: [{ attempt: attempt.id, score, date: new Date() }],
        });
      }
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'quiz_attempt',
      description: `Completed practice quiz: "${quiz.title}" with score ${score}%`,
    });

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
