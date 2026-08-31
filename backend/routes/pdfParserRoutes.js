const express = require('express');
const { protect } = require('../middleware/auth');
const flashcardUpload = require('../middleware/flashcardUpload');
const {
  inspectPdfToc,
  splitPdfChapters,
} = require('../controllers/pdfParserController');

const router = express.Router();

// PDF TOC Inspection & Splitting (#2077)
router.post('/inspect-toc', protect, flashcardUpload.single('file'), inspectPdfToc);
router.post('/split-chapters', protect, flashcardUpload.single('file'), splitPdfChapters);

module.exports = router;
