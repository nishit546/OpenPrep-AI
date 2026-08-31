const express = require('express');
const { protect } = require('../middleware/auth');
const {
  submitAssessment,
  getRiskSummary,
  getAssessmentHistory,
  getRecommendations,
  getRiskTrend,
  getDailyCheckin,
  getDashboard,
} = require('../controllers/burnoutPreventionController');

const router = express.Router();

// All burnout routes require authentication
router.use(protect);

// ── Dashboard & Summary ──────────────────────────────────────────────────
router.get('/dashboard', getDashboard);
router.get('/summary', getRiskSummary);
router.get('/daily-checkin', getDailyCheckin);

// ── Assessment ───────────────────────────────────────────────────────────
router.post('/assess', submitAssessment);
router.get('/history', getAssessmentHistory);

// ── Analytics & Recommendations ──────────────────────────────────────────
router.get('/trend', getRiskTrend);
router.get('/recommendations', getRecommendations);

module.exports = router;
