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
  } catch (error) {
    next(error);
  }
};
