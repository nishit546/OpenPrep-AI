/**
 * @fileoverview Routes for the Adaptive Revision Calendar feature.
 *
 * Base: /api/study-schedule
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  generateSchedule,
  rebalanceSchedule,
  updateSlotDate,
  getCognitiveLoad,
} = require('../controllers/adaptiveScheduleController');

/**
 * @route  POST /api/study-schedule/generate
 * @desc   Create an optimised AI revision schedule from exam date + topics
 * @access Private
 */
router.post('/generate', protect, aiLimiter, generateSchedule);

/**
 * @route  POST /api/study-schedule/rebalance
 * @desc   Redistribute pending slots across remaining days after missed study
 * @access Private
 */
router.post('/rebalance', protect, aiLimiter, rebalanceSchedule);

/**
 * @route  PATCH /api/study-schedule/slots/:id
 * @desc   Drag-and-drop: move a single revision slot to a new date
 * @access Private
 */
router.patch('/slots/:id', protect, updateSlotDate);

/**
 * @route  GET /api/study-schedule/:scheduleId/cognitive-load
 * @desc   Fetch per-day cognitive load scores for the calendar heatmap
 * @access Private
 */
router.get('/:scheduleId/cognitive-load', protect, getCognitiveLoad);

module.exports = router;
