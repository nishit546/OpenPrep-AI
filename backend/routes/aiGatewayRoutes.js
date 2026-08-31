/**
 * @fileoverview API routes for the Google Gemini AI Rate Limiter & Priority Queue telemetry admin gateway.
 */
const express = require('express');
const router = express.Router();
const aiGatewayController = require('../controllers/aiGatewayController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbacMiddleware');

/**
 * @route   GET /api/admin/ai-gateway/metrics
 * @desc    Fetch real-time cache hits, budgets, and priority queue latency statistics
 * @access  Private (SUPERADMIN required)
 */
router.get(
  '/admin/ai-gateway/metrics',
  protect,
  requireRole('SUPERADMIN'),
  aiGatewayController.getGatewayTelemetry
);

module.exports = router;
