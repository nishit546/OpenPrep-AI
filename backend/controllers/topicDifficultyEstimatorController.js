const topicDifficultyEstimatorService = require('../services/topicDifficultyEstimatorService');

// @desc    Estimate difficulty for a topic
// @route   POST /api/topic-difficulty/estimate
// @access  Private
exports.estimateDifficulty = async (req, res, next) => {
  try {
    const {
      topicId, topicName, subjectId, subjectName,
      selfReportedDifficulty, quizScore, timeMinutes,
    } = req.body;

    if (!topicId || !topicName) {
      return res.status(400).json({
        success: false,
        error: 'topicId and topicName are required',
      });
    }

    const estimate = await topicDifficultyEstimatorService.estimateDifficulty(req.user.id, {
      topicId, topicName, subjectId, subjectName,
      selfReportedDifficulty, quizScore, timeMinutes,
    });

    res.status(201).json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk estimate difficulty for multiple topics
// @route   POST /api/topic-difficulty/estimate/bulk
// @access  Private
exports.bulkEstimate = async (req, res, next) => {
  try {
    const { topics } = req.body;

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'topics must be a non-empty array',
      });
    }

    if (topics.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 topics per bulk request',
      });
    }

    const results = await topicDifficultyEstimatorService.bulkEstimate(req.user.id, topics);
    res.status(201).json({ success: true, data: { estimated: results.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all difficulty estimates
// @route   GET /api/topic-difficulty/estimates
// @access  Private
exports.getEstimates = async (req, res, next) => {
  try {
    const { subjectName, priority, page, limit } = req.query;
    const result = await topicDifficultyEstimatorService.getEstimates(req.user.id, {
      subjectName, priority,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
    });

    res.status(200).json({
      success: true,
      count: result.estimates.length,
      ...result.pagination,
      data: result.estimates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single topic estimate
// @route   GET /api/topic-difficulty/estimates/:topicId
// @access  Private
exports.getEstimate = async (req, res, next) => {
  try {
    const estimate = await topicDifficultyEstimatorService.getEstimate(
      req.user.id, req.params.topicId,
    );

    if (!estimate) {
      return res.status(404).json({ success: false, error: 'Topic estimate not found' });
    }

    res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
};

// @desc    Get difficulty distribution summary
// @route   GET /api/topic-difficulty/distribution
// @access  Private
exports.getDifficultyDistribution = async (req, res, next) => {
  try {
    const distribution = await topicDifficultyEstimatorService.getDifficultyDistribution(
      req.user.id,
    );
    res.status(200).json({ success: true, data: distribution });
  } catch (error) {
    next(error);
  }
};

// @desc    Get hardest topics requiring attention
// @route   GET /api/topic-difficulty/hardest
// @access  Private
exports.getHardestTopics = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const topics = await topicDifficultyEstimatorService.getHardestTopics(req.user.id, {
      limit: parseInt(limit, 10) || 10,
    });
    res.status(200).json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get difficulty dashboard
// @route   GET /api/topic-difficulty/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await topicDifficultyEstimatorService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};
