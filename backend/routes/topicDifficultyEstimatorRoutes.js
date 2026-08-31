const express = require('express');
const { protect } = require('../middleware/auth');
const {
  estimateDifficulty,
  bulkEstimate,
  getEstimates,
  getEstimate,
  getDifficultyDistribution,
  getHardestTopics,
  getDashboard,
} = require('../controllers/topicDifficultyEstimatorController');

const router = express.Router();

// ── Dashboard & Aggregates (before param routes) ────────────────────────
router.get('/dashboard', protect, getDashboard);
router.get('/distribution', protect, getDifficultyDistribution);
router.get('/hardest', protect, getHardestTopics);

// ── Bulk Estimate ────────────────────────────────────────────────────────
router.post('/estimate/bulk', protect, bulkEstimate);

// ── Estimate & Retrieve ──────────────────────────────────────────────────
router.post('/estimate', protect, estimateDifficulty);
router.get('/estimates', protect, getEstimates);
router.get('/estimates/:topicId', protect, getEstimate);

module.exports = router;
