const express = require('express');
const { getActivityHeatmap } = require('../controllers/progressController');
const { getReadinessProjection } = require('../controllers/readinessController');
const { protect } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Study analytics and activity insights
 */

/**
 * @swagger
 * /api/analytics/activity-heatmap:
 *   get:
 *     summary: Get daily study activity for the last 365 days (contribution heatmap)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily activity heatmap data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2026-08-10"
 *                       questionsSolved:
 *                         type: integer
 *                         example: 14
 *                       flashcardsReviewed:
 *                         type: integer
 *                         example: 2
 *                       total:
 *                         type: integer
 *                         example: 16
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/analytics/readiness-projection:
 *   get:
 *     summary: Retrieve predictive exam readiness trajectory and daily hours simulation data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetExamDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dailyHours
 *         schema:
 *           type: integer
 *           default: 2
 *       - in: query
 *         name: targetScore
 *         schema:
 *           type: integer
 *           default: 85
 *     responses:
 *       200:
 *         description: Predictive readiness trajectory and recommendations
 */

const { getSubjectHeatmap, getDailyRecommendations } = require('../controllers/weaknessAnalyticsController');

router.get('/readiness-projection', protect, getReadinessProjection);
router.get('/activity-heatmap', protect, getActivityHeatmap);
router.get('/weakness-heatmap/:subjectId', protect, getSubjectHeatmap);
router.get('/daily-recommendations', protect, getDailyRecommendations);

module.exports = router;