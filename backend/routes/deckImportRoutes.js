/**
 * @fileoverview API routes for Automated Flashcard Deck Importer.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const deckImportController = require('../controllers/deckImportController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/json' || file.originalname.match(/\.(csv|json)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and JSON files are allowed.'), false);
        }
    }
});

/**
 * @route   POST /api/deck-import/preview
 * @desc    Parse uploaded file and return a preview of normalized flashcards
 * @access  Private
 */
router.post('/preview', upload.single('file'), deckImportController.previewImport);

/**
 * @route   POST /api/deck-import/finalize
 * @desc    Finalize the import and bulk-insert flashcards into the user's library
 * @access  Private
 */
router.post('/finalize', deckImportController.finalizeImport);

module.exports = router;
