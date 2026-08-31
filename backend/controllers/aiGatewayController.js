/**
 * @fileoverview Admin Controller for checking AI Gateway and priority queue performance metrics.
 */
const aiGatewayService = require('../services/aiGatewayService');
const aiRequestQueue = require('../services/aiRequestQueue');

/**
 * Exposes real-time statistics regarding token utilization, cache performance, and queue states.
 */
const getGatewayTelemetry = async (req, res, next) => {
  try {
    const { queue } = aiRequestQueue.initQueue();
    let queueJobCounts = { active: 0, waiting: 0, completed: 0, failed: 0 };

    if (queue) {
      queueJobCounts = await queue.getJobCounts();
    }

    const hitRatio = aiGatewayService.getCacheHitRatio();
    const averageLatency = aiRequestQueue.getAverageQueueLatency();

    res.status(200).json({
      success: true,
      data: {
        cache: {
          hits: aiGatewayService.cacheHits || 0,
          misses: aiGatewayService.cacheMisses || 0,
          hitRatio: parseFloat(hitRatio.toFixed(3)),
        },
        queue: {
          jobCounts: queueJobCounts,
          averageLatencyMs: Math.round(averageLatency),
        },
        limits: {
          freeTierDailyBudget: aiGatewayService.BUDGETS.FREE,
          proTierDailyBudget: aiGatewayService.BUDGETS.PRO,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGatewayTelemetry,
};
