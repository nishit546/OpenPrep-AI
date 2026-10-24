const poolManager = require('../services/poolManagerService');

/**
 * @desc    Get detailed database connection pool telemetry & circuit breaker status
 * @route   GET /api/health/db
 * @access  Public
 */
exports.getDatabaseHealth = async (req, res) => {
  try {
    const probe = await poolManager.pingDatabase();
    const stats = poolManager.getPoolStats();

    const statusCode = probe.status === 'healthy' ? 200 : 503;

    return res.status(statusCode).json({
      status: probe.status,
      timestamp: new Date().toISOString(),
      probeLatencyMs: probe.latencyMs,
      averageLatencyMs: stats.latency.avg,
      ...stats,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve database health telemetry',
      error: error.message,
    });
  }
};
