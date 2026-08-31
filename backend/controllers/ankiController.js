const Flashcard = require('../models/Flashcard');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const FlashcardDeck = require('../models/FlashcardDeck');
const ankiPackageService = require('../services/ankiPackageService');
const clozeExtractionService = require('../services/clozeExtractionService');
const fs = require('fs');

/**
 * Import Anki .apkg file
 * @route POST /api/flashcards/anki/import
 */
exports.importAnkiPackage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an .apkg file.' });
    }

    const { subjectId, topicId } = req.body;
    let targetSubjectId = subjectId;

    // If no subject provided, find or create default Anki Import subject
    if (!targetSubjectId) {
      let defaultSubject = await Subject.findOne({
        where: { user: req.user.id, name: 'Anki Imports' },
      });
      if (!defaultSubject) {
        defaultSubject = await Subject.create({
          name: 'Anki Imports',
          description: 'Imported from Anki .apkg packages',
          user: req.user.id,
          exam: req.user.id, // Fallback exam
        });
      }
      targetSubjectId = defaultSubject.id;
    }

    // Read uploaded file buffer or path
    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const parsed = await ankiPackageService.parseAnkiPackage(fileBuffer);

    // Clean up uploaded disk file if multer saved to disk
    if (req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    const createdCards = [];
    for (const c of parsed.cards) {
      const card = await Flashcard.create({
        user: req.user.id,
        subject: targetSubjectId,
        topic: topicId || null,
        front: c.front,
        back: c.back,
        tags: c.tags || [],
        interval: c.interval || 1,
        repetitions: c.repetitions || 0,
        efactor: c.efactor || 2.5,
        difficulty: c.repetitions > 2 ? 'Easy' : 'Medium',
      });
      createdCards.push(card);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdCards.length} cards across ${parsed.decks.length} Anki decks.`,
      data: {
        totalCards: createdCards.length,
        decks: parsed.decks,
        mediaCount: parsed.stats.totalMedia,
        cards: createdCards.slice(0, 10), // Return preview of first 10
      },
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

/**
 * Export Flashcard Deck to Anki .apkg binary
 * @route GET /api/flashcards/anki/export/:subjectId
 */
exports.exportAnkiPackage = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findOne({
      where: { id: subjectId, user: req.user.id },
    });

    const cards = await Flashcard.findAll({
      where: { subject: subjectId, user: req.user.id },
    });

    if (!cards || cards.length === 0) {
      return res.status(404).json({ success: false, error: 'No flashcards found in this deck to export.' });
    }

    const deckName = subject ? subject.name : 'OpenPrep Deck';
    const apkgBuffer = await ankiPackageService.buildAnkiPackage(cards, deckName);

    const safeFilename = `${deckName.replace(/[^a-zA-Z0-9_-]/g, '_')}.apkg`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', apkgBuffer.length);

    res.send(apkgBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * AI Cloze Deletion Generator from Text
 * @route POST /api/flashcards/ai/generate-cloze
 */
exports.generateClozeFromText = async (req, res, next) => {
  try {
    const { text, count = 5, subjectName = 'General', subjectId, topicId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text content is required for cloze extraction.' });
    }

    const clozeCards = await clozeExtractionService.generateClozeCardsFromText(text, {
      count: parseInt(count, 10) || 5,
      subject: subjectName,
    });

    res.status(200).json({
      success: true,
      count: clozeCards.length,
      data: clozeCards,
    });
  } catch (error) {
    next(error);
  }
};
