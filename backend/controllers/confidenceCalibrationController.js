const { 
  extractAnalyzableAnswers,
  generateSummary,
  calculateTopicCalibration,
  calculateCalibrationTrend 
} = require('../services/confidenceCalibrationService');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');

async function getUserAttempts(userId) {
  return await QuizAttempt.findAll({
    where: { user: userId },
    include: [{
      model: Quiz,
      as: 'quizRef',
      include: [{ model: Subject, as: 'subjectRef' }]
    }]
  });
}

// @desc    Get overall calibration summary and quadrants
// @route   GET /api/confidence-calibration/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const attempts = await getUserAttempts(req.user.id);
    const analyzableAnswers = extractAnalyzableAnswers(attempts);
    
    if (analyzableAnswers.length === 0) {
      return res.status(200).json({ success: true, data: null, message: 'No confidence data available.' });
    }

    const summary = generateSummary(analyzableAnswers);
    res.status(200).json({ success: true, data: summary });
const confidenceCalibrationService = require('../services/confidenceCalibrationService');

// ── Rating Endpoints ─────────────────────────────────────────────────────

// @desc    Rate confidence on a topic
// @route   POST /api/confidence-calibration/rate
// @access  Private
exports.rateTopic = async (req, res, next) => {
  try {
    const { topicId, topicName, subjectId, subjectName, confidence } = req.body;

    if (!topicId || !topicName || confidence == null) {
      return res.status(400).json({
        success: false,
        error: 'topicId, topicName, and confidence are required',
      });
    }

    const rating = await confidenceCalibrationService.rateTopic(req.user.id, {
      topicId, topicName, subjectId, subjectName, confidence,
    });

    res.status(201).json({ success: true, data: rating });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk rate multiple topics
// @route   POST /api/confidence-calibration/rate/bulk
// @access  Private
exports.bulkRate = async (req, res, next) => {
  try {
    const { ratings } = req.body;

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ratings must be a non-empty array',
      });
    }

    if (ratings.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 ratings per bulk request',
      });
    }

    const results = await confidenceCalibrationService.bulkRate(req.user.id, ratings);
    res.status(201).json({ success: true, data: { recorded: results.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get per-topic calibration
// @route   GET /api/confidence-calibration/topics
// @access  Private
exports.getTopics = async (req, res, next) => {
  try {
    const attempts = await getUserAttempts(req.user.id);
    
    // Map subjects for friendly names
    const subjectNames = {};
    attempts.forEach(att => {
      if (att.quizRef && att.quizRef.subjectRef) {
        subjectNames[att.quizRef.subject] = att.quizRef.subjectRef.name;
      }
    });

    const analyzableAnswers = extractAnalyzableAnswers(attempts);
    const topicStats = calculateTopicCalibration(analyzableAnswers);

    const enrichedStats = topicStats.map(ts => ({
      ...ts,
      subjectName: subjectNames[ts.subjectId] || 'Unknown Subject'
    }));

    res.status(200).json({ success: true, data: enrichedStats });
// @desc    Get all confidence ratings
// @route   GET /api/confidence-calibration/ratings
// @access  Private
exports.getRatings = async (req, res, next) => {
  try {
    const { subjectName, status, page, limit } = req.query;
    const result = await confidenceCalibrationService.getRatings(req.user.id, {
      subjectName, status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
    });

    res.status(200).json({
      success: true,
      count: result.ratings.length,
      ...result.pagination,
      data: result.ratings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a confidence rating
// @route   DELETE /api/confidence-calibration/ratings/:topicId
// @access  Private
exports.deleteRating = async (req, res, next) => {
  try {
    const deleted = await confidenceCalibrationService.deleteRating(
      req.user.id, req.params.topicId,
    );

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Rating not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Get historical calibration trends
// @route   GET /api/confidence-calibration/trends
// @access  Private
exports.getTrends = async (req, res, next) => {
  try {
    const attempts = await getUserAttempts(req.user.id);
    const analyzableAnswers = extractAnalyzableAnswers(attempts);
    const trend = calculateCalibrationTrend(analyzableAnswers);

    res.status(200).json({ success: true, data: trend });
// ── Calibration Endpoints ────────────────────────────────────────────────

// @desc    Run calibration analysis
// @route   POST /api/confidence-calibration/run
// @access  Private
exports.runCalibration = async (req, res, next) => {
  try {
    const report = await confidenceCalibrationService.runCalibration(req.user.id);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full calibration report
// @route   GET /api/confidence-calibration/report
// @access  Private
exports.getCalibrationReport = async (req, res, next) => {
  try {
    const report = await confidenceCalibrationService.getCalibrationReport(req.user.id);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get calibration for a single topic
// @route   GET /api/confidence-calibration/topics/:topicId
// @access  Private
exports.getTopicCalibration = async (req, res, next) => {
  try {
    const result = await confidenceCalibrationService.getTopicCalibration(
      req.user.id, req.params.topicId,
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Topic not rated yet' });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
