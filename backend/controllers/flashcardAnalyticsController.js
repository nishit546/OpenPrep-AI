/**
 * @fileoverview Flashcard Analytics Controller.
 * Exposes endpoints for 5-tier Leitner Box distribution and 30-Day SM-2 Review Load Forecasting.
 */
const spacedRepetitionAnalytics = require('../services/spacedRepetitionAnalytics');

/**
 * @desc Get Leitner Box stage distribution metrics for user's flashcards
 * @route GET /api/flashcards/analytics/leitner-distribution
 * @access Protected
 */
exports.getLeitnerDistribution = async (req, res, next) => {
  try {
    const deckId = req.query.deckId || null;
    const distribution = await spacedRepetitionAnalytics.getLeitnerDistribution(req.user.id, deckId);

    return res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get 30-day projected review workload forecast
 * @route GET /api/flashcards/analytics/due-forecast
 * @access Protected
 */
exports.getDueForecast = async (req, res, next) => {
  try {
    const deckId = req.query.deckId || null;
    const forecastData = await spacedRepetitionAnalytics.get30DayReviewForecast(req.user.id, deckId);

    return res.status(200).json({
      success: true,
      data: forecastData,
    });
  } catch (error) {
    next(error);
  }
};
