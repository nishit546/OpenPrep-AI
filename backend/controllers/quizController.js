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

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    let topicName = 'General Overview';
    let topicObj = null;
    if (topicId) {
      topicObj = await Topic.findById(topicId);
      if (topicObj) topicName = topicObj.name;
    }

    // Try to find notes to feed context to Gemini API
    const notes = await Note.find({ subject: subjectId, user: req.user.id });
    let notesText = '';
    if (notes && notes.length > 0) {
      notesText = notes.map((n) => n.content || '').join('\n').substring(0, 5000);
    }

    // Call Gemini Service
    const aiQuiz = await geminiService.generateQuiz(subject.name, topicName, notesText, count || 5);

    const quiz = await Quiz.create({
      title: aiQuiz.title || `${topicName} AI Practice Quiz`,
      subject: subjectId,
      topic: topicId || null,
      questions: aiQuiz.questions,
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
    const filter = { createdBy: req.user.id };
    if (subjectId) filter.subject = subjectId;

    const quizzes = await Quiz.find(filter).populate('subject').populate('topic');
    res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz details (including questions)
// @route   GET /api/quizzes/:id
// @access  Private
exports.getQuizDetails = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('subject')
      .populate('topic');

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private
exports.submitQuizAttempt = async (req, res, next) => {
  try {
    const { answers, timeSpent } = req.body; // answers is array of: { questionId, selectedAnswer }
    
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    // Evaluate answers
    let correctCount = 0;
    const evaluatedAnswers = quiz.questions.map((q) => {
      const userAns = answers.find((ans) => ans.questionId === q._id.toString());
      const selected = userAns ? userAns.selectedAnswer : -1;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q._id,
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
      if (score < 60) {
        weakTopics.push(quiz.topic);
        // Automatically set topic status to Weak in DB
        await Topic.findByIdAndUpdate(quiz.topic, { status: 'Weak' });
      } else if (score >= 80) {
        strongTopics.push(quiz.topic);
        await Topic.findByIdAndUpdate(quiz.topic, { status: 'Strong' });
      } else {
        await Topic.findByIdAndUpdate(quiz.topic, { status: 'Medium' });
      }
    }

    // Save Attempt
    const attempt = await QuizAttempt.create({
      user: req.user.id,
      quiz: quiz._id,
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
        user: req.user.id,
        subject: quiz.subject,
        topic: quiz.topic,
      });

      if (progress) {
        progress.quizScores.push({ attempt: attempt._id, score, date: Date.now() });
        // Recalculate completion percentage if they scored well
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
          quizScores: [{ attempt: attempt._id, score, date: Date.now() }],
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
    const attempts = await QuizAttempt.find({ user: req.user.id })
      .populate({
        path: 'quiz',
        populate: [{ path: 'subject' }, { path: 'topic' }],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: attempts.length, data: attempts });
  } catch (error) {
    next(error);
  }
};
