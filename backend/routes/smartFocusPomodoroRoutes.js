const express = require('express');
const router = express.Router();
const {
  getRecommendation,
  logSession,
  getStats,
} = require('../controllers/smartFocusPomodoroController');
const { protect } = require('../middleware/auth');

router.get('/recommendation', protect, getRecommendation);
router.post('/sessions', protect, logSession);
router.get('/stats', protect, getStats);

module.exports = router;
