const sessionQualityScorerService = require('../services/sessionQualityScorerService');

// @desc    Score a single study session
// @route   POST /api/session-quality/score
// @access  Private
exports.scoreSession = async (req, res, next) => {
  try {
    const {
      sessionId, durationMinutes, topic, subjectName,
      focusRating, interruptions, quizzesTaken, quizAvgScore,
      flashcardsReviewed, flashcardAccuracy, notesCreated, sessionHour,
    } = req.body;

    if (!sessionId || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and durationMinutes are required',
      });
    }

    const score = await sessionQualityScorerService.scoreSession(req.user.id, {
      sessionId, durationMinutes, topic, subjectName,
      focusRating, interruptions, quizzesTaken, quizAvgScore,
      flashcardsReviewed, flashcardAccuracy, notesCreated, sessionHour,
    });

    res.status(201).json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch-score multiple sessions
// @route   POST /api/session-quality/score/batch
// @access  Private
exports.scoreBatch = async (req, res, next) => {
  try {
    const { sessions } = req.body;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sessions must be a non-empty array',
      });
    }

    if (sessions.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 30 sessions per batch request',
      });
    }

    const results = await sessionQualityScorerService.scoreSessions(req.user.id, sessions);
    res.status(201).json({ success: true, data: { scored: results.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quality trend
// @route   GET /api/session-quality/trend
// @access  Private
exports.getQualityTrend = async (req, res, next) => {
  try {
    const { days, subjectName } = req.query;
    const trend = await sessionQualityScorerService.getQualityTrend(req.user.id, {
      days: parseInt(days, 10) || 30,
      subjectName,
    });
    res.status(200).json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dimensional averages
// @route   GET /api/session-quality/averages
// @access  Private
exports.getDimensionalAverages = async (req, res, next) => {
  try {
    const { days, subjectName } = req.query;
    const avgs = await sessionQualityScorerService.getDimensionalAverages(req.user.id, {
      days: parseInt(days, 10) || 14,
      subjectName,
    });
    res.status(200).json({ success: true, data: avgs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weakest/strongest dimension
// @route   GET /api/session-quality/weakest
// @access  Private
exports.getWeakestDimension = async (req, res, next) => {
  try {
    const { days } = req.query;
    const result = await sessionQualityScorerService.getWeakestDimension(req.user.id, {
      days: parseInt(days, 10) || 14,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quality dashboard
// @route   GET /api/session-quality/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await sessionQualityScorerService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a specific score by ID
// @route   GET /api/session-quality/:id
// @access  Private
exports.getScoreById = async (req, res, next) => {
  try {
    const SessionQualityScore = require('../models/SessionQualityScore');
    const score = await SessionQualityScore.findOne({
      where: { id: req.params.id, user: req.user.id },
    });

    if (!score) {
      return res.status(404).json({ success: false, error: 'Score not found' });
    }

    res.status(200).json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
};
