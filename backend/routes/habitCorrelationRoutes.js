const express = require('express');
const { protect } = require('../middleware/auth');
const {
  recordObservation,
  getCorrelationSummary,
  getPerformanceByHour,
  getPerformanceByDay,
  getOptimalSchedule,
} = require('../controllers/habitCorrelationController');

const router = express.Router();

// All habit correlation routes require authentication
router.use(protect);

// ── Data Collection ─────────────────────────────────────────────────────
router.post('/record', recordObservation);

// ── Analytics & Insights ────────────────────────────────────────────────
router.get('/summary', getCorrelationSummary);
router.get('/by-hour', getPerformanceByHour);
router.get('/by-day', getPerformanceByDay);
router.get('/optimal-schedule', getOptimalSchedule);

module.exports = router;
