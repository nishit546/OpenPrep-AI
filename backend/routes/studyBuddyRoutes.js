const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createRequest,
  getRequests,
  getRequest,
  cancelRequest,
  togglePause,
  findBestMatch,
  findPotentialMatches,
  acceptMatch,
  recordSession,
  submitFeedback,
  getDashboard,
} = require('../controllers/studyBuddyController');

const router = express.Router();

// ── Dashboard (before param routes) ─────────────────────────────────────
router.get('/dashboard', protect, getDashboard);

// ── Matching (before param routes) ───────────────────────────────────────
router.get('/match', protect, findBestMatch);
router.get('/matches', protect, findPotentialMatches);
router.post('/accept/:candidateRequestId', protect, acceptMatch);

// ── Request CRUD ─────────────────────────────────────────────────────────
router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequest);
router.delete('/:id', protect, cancelRequest);
router.patch('/:id/toggle-pause', protect, togglePause);

// ── Session & Feedback ───────────────────────────────────────────────────
router.post('/:id/session', protect, recordSession);
router.post('/:id/feedback', protect, submitFeedback);

module.exports = router;
