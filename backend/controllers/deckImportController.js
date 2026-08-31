/**
 * @fileoverview Controller for handling flashcard deck imports and validation.
 */
const deckImporterService = require('../services/deckImporterService');
// const Flashcard = require('../models/Flashcard');

/**
 * Parses an uploaded file and returns a preview of the normalized flashcards.
 */
const previewImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A file is required for import.' });
        }

        let parsedCards = [];
        const mimetype = req.file.mimetype;

        if (mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            parsedCards = await deckImporterService.parseCSV(req.file.buffer);
        } else if (mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
            parsedCards = await deckImporterService.parseJSON(req.file.buffer);
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported file format. Please use CSV or JSON.' });
        }

        if (parsedCards.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid flashcards found in the file.' });
        }

        // Mock existing cards for duplicate detection
        const mockExistingFronts = new Set(['What is the capital of France?']);
        const { uniqueCards, duplicateCount } = deckImporterService.removeDuplicates(parsedCards, mockExistingFronts);

        res.status(200).json({
            success: true,
            data: {
                totalParsed: parsedCards.length,
                uniqueCards: uniqueCards.slice(0, 5), // Preview first 5
                duplicateCount,
                importToken: `token_${Date.now()}` // In production, store parsed data in Redis/DB temporarily
            }
        });
    } catch (error) {
        console.error('Error previewing import:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

/**
 * Finalizes the import and bulk-inserts the flashcards.
 */
const finalizeImport = async (req, res) => {
    try {
        const { importToken, deckName } = req.body;
        // const userId = req.user.id;

        if (!importToken) {
            return res.status(400).json({ success: false, message: 'Valid import token is required.' });
        }

        // Mock bulk insertion
        // await Flashcard.bulkCreate(parsedCardsWithUserIdAndDeckName);

        res.status(201).json({
            success: true,
            message: `Successfully imported flashcards to deck: ${deckName || 'Imported Deck'}`
        });
    } catch (error) {
        console.error('Error finalizing import:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    previewImport,
    finalizeImport,
};
