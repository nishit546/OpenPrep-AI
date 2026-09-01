const {
  getTopSlowQueries,
  getAllIndexRecommendations,
  SLOW_QUERY_THRESHOLD_MS,
} = require('../services/queryProfilerService');

/**
 * @desc    Top slowest queries observed since process start, grouped by
 *          normalized query signature.
 * @route   GET /api/admin/db/slow-queries
 * @access  Private/Admin
 */
exports.getSlowQueries = (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const queries = getTopSlowQueries(limit);
  return res.json({
    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
    count: queries.length,
    queries,
  });
};

/**
 * @desc    Composite/partial index suggestions derived from EXPLAIN plans
 *          captured for slow queries.
 * @route   GET /api/admin/db/index-recommendations
 * @access  Private/Admin
 */
exports.getIndexRecommendations = (req, res) => {
  const recommendations = getAllIndexRecommendations();
  return res.json({
    count: recommendations.length,
    recommendations,
  });
};
