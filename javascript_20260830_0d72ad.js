const InterleavedPracticeService = require('../services/interleavedPracticeService');

/**
 * @desc    Generate a new interleaved practice set
 * @route   POST /api/interleaved-practice/generate
 * @access  Private
 */
exports.generateSet = async (req, res, next) => {
  try {
    const {
      topicIds,
      interferenceLevel = 0.5,
      questionCount = 10,
      seed = null,
      includeConfusable = true,
      minAccuracyThreshold = 0.6,
    } = req.body;

    if (!topicIds || topicIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 topics are required for interleaving',
      });
    }

    if (interferenceLevel < 0 || interferenceLevel > 1) {
      return res.status(400).json({
        success: false,
        error: 'Interference level must be between 0 and 1',
      });
    }

    if (questionCount < 2 || questionCount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Question count must be between 2 and 100',
      });
    }

    const result = await InterleavedPracticeService.generateSet({
      userId: req.user.id,
      topicIds,
      interferenceLevel,
      questionCount,
      seed,
      includeConfusable,
      minAccuracyThreshold,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a practice set by ID
 * @route   GET /api/interleaved-practice/:setId
 * @access  Private
 */
exports.getSet = async (req, res, next) => {
  try {
    const { setId } = req.params;

    const practiceSet = await InterleavedPracticeService.getSetById(
      setId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: practiceSet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all practice sets for user
 * @route   GET /api/interleaved-practice/sets
 * @access  Private
 */
exports.getUserSets = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await InterleavedPracticeService.getUserSets(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update results for a practice set
 * @route   POST /api/interleaved-practice/:setId/results
 * @access  Private
 */
exports.updateResults = async (req, res, next) => {
  try {
    const { setId } = req.params;
    const { results } = req.body;

    if (!results || typeof results !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Results object is required',
      });
    }

    const practiceSet = await InterleavedPracticeService.updateResults(
      setId,
      req.user.id,
      results
    );

    res.status(200).json({
      success: true,
      data: practiceSet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete a practice set
 * @route   POST /api/interleaved-practice/:setId/complete
 * @access  Private
 */
exports.completeSet = async (req, res, next) => {
  try {
    const { setId } = req.params;
    const { timeSpent } = req.body;

    const practiceSet = await InterleavedPracticeService.completeSet(
      setId,
      req.user.id,
      timeSpent
    );

    res.status(200).json({
      success: true,
      data: practiceSet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get interleaving benefit
 * @route   GET /api/interleaved-practice/benefit
 * @access  Private
 */
exports.getBenefit = async (req, res, next) => {
  try {
    const result = await InterleavedPracticeService.getInterleavingBenefit(
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user stats
 * @route   GET /api/interleaved-practice/stats
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await InterleavedPracticeService.getUserStats(req.user.id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a practice set
 * @route   DELETE /api/interleaved-practice/:setId
 * @access  Private
 */
exports.deleteSet = async (req, res, next) => {
  try {
    const { setId } = req.params;

    const result = await InterleavedPracticeService.deleteSet(
      setId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get confusable pairs for topics
 * @route   GET /api/interleaved-practice/confusable-pairs
 * @access  Private
 */
exports.getConfusablePairs = async (req, res, next) => {
  try {
    const { topicIds } = req.query;

    if (!topicIds) {
      return res.status(400).json({
        success: false,
        error: 'Topic IDs are required',
      });
    }

    const ids = Array.isArray(topicIds) ? topicIds : topicIds.split(',');
    const pairs = await InterleavedPracticeService.getConfusablePairs(
      req.user.id,
      ids
    );

    res.status(200).json({
      success: true,
      data: pairs,
    });
  } catch (error) {
    next(error);
  }
};