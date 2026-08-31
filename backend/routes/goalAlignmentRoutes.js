const express = require('express');
const { protect } = require('../middleware/auth');
const {
  computeAlignment,
  getAlignments,
  getLatestAlignment,
  getAlignmentTrend,
  getAlignmentById,
  deleteAlignment,
} = require('../controllers/goalAlignmentController');

const router = express.Router();

// ── Aggregates & Trends (before param routes) ───────────────────────────
router.get('/latest', protect, getLatestAlignment);
router.get('/trend', protect, getAlignmentTrend);
router.get('/history', protect, getAlignments);

// ── Compute ──────────────────────────────────────────────────────────────
router.post('/compute', protect, computeAlignment);

// ── Single Snapshot ──────────────────────────────────────────────────────
router.get('/:id', protect, getAlignmentById);
router.delete('/:id', protect, deleteAlignment);

module.exports = router;
