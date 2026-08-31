const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generateSnapshot,
  generateWeeklySnapshot,
  generateMonthlySnapshot,
  getSnapshots,
  getSnapshot,
  getLatestSnapshot,
  deleteSnapshot,
  deleteExpiredSnapshots,
  getDashboard,
  getConsistencyMetrics,
  getSubjectDistribution,
  getPerformanceTrends,
  getReadinessProjections,
  getInsights,
  getPeriods,
} = require('../controllers/studyAnalyticsController');

const router = express.Router();

// ── Dashboard ────────────────────────────────────────────────────────────
router.get('/dashboard', protect, getDashboard);

// ── Insights ─────────────────────────────────────────────────────────────
router.get('/insights', protect, getInsights);

// ── Period Helpers ───────────────────────────────────────────────────────
router.get('/periods', protect, getPeriods);

// ── Snapshots ────────────────────────────────────────────────────────────
router.post('/snapshots/generate', protect, generateSnapshot);
router.post('/snapshots/weekly', protect, generateWeeklySnapshot);
router.post('/snapshots/monthly', protect, generateMonthlySnapshot);
router.get('/snapshots/latest', protect, getLatestSnapshot);
router.get('/snapshots', protect, getSnapshots);
router.delete('/snapshots/expired', protect, deleteExpiredSnapshots);
router.get('/snapshots/:id', protect, getSnapshot);
router.delete('/snapshots/:id', protect, deleteSnapshot);

// ── Metrics (on-demand computation) ──────────────────────────────────────
router.get('/metrics/consistency', protect, getConsistencyMetrics);
router.get('/metrics/subjects', protect, getSubjectDistribution);
router.get('/metrics/performance', protect, getPerformanceTrends);
router.get('/metrics/readiness', protect, getReadinessProjections);

module.exports = router;
