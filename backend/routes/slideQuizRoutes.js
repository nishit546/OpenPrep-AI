/**
 * @fileoverview API routes for Lecture Slide to Interactive Quiz Converter.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const slideQuizController = require('../controllers/slideQuizController');

// Configure multer for memory storage (max 20MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and PPTX are allowed.'), false);
    }
  }
});

/**
 * @route   POST /api/slide-quiz/generate
 * @desc    Upload a slide document and generate interactive quizzes per slide
 * @access  Private
 */
router.post('/generate', upload.single('document'), slideQuizController.generateQuiz);

/**
 * @route   POST /api/slide-quiz/export
 * @desc    Export generated slide questions to the user's main flashcard deck
 * @access  Private
 */
router.post('/export', slideQuizController.exportToFlashcards);

module.exports = router;
