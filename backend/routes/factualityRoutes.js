const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  verifyFlashcardContent,
  verifyExplanationContent,
  verifyBatchFlashcards,
  getVerificationReport,
  applyCorrection,
} = require('../controllers/factualityController');

router.post('/verify-flashcard', protect, verifyFlashcardContent);
router.post('/verify-explanation', protect, verifyExplanationContent);
router.post('/verify-batch', protect, verifyBatchFlashcards);
router.get('/report/:id', protect, getVerificationReport);
router.post('/apply-correction', protect, applyCorrection);

module.exports = router;
