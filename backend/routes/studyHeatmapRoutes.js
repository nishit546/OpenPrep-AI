const express = require('express');
const { protect } = require('../middleware/auth');
const {
  recordActivity,
  getMonthlyHeatmap,
  getYearlyHeatmap,
  getPeakHoursAnalysis,
  getStreakAnalytics,
  getDashboard,
  bulkRecordActivity,
  getHeatmapRange,
} = require('../controllers/studyHeatmapController');

const router = express.Router();

// ── Dashboard ────────────────────────────────────────────────────────────
router.get('/dashboard', protect, getDashboard);

// ── Peak Hours & Streaks ─────────────────────────────────────────────────
router.get('/peak-hours', protect, getPeakHoursAnalysis);
router.get('/streaks', protect, getStreakAnalytics);

// ── Heatmap Grids ────────────────────────────────────────────────────────
router.get('/monthly/:year/:month', protect, getMonthlyHeatmap);
router.get('/yearly/:year', protect, getYearlyHeatmap);
router.get('/range', protect, getHeatmapRange);

// ── Record Activity ──────────────────────────────────────────────────────
router.post('/activity', protect, recordActivity);
router.post('/activity/bulk', protect, bulkRecordActivity);

module.exports = router;
