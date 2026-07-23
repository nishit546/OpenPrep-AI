const express = require('express');
const {
  generateAIFlashcards,
  createFlashcard,
  getFlashcards,
  reviewFlashcard,
  deleteFlashcard,
} = require('../controllers/flashcardController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { checkQuota } = require('../middleware/quotaMiddleware');
const {
  validateGenerateAIFlashcards,
  validateCreateFlashcard,
  validateReviewFlashcard,
} = require('../middleware/validators');

const router = express.Router();

router.post('/generate-ai', protect, aiLimiter, checkQuota, validateGenerateAIFlashcards, generateAIFlashcards);
router.post('/', protect, validateCreateFlashcard, createFlashcard);
router.get('/', protect, getFlashcards);
router.put('/:id/review', protect, validateReviewFlashcard, reviewFlashcard);
router.delete('/:id', protect, deleteFlashcard);

module.exports = router;
