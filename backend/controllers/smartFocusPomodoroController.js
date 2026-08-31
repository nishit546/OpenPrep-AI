/**
 * @fileoverview Smart Focus Pomodoro Controller.
 * Provides endpoints for adaptive focus timer recommendations, logging completed sessions, and focus stats.
 */
const smartFocusService = require('../services/smartFocusPomodoroService');

/**
 * @desc Get adaptive Pomodoro timer duration & ambient recommendation
 * @route GET /api/focus/recommendation
 * @access Protected
 */
exports.getRecommendation = async (req, res, next) => {
  try {
    const recommendation = await smartFocusService.getAdaptiveRecommendation(req.user.id);
    return res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Log a completed focus session
 * @route POST /api/focus/sessions
 * @access Protected
 */
exports.logSession = async (req, res, next) => {
  try {
    const sessionData = req.body || {};
    const session = await smartFocusService.logFocusSession(req.user.id, sessionData);

    return res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get overall focus timer statistics for current user
 * @route GET /api/focus/stats
 * @access Protected
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await smartFocusService.getFocusStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
