const express = require('express');
const router = express.Router();
const { getNextDueCard, submitAnswer } = require('../controllers/microLearnController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const microLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many micro-learning requests, please try again shortly.',
  },
});

router.use(microLimiter);
router.use(protect);

router.get('/next-due-card', getNextDueCard);
router.post('/submit-answer', submitAnswer);

module.exports = router;
