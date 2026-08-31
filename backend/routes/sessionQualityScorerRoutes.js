const express = require('express');
const { protect } = require('../middleware/auth');
const {
  scoreSession,
  scoreBatch,
  getQualityTrend,
  getDimensionalAverages,
  getWeakestDimension,
  getDashboard,
  getScoreById,
} = require('../controllers/sessionQualityScorerController');

const router = express.Router();

// ── Dashboard & Analytics (before param routes) ──────────────────────────
router.get('/dashboard', protect, getDashboard);
router.get('/trend', protect, getQualityTrend);
router.get('/averages', protect, getDimensionalAverages);
router.get('/weakest', protect, getWeakestDimension);

// ── Batch Scoring ────────────────────────────────────────────────────────
router.post('/score/batch', protect, scoreBatch);

// ── Single Score ─────────────────────────────────────────────────────────
router.post('/score', protect, scoreSession);
router.get('/:id', protect, getScoreById);

module.exports = router;
