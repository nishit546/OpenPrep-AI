const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generateEntry,
  getEntries,
  getEntryByDate,
  getEntry,
  addReflection,
  updateMood,
  deleteEntry,
  getAnalytics,
  getTimeline,
  getDashboard,
  generateRange,
} = require('../controllers/learningJournalController');

const router = express.Router();

// ── Dashboard ────────────────────────────────────────────────────────────
router.get('/dashboard', protect, getDashboard);

// ── Analytics ────────────────────────────────────────────────────────────
router.get('/analytics', protect, getAnalytics);

// ── Timeline ─────────────────────────────────────────────────────────────
router.get('/timeline', protect, getTimeline);

// ── Generation ───────────────────────────────────────────────────────────
router.post('/generate', protect, generateEntry);
router.post('/generate-range', protect, generateRange);

// ── Entries ──────────────────────────────────────────────────────────────
router.get('/entries/date/:date', protect, getEntryByDate);
router.get('/entries', protect, getEntries);
router.get('/entries/:id', protect, getEntry);
router.put('/entries/:id/reflection', protect, addReflection);
router.put('/entries/:id/mood', protect, updateMood);
router.delete('/entries/:id', protect, deleteEntry);

module.exports = router;
