const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generateSnapshot,
  getSnapshots,
  getSnapshot,
  getLatestSnapshot,
  deleteSnapshot,
  getDashboard,
  getCardCurve,
  getReviewQueue,
  getMasteryBreakdown,
  sm2Preview,
  getInsights,
  getForgettingCurve,
} = require('../controllers/flashcardMasteryController');

const router = express.Router();

// ── Dashboard ────────────────────────────────────────────────────────────
router.get('/dashboard', protect, getDashboard);

// ── Insights ─────────────────────────────────────────────────────────────
router.get('/insights', protect, getInsights);

// ── Forgetting Curve ─────────────────────────────────────────────────────
router.get('/forgetting-curve', protect, getForgettingCurve);

// ── Review Queue ─────────────────────────────────────────────────────────
router.get('/review-queue', protect, getReviewQueue);

// ── Mastery Breakdown ────────────────────────────────────────────────────
router.get('/breakdown', protect, getMasteryBreakdown);

// ── Snapshots ────────────────────────────────────────────────────────────
router.post('/snapshots/generate', protect, generateSnapshot);
router.get('/snapshots/latest', protect, getLatestSnapshot);
router.get('/snapshots', protect, getSnapshots);
router.get('/snapshots/:id', protect, getSnapshot);
router.delete('/snapshots/:id', protect, deleteSnapshot);

// ── Card Analysis ────────────────────────────────────────────────────────
router.get('/cards/:cardId/curve', protect, getCardCurve);
router.post('/cards/:cardId/sm2-preview', protect, sm2Preview);

module.exports = router;
