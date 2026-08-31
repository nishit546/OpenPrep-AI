const { Op } = require('sequelize');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Flashcard = require('../models/Flashcard');const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Exam = require('../models/Exam');
const FlashcardDeck = require('../models/FlashcardDeck');
const DeckCollaborator = require('../models/DeckCollaborator');
const PodcastEpisode = require('../models/PodcastEpisode');
const audioPodcastService = require('../services/audioPodcastService');
const { calculateTopicProficiency, getDifficultyLevel } = require('../services/proficiencyService');
const remediationService = require('../services/remediationService');
const analyticsAggregationService = require('../services/analyticsAggregationService');const { checkAndAwardBadges } = require('../services/achievementService');
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Check if user has edit access to a deck (owner or edit/admin collaborator)
 */
async function checkDeckEditAccess(deckId, userId) {
  const deck = await FlashcardDeck.findOne({ where: { id: deckId } });
  if (!deck) return { hasAccess: false, reason: 'Deck not found' };

  // Owner has full access
  if (deck.user === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  // Check collaborator access
  const collaborator = await DeckCollaborator.findOne({
    where: { deckId, userId, status: 'accepted' },
  });

  if (!collaborator) {
    return { hasAccess: false, reason: 'Not a collaborator' };
  }

  // Only edit and admin roles can modify cards
  if (collaborator.role !== 'edit' && collaborator.role !== 'admin') {
    return { hasAccess: false, reason: 'Insufficient permissions' };
  }

  return { hasAccess: true, role: collaborator.role };
}

/**
 * Extract an 11-character YouTube video ID from common URL formats
 * (watch?v=, youtu.be/, embed/, shorts/).
 * @param {string} url
 * @returns {string|null}
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}
const { default: Exporter } = require('anki-apkg-export');
const { calculateSM2 } = require('../utils/sm2');
const { parseCSV, validateCSVHeaders } = require('../utils/csvParser');

/**
 * Largest offline batch accepted in one request.
 *
 * Kept well below the 10 KB `express.json` body limit set in server.js: at
 * roughly 100 bytes per review entry, 80 entries is ~8 KB, so a full batch
 * still fits with headroom instead of bouncing off the parser with a 413.
 */
const MAX_OFFLINE_SYNC_BATCH = 80;

/** Bounds a client-supplied card count to a sane range for AI generation. */
function clampCardCount(value, fallback = 6) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 20);
}

/**
 * Fold a new score into a deck's running average.
 *
 * Kept as a running mean over `ratingCount` rather than a re-aggregation of
 * every rating row: the deck list sorts and filters on `Subject.rating`, so
 * the value has to stay on the row itself.
 *
 * @returns {{ rating: number, ratingCount: number }} rounded to 2 decimals
 */
function foldRating(currentRating, currentCount, newStars) {
  const count = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
  const rating = Number.isFinite(currentRating) ? currentRating : 0;

  const nextCount = count + 1;
  const nextRating = (rating * count + newStars) / nextCount;

  return {
    rating: parseFloat(nextRating.toFixed(2)),
    ratingCount: nextCount,
  };
}

/**
 * @swagger
 * /api/flashcards/generate-ai:
 *   post:
 *     summary: Generate AI Flashcards for subject and topic using Gemini
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *             properties:
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               topicId:
 *                 type: string
 *                 format: uuid
 *               count:
 *                 type: integer
 *                 default: 6
 *     responses:
 *       201:
 *         description: AI flashcards generated and saved successfully
 */
exports.generateAIFlashcards = async (req, res, next) => {
  try {
    const { subjectId, topicId, count } = req.body;

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    let topicName = 'General overview';
    if (topicId) {
      const topicObj = await Topic.findByPk(topicId);
      if (topicObj) topicName = topicObj.name;
    }

    // Load notes for context (prioritize topic-specific notes if topicId provided, fallback to subject notes)
    const noteFilter = { subject: subjectId, user: req.user.id };
    if (topicId) {
      noteFilter.topic = topicId;
    }
    let notes = await Note.findAll({ where: noteFilter });
    if ((!notes || notes.length === 0) && topicId) {
      notes = await Note.findAll({ where: { subject: subjectId, user: req.user.id } });
    }
    let notesText = '';
    if (notes && notes.length > 0) {
      notesText = notes.map((n) => n.content || '').join('\n');
    }

    // Call Gemini
    const cardsList = await geminiService.generateFlashcards(
      subject.name,
      topicName,
      notesText,
      count || 6
    );

    const cardsToInsert = cardsList.map((card) => ({
      user: req.user.id,
      subject: subjectId,
      topic: topicId || null,
      front: card.front,
      back: card.back,
    }));
    const createdCards = await Flashcard.bulkCreate(cardsToInsert);

    // Log activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'flashcard_review',
      description: `Generated ${createdCards.length} AI flashcards for ${topicName}`,
    });

    res.status(201).json({ success: true, count: createdCards.length, data: createdCards });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards/auto-tag:
 *   post:
 *     summary: Suggest AI tags and difficulty rating for a flashcard
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tags suggested successfully
 */
exports.autoTagFlashcard = async (req, res, next) => {
  try {
    const { front, back } = req.body;

    const suggestion = await geminiService.generateFlashcardTags(front, back);

    res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards/generate-from-text:
 *   post:
 *     summary: Preview AI-generated flashcards from custom text
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flashcards preview generated successfully
 */
exports.generateFlashcardsFromText = async (req, res, next) => {
  try {
    const { subjectId, text, count } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required to generate flashcards',
      });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const subjectName = subject.name;
    const topicName = 'Extracted Content';

    const cardsList = await geminiService.generateFlashcards(
      subjectName,
      topicName,
      text,
      count || 6
    );

    res.status(200).json({
      success: true,
      count: cardsList.length,
      subjectId: subjectId,
      data: cardsList,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Preview AI-generated flashcards from a note's content (not saved)
// @route   POST /api/flashcards/generate-from-note
// @access  Private
exports.generateFlashcardsFromNote = async (req, res, next) => {
  try {
    const { noteId, count } = req.body;

    const note = await Note.findOne({
      where: { id: noteId, user: req.user.id },
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
      ],
    });

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (!note.content || note.content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note has no text content to generate flashcards from',
      });
    }

    const subjectName = note.subjectRef ? note.subjectRef.name : 'General';
    const topicName = note.topicRef ? note.topicRef.name : 'General overview';

    const cardsList = await geminiService.generateFlashcards(
      subjectName,
      topicName,
      note.content,
      count || 6
    );

    res.status(200).json({
      success: true,
      count: cardsList.length,
      subjectId: note.subjectRef ? note.subjectRef.id : note.subject,
      data: cardsList,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Extract a YouTube lecture transcript and preview AI-generated flashcards (not saved)
// @route   POST /api/flashcards/from-youtube
// @access  Private
exports.generateFlashcardsFromYouTube = async (req, res, next) => {
  try {
    const { youtubeUrl, subjectId, topicId, count } = req.body;

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      return res
        .status(400)
        .json({ success: false, error: 'Please provide a valid YouTube video URL' });
    }

    let transcriptItems;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      return res.status(422).json({
        success: false,
        error: 'Could not retrieve a transcript for this video. It may not have captions enabled.',
      });
    }

    const transcriptText = (transcriptItems || [])
      .map((item) => `[${Math.floor(item.offset / 1000)}s]: ${item.text}`)
      .join('\n')
      .trim();
    if (!transcriptText) {
      return res.status(422).json({
        success: false,
        error: 'This video does not appear to contain any educational transcript content',
      });
    }

    let subjectName = 'General';
    if (subjectId) {
      const subject = await Subject.findByPk(subjectId);
      if (subject) subjectName = subject.name;
    }

    let topicName = 'YouTube Lecture';
    if (topicId) {
      const topicObj = await Topic.findByPk(topicId);
      if (topicObj) topicName = topicObj.name;
    }

    const cardsList = await geminiService.generateFlashcards(
      subjectName,
      topicName,
      transcriptText,
      count || 6,
      false, // forceRefresh
      true // isYouTube
    );

    // Attach youtubeUrl to cards
    const annotatedCards = cardsList.map((c) => ({
      ...c,
      sourceUrl: youtubeUrl,
    }));

    res.status(200).json({
      success: true,
      count: annotatedCards.length,
      videoId,
      subjectId: subjectId || null,
      data: annotatedCards,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards:
 *   post:
 *     summary: Create a manual flashcard
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *               - subjectId
 *             properties:
 *               front:
 *                 type: string
 *               back:
 *                 type: string
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               topicId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Flashcard created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Flashcard'
 */
exports.createFlashcard = async (req, res, next) => {
  try {
    const { subjectId, topicId, deckId, front, back, tags, difficulty } = req.body;

    // Check deck access if creating card in a deck
    if (deckId) {
      const access = await checkDeckEditAccess(deckId, req.user.id);
      if (!access.hasAccess) {
        return res.status(403).json({ success: false, error: access.reason });
      }
    }

    const card = await Flashcard.create({
      user: req.user.id,
      subject: subjectId,
      topic: topicId || null,
      front,
      back,
      tags: tags || [],
      difficulty: difficulty || null,
    });

    // Issue #1053: Check for Card Collector badge
    const totalCreated = await Flashcard.count({ where: { user: req.user.id } });
    await checkAndAwardBadges(req.user.id, {
      type: 'FLASHCARD_CREATED',
      payload: { totalCreated },
    });

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards:
 *   get:
 *     summary: Retrieve flashcards for review or by subject
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: dueOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Flashcards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
exports.getFlashcards = async (req, res, next) => {
  try {
    const { subjectId, dueOnly, search } = req.query;
    
    if (req.query.page !== undefined && parseInt(req.query.page, 10) < 0) {
      return res.status(400).json({ success: false, error: 'Page cannot be negative' });
    }
    if (req.query.limit !== undefined && parseInt(req.query.limit, 10) <= 0) {
      return res.status(400).json({ success: false, error: 'Limit cannot be zero or negative' });
    }
    if (req.query.pageSize !== undefined && parseInt(req.query.pageSize, 10) <= 0) {
      return res.status(400).json({ success: false, error: 'Page size cannot be zero or negative' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || req.query.pageSize, 10) || 20));
    const offset = (page - 1) * limit;

    const filter = { user: req.user.id };

    if (subjectId) filter.subject = subjectId;
    if (dueOnly === 'true') {
      filter.nextReviewDate = { [Op.lte]: new Date() };
    }
    if (search) {
      filter[Op.or] = [
        { front: { [Op.iLike]: `%${search}%` } },
        { back: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const allowedSortFields = ['createdAt', 'nextReviewDate', 'front'];
    let sortBy = req.query.sortBy;
    if (!allowedSortFields.includes(sortBy)) sortBy = 'nextReviewDate';

    let order = (req.query.order || 'ASC').toUpperCase();
    if (order !== 'ASC' && order !== 'DESC') order = 'ASC';

    const { count: total, rows: cards } = await Flashcard.findAndCountAll({
      where: filter,
      distinct: true,
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
      ],
      order: [
        [sortBy, order],
        ['id', 'ASC'],
      ],
      offset,
      limit,
      subQuery: false,
    });

    const populatedCards = cards.map((c) => {
      const json = c.toJSON();
      json.subject = json.subjectRef;
      json.topic = json.topicRef;
      return json;
    });

    res.status(200).json({
      success: true,
      count: populatedCards.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: populatedCards,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards/{id}/review:
 *   put:
 *     summary: Submit a review for a flashcard (SuperMemo SM-2 calculation)
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quality
 *             properties:
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Recall quality rating (0=complete blackout, 5=perfect response)
 *     responses:
 *       200:
 *         description: Flashcard updated with next review date and SM-2 parameters
 *       400:
 *         description: Invalid quality rating
 *       404:
 *         description: Flashcard not found
 */
exports.reviewFlashcard = async (req, res, next) => {
  try {
    const { quality } = req.body; // quality rating: 0 to 5
    if (quality === undefined || quality < 0 || quality > 5) {
      return res
        .status(400)
        .json({ success: false, error: 'Provide a quality score between 0 and 5' });
    }
    const card = await Flashcard.findOne({ where: { id: req.params.id, user: req.user.id } });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    // SuperMemo SM-2 Algorithm with User customizable parameters
    const easyFactorModifier = req.user.sm2EasyFactorModifier ?? 1.0;
    const intervalModifier = req.user.sm2IntervalModifier ?? 1.0;
    const step1Interval = req.user.sm2Step1Interval ?? 1;
    const step2Interval = req.user.sm2Step2Interval ?? 6;

    const {
      interval: nextInterval,
      repetitions: nextRepetitions,
      efactor: nextEfactor,
    } = calculateSM2({
      interval: card.interval,
      repetitions: card.repetitions,
      efactor: card.efactor,
      quality,
      easyFactorModifier,
      intervalModifier,
      step1Interval,
      step2Interval,
    });

    card.interval = nextInterval;
    card.repetitions = nextRepetitions;
    card.efactor = nextEfactor;

    // Set next review date from now
    card.nextReviewDate = new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000);
    await card.save();

    // If card is mastered (quality >= 4), record it as a LearningEvent and
    // apply it to the Progress aggregate under a per-key lock. This is
    // idempotent (a retried request with the same reviewId is ignored) and
    // safe under concurrent reviews, including two reviews racing to create
    // the same Progress row for the first time.
    if (quality >= 4) {
      await analyticsAggregationService.recordFlashcardReviewEvent({
        userId: req.user.id,
        subject: card.subject,
        topic: card.topic || null,
        reviewId: uuidv4(),
        mastered: true,
      });
    }
    const gamificationService = require('../services/gamificationService');
    const progression = await gamificationService.awardXP(req.user.id, 30, 'flashcard_review');
    await gamificationService.awardCoins(req.user.id, 10, 'Flashcard review reward')
      .catch(err => console.error('Error awarding PrepCoins for flashcard review:', err));

    const timeZoneParam = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    await gamificationService.updateStreak(req.user.id, timeZoneParam);

    const user = await User.findByPk(req.user.id);
    const badgeDetails = req.headers['x-timezone']
      ? { timeZone: req.headers['x-timezone'] }
      : { timezoneOffsetMinutes: Number(req.headers['x-timezone-offset']) || 0 };
    const newBadges = await gamificationService.checkAndUnlockBadges(user, 'flashcard_review', badgeDetails);
    progression.newBadges = newBadges;

    res.status(200).json({ success: true, data: card, progression });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/flashcards/{id}:
 *   delete:
 *     summary: Delete a flashcard by ID
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Flashcard deleted successfully
 *       404:
 *         description: Flashcard not found
 */
exports.deleteFlashcard = async (req, res, next) => {
  try {
    const card = await Flashcard.findOne({ where: { id: req.params.id } });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    // Check if user owns the card or has deck edit access
    if (card.user !== req.user.id) {
      if (card.deckId) {
        const access = await checkDeckEditAccess(card.deckId, req.user.id);
        if (!access.hasAccess) {
          return res
            .status(403)
            .json({ success: false, error: 'Not authorized to delete this flashcard' });
        }
      } else {
        return res
          .status(403)
          .json({ success: false, error: 'Not authorized to delete this flashcard' });
      }
    }

    await card.destroy();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

/**
 * Escape a CSV field value: wrap in quotes if it contains comma, quote, or newline.
 * @param {string|null|undefined} val
 * @returns {string}
 */
function csvField(val) {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// @desc    Export flashcards as JSON or CSV
// @route   GET /api/flashcards/export?subjectId=...&format=json|csv
// @access  Private
exports.exportFlashcards = async (req, res, next) => {
  try {
    const { subjectId, format = 'json' } = req.query;

    if (!['json', 'csv', 'apkg'].includes(format)) {
      return res
        .status(400)
        .json({ success: false, error: 'format must be "json", "csv", or "apkg"' });
    }

    const filter = { user: req.user.id };
    if (subjectId) filter.subject = subjectId;

    const cards = await Flashcard.findAll({
      where: filter,
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['name'] },
        { model: Topic, as: 'topicRef', attributes: ['name'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    const payload = cards.map((c) => ({
      front: c.front,
      back: c.back,
      subject: c.subjectRef ? c.subjectRef.name : null,
      topic: c.topicRef ? c.topicRef.name : null,
      tags: Array.isArray(c.tags) ? c.tags.join(' ') : '',
      hint: c.hint || '',
    }));
    if (format === 'csv') {
      const header = 'front,back,subject,topic,tags,hint';
      const rows = payload.map(
        (p) =>
          `${csvField(p.front)},${csvField(p.back)},${csvField(p.subject)},${csvField(p.topic)},${csvField(p.tags)},${csvField(p.hint)}`
      );
      const csv = [header, ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="flashcards.csv"');
      return res.status(200).send(csv);
    }

    if (format === 'apkg') {
      const exporter = new Exporter('OpenPrep Flashcards');

      payload.forEach((c) => {
        const tags = [];
        if (c.subject) tags.push(c.subject.replace(/\s+/g, '_'));
        if (c.topic) tags.push(c.topic.replace(/\s+/g, '_'));

        // Add basic HTML formatting for cards
        const frontHtml = `<div style="text-align:center;font-size:24px;">${c.front}</div>`;
        const backHtml = `<div style="text-align:center;font-size:20px;">${c.back}</div>`;

        exporter.addCard(frontHtml, backHtml, { tags });
      });

      const zipBuffer = await exporter.save();

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="flashcards.apkg"');
      return res.status(200).send(zipBuffer);
    }

    // JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="flashcards.json"');
    return res.status(200).json({ success: true, count: payload.length, data: payload });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

// @desc    Import flashcards from CSV/JSON file or raw JSON body// @route   POST /api/flashcards/import
// @access  Private
exports.importFlashcards = async (req, res, next) => {
  try {
    const { subjectId } = req.query;

    if (!subjectId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, error: 'subjectId query parameter is required' });
    }

    const subject = await Subject.findOne({
      where: { id: subjectId, user: req.user.id },
    });
    if (!subject) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    let records = [];

    if (req.file) {
      // File upload path
      const raw = fs.readFileSync(req.file.path, 'utf8');
      fs.unlinkSync(req.file.path); // clean up immediately

      if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid JSON file' });
        }
        records = Array.isArray(parsed) ? parsed : parsed.data || [];
      } else {
        // CSV (supports standard Anki CSV exports, including their
        // leading "#"-prefixed metadata lines)
        records = parseCSV(raw);
        const csvError = validateCSVHeaders(records);
        if (csvError) {
          return res.status(400).json({ success: false, error: csvError });
        }
      }
    } else if (req.body && Array.isArray(req.body.cards)) {
      // Raw JSON body fallback
      records = req.body.cards;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide a CSV/JSON file via multipart upload or a JSON body with a "cards" array',
      });
    }

    // Validate and normalise records
    const valid = [];
    const invalid = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const front = typeof r.front === 'string' ? r.front.trim() : '';
      const back = typeof r.back === 'string' ? r.back.trim() : '';

      if (!front || !back) {
        invalid.push({ index: i, reason: 'front and back are required' });
        continue;
      }
      if (front.length > 5000 || back.length > 5000) {
        invalid.push({ index: i, reason: 'front/back must be at most 5000 characters' });
        continue;
      }

      // Tags: JSON imports may already provide an array; CSV/Anki exports
      // provide a single space-separated string (Anki's own tag convention).
      let tags = [];
      if (Array.isArray(r.tags)) {
        tags = r.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof r.tags === 'string' && r.tags.trim()) {
        tags = r.tags.trim().split(/\s+/);
      }

      const hintRaw = typeof r.hint === 'string' ? r.hint : r.hints;
      const hint =
        typeof hintRaw === 'string' && hintRaw.trim() ? hintRaw.trim().slice(0, 1000) : null;

      valid.push({
        user: req.user.id,
        subject: subject.id,
        topic: null,
        front,
        back,
        tags,
        hint,
        sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : null,
        timestampSeconds: typeof r.timestampSeconds === 'number' ? r.timestampSeconds : null,
      });
    }
    if (valid.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid flashcard records found in the provided data',
        invalid,
      });
    }

    const created = await Flashcard.bulkCreate(valid);

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'flashcard_review',
      description: `Imported ${created.length} flashcard(s) into subject "${subject.name}"`,
    });

    return res.status(201).json({
      success: true,
      imported: created.length,
      skipped: invalid.length,
      invalid,
      data: created,
    });
  } catch (error) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
    }
    next(error);
  }
};

// @desc    Get flashcard review forecast for next 30 days
// @route   GET /api/flashcards/forecast
// @access  Private
exports.getReviewForecast = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // We want to forecast the next 30 days starting from today.
    const forecast = [];
    const dateCounts = {};

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dateCounts[dateString] = 0;
      forecast.push({
        date: dateString,
        count: 0,
      });
    }

    // Query all flashcards for this user
    const cards = await Flashcard.findAll({
      where: {
        user: userId,
      },
      attributes: ['nextReviewDate'],
    });

    const todayStr = now.toISOString().split('T')[0];

    cards.forEach((card) => {
      if (!card.nextReviewDate) return;

      const cardDate = new Date(card.nextReviewDate);
      const cardDateStr = cardDate.toISOString().split('T')[0];

      if (cardDate <= now) {
        // Overdue cards are due today
        dateCounts[todayStr] = (dateCounts[todayStr] || 0) + 1;
      } else {
        if (dateCounts[cardDateStr] !== undefined) {
          dateCounts[cardDateStr]++;
        }
      }
    });

    const data = forecast.map((f) => ({
      date: f.date,
      count: dateCounts[f.date] || 0,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle public sharing status on a flashcard deck (Subject)
// @route   PUT /api/flashcards/decks/:subjectId/share
// @access  Private
exports.shareFlashcardDeck = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { isPublic } = req.body;

    const subject = await Subject.findOne({ where: { id: subjectId, user: req.user.id } });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Deck not found or access denied' });
    }

    if (isPublic) {
      const cards = await Flashcard.findAll({ where: { subject: subjectId } });
      if (!cards || cards.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Cannot share an empty flashcard deck' });
      }

      // Automatically generate summary tags and description via Gemini AI
      const review = await geminiService.reviewFlashcardDeck(
        subject.name,
        cards.map((c) => ({ front: c.front, back: c.back }))
      );

      subject.isPublic = true;
      subject.tags = JSON.stringify(review.tags || []);
      subject.description = review.description || subject.description;
      subject.rating = 4.5; // Initial rating for new shared decks
    } else {
      subject.isPublic = false;
    }

    await subject.save();

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'flashcard_review',
      description: `${isPublic ? 'Published' : 'Unpublished'} flashcard deck "${subject.name}" to community marketplace`,
    });

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all community published public flashcard decks
// @route   GET /api/flashcards/community
// @access  Private
exports.getCommunityDecks = async (req, res, next) => {
  try {
    const { search, subject, subjectId, exam, rating, sort } = req.query;

    if (req.query.page !== undefined && parseInt(req.query.page, 10) < 0) {
      return res.status(400).json({ success: false, error: 'Page cannot be negative' });
    }
    if (req.query.limit !== undefined && parseInt(req.query.limit, 10) <= 0) {
      return res.status(400).json({ success: false, error: 'Limit cannot be zero or negative' });
    }
    if (req.query.pageSize !== undefined && parseInt(req.query.pageSize, 10) <= 0) {
      return res.status(400).json({ success: false, error: 'Page size cannot be zero or negative' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || req.query.pageSize, 10) || 20));
    const offset = (page - 1) * limit;

    const filter = { isPublic: true };

    if (search) {
      filter[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } },
      ];
    }

    if (subject) {
      filter.name = { [Op.like]: `%${subject}%` };
    }

    if (subjectId) {
      filter.id = subjectId;
    }

    if (rating) {
      filter.rating = { [Op.gte]: parseFloat(rating) };
    }

    let order = [
      ['cloneCount', 'DESC'],
      ['rating', 'DESC'],
    ];
    if (sort === 'rating') {
      order = [
        ['rating', 'DESC'],
        ['cloneCount', 'DESC'],
      ];
    } else if (sort === 'newest') {
      order = [['createdAt', 'DESC']];
    }

    const { count: total, rows: decks } = await Subject.findAndCountAll({
      where: filter,
      distinct: true,
      include: [
        { model: User, as: 'userRef', attributes: ['id', 'name'] },
        { model: Exam, as: 'examRef', attributes: ['id', 'name'] },
      ],
      offset,
      limit,
      order,
    });

    // If filtering by exam specifically after loading relationships
    let filteredDecks = decks;
    if (exam) {
      filteredDecks = decks.filter(
        (deck) =>
          (deck.examRef && deck.examRef.name.toLowerCase().includes(exam.toLowerCase())) ||
          deck.exam === exam
      );
    }

    const formattedDecks = [];
    for (const deck of filteredDecks) {
      const cardCount = await Flashcard.count({ where: { subject: deck.id } });
      formattedDecks.push({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        isPublic: deck.isPublic,
        clonedFromId: deck.clonedFromId,
        cloneCount: deck.cloneCount,
        rating: deck.rating,
        tags: deck.tags ? JSON.parse(deck.tags) : [],
        cardCount,
        ownerName: deck.userRef ? deck.userRef.name : 'Peer Student',
        examName: deck.examRef ? deck.examRef.name : 'Competitive Exam',
      });
    }

    res.status(200).json({
      success: true,
      count: formattedDecks.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedDecks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clone a community flashcard deck to user's library
// @route   POST /api/flashcards/decks/:subjectId/clone
// @access  Private
exports.cloneCommunityDeck = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const sourceSubject = await Subject.findByPk(subjectId);
    if (!sourceSubject || (!sourceSubject.isPublic && sourceSubject.user !== req.user.id)) {
      return res
        .status(404)
        .json({ success: false, error: 'Flashcard deck not found or not public' });
    }

    // Resolve user's exam to place cloned subject under
    let targetExamId = req.body.examId;
    if (!targetExamId) {
      const activeExam = await Exam.findOne({ where: { user: req.user.id } });
      if (activeExam) {
        targetExamId = activeExam.id;
      } else {
        const defaultExam = await Exam.create({
          user: req.user.id,
          name: 'My Cloned Library',
        });
        targetExamId = defaultExam.id;
      }
    }

    // Check if user already has a deck cloned from this source to avoid duplicates
    const existingClone = await Subject.findOne({
      where: {
        user: req.user.id,
        clonedFromId: subjectId,
        exam: targetExamId,
      },
    });

    if (existingClone) {
      return res.status(400).json({
        success: false,
        error: 'You have already cloned this flashcard deck to your selected exam',
      });
    }

    // Create target cloned Subject/Deck
    const clonedSubject = await Subject.create({
      name: sourceSubject.name,
      description: sourceSubject.description,
      exam: targetExamId,
      user: req.user.id,
      clonedFromId: sourceSubject.id,
      tags: sourceSubject.tags,
    });

    // Copy all flashcards with default SM-2 values
    const sourceCards = await Flashcard.findAll({ where: { subject: subjectId } });
    if (sourceCards && sourceCards.length > 0) {
      const cardsToInsert = sourceCards.map((card) => ({
        user: req.user.id,
        subject: clonedSubject.id,
        topic: card.topic || null,
        front: card.front,
        back: card.back,
        interval: 1,
        repetitions: 0,
        efactor: 2.5,
        nextReviewDate: new Date(),
      }));
      await Flashcard.bulkCreate(cardsToInsert);
    }

    // Update clone count on the source deck
    sourceSubject.cloneCount = (sourceSubject.cloneCount || 0) + 1;
    await sourceSubject.save();

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'flashcard_review',
      description: `Cloned peer flashcard deck "${sourceSubject.name}" to personal library`,
    });

    res.status(201).json({ success: true, data: clonedSubject });
  } catch (error) {
    next(error);
  }
};

// @desc    Transcribe an uploaded lecture recording and preview flashcards from it
// @route   POST /api/flashcards/from-audio
// @access  Private
exports.generateFlashcardsFromAudio = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An audio recording is required to generate flashcards',
      });
    }

    const { subjectId } = req.body;
    const count = clampCardCount(req.body.count);

    const subject = await Subject.findOne({ where: { id: subjectId, user: req.user.id } });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const { transcription, summary } = await geminiService.transcribeAndSummarizeAudio(
      req.file.buffer,
      req.file.mimetype,
      subject.name
    );

    // Prefer the raw transcript: it carries the wording the student actually
    // heard. The summary is a lossy fallback for recordings Gemini could only
    // partially transcribe.
    const sourceText = (transcription || '').trim() || (summary || '').trim();
    if (!sourceText) {
      return res.status(422).json({
        success: false,
        error: 'The recording could not be transcribed. Try a clearer or louder recording.',
      });
    }

    const cardsList = await geminiService.generateFlashcards(
      subject.name,
      'Lecture Recording',
      sourceText,
      count
    );

    // Preview only — nothing is persisted until the user confirms the cards
    // in the modal and posts them back through the normal create endpoint.
    res.status(200).json({
      success: true,
      count: cardsList.length,
      subjectId: subject.id,
      transcription: transcription || '',
      summary: summary || '',
      data: cardsList,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Rate a public community deck (1-5 stars)
// @route   POST /api/flashcards/decks/:subjectId/rate
// @access  Private
exports.rateCommunityDeck = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    // The community modal posts `rating`; the deck preview posts `stars`.
    // Accept either rather than making one of the two existing callers wrong.
    const raw = req.body.rating !== undefined ? req.body.rating : req.body.stars;

    const stars = Number(raw);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res
        .status(400)
        .json({ success: false, error: 'Provide a star rating between 1 and 5' });
    }

    const deck = await Subject.findOne({ where: { id: subjectId } });
    if (!deck || !deck.isPublic) {
      return res.status(404).json({ success: false, error: 'Public community deck not found' });
    }

    if (deck.user && deck.user === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot rate your own deck' });
    }

    const { rating, ratingCount } = foldRating(deck.rating, deck.ratingCount, stars);

    deck.rating = rating;
    deck.ratingCount = ratingCount;
    await deck.save();

    res.status(200).json({
      success: true,
      data: { rating, ratingCount },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Star a public community deck
// @route   POST /api/flashcards/decks/:subjectId/star
// @access  Private
exports.starCommunityDeck = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const deck = await Subject.findOne({ where: { id: subjectId } });
    if (!deck || !deck.isPublic) {
      return res.status(404).json({ success: false, error: 'Public community deck not found' });
    }

    const current = Number.isFinite(deck.starCount) ? deck.starCount : 0;
    deck.starCount = current + 1;
    await deck.save();

    res.status(200).json({
      success: true,
      data: { starCount: deck.starCount },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply a batch of reviews recorded while the client was offline
// @route   POST /api/flashcards/batch-sync
// @access  Private
exports.batchSyncOfflineReviews = async (req, res, next) => {
  try {
    const reviews = req.body.reviews || req.body.batch || req.body;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Provide a non-empty array of offline reviews to sync',
      });
    }

    if (reviews.length > MAX_OFFLINE_SYNC_BATCH) {
      return res.status(400).json({
        success: false,
        error: `A batch may contain at most ${MAX_OFFLINE_SYNC_BATCH} reviews`,
      });
    }

    const easyFactorModifier = req.user.sm2EasyFactorModifier ?? 1.0;
    const intervalModifier = req.user.sm2IntervalModifier ?? 1.0;
    const step1Interval = req.user.sm2Step1Interval ?? 1;
    const step2Interval = req.user.sm2Step2Interval ?? 6;

    let synced = 0;
    let skipped = 0;
    const errors = [];

    // Sequential rather than Promise.all: two queued reviews of the *same*
    // card must compose in order, otherwise the second overwrites the first's
    // SM-2 state instead of building on it.
    for (const review of reviews) {
      const cardId = review.cardId || review.flashcardId;
      const rawScore = review.score ?? review.quality;
      const reviewedAt = review.reviewedAt || review.timestamp;

      const quality = Number(rawScore);
      if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
        skipped += 1;
        errors.push({ cardId: cardId || null, error: 'Score must be an integer between 0 and 5' });
        continue;
      }

      const card = await Flashcard.findOne({ where: { id: cardId, user: req.user.id } });
      if (!card) {
        skipped += 1;
        errors.push({ cardId: cardId || null, error: 'Flashcard not found' });
        continue;
      }

      const { interval, repetitions, efactor } = calculateSM2({
        interval: card.interval,
        repetitions: card.repetitions,
        efactor: card.efactor,
        quality,
        easyFactorModifier,
        intervalModifier,
        step1Interval,
        step2Interval,
      });

      card.interval = interval;
      card.repetitions = repetitions;
      card.efactor = efactor;

      // Schedule from when the review actually happened, not from now — an
      // hour-old offline review shouldn't push the next due date an hour out.
      const reviewedTimestamp = Date.parse(reviewedAt);
      const reviewedDate = Number.isNaN(reviewedTimestamp) ? Date.now() : reviewedTimestamp;
      card.nextReviewDate = new Date(reviewedDate + interval * 24 * 60 * 60 * 1000);

      await card.save();
      synced += 1;
    }

    res.status(200).json({
      success: true,
      data: { synced, skipped, errors },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI-Powered Cloze Deletion (Fill-in-the-Blank) Flashcards
// @route   POST /api/flashcards/generate-cloze
// @access  Private
exports.generateClozeFlashcards = async (req, res, next) => {
  try {
    const { extractClozeFlashcards } = require('../services/clozeExtractionService');
    const { text, maskDensity = 'Medium', maxCards = 10, subject } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid text payload. Minimum 10 characters required for cloze extraction.',
      });
    }

    const result = await extractClozeFlashcards({
      text,
      maskDensity,
      maxCards: parseInt(maxCards, 10) || 10,
      subject,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Queue/generate audio podcast episode for a flashcard deck
// @route   POST /api/flashcards/:deckId/generate-podcast
// @access  Private
exports.generateDeckPodcast = async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const { ambientTrack = 'lofi' } = req.body;

    let deck = await FlashcardDeck.findByPk(deckId);
    let cards = [];
    if (deck) {
      if (deck.user !== req.user.id && !deck.isPublic) {
        return res.status(403).json({ success: false, error: 'Not authorized to access this deck' });
      }
      cards = await Flashcard.findAll({ where: { deckId: deck.id } });
    } else {
      deck = await Subject.findByPk(deckId);
      if (deck) {
        if (deck.user !== req.user.id && !deck.isPublic) {
          return res.status(403).json({ success: false, error: 'Not authorized to access this subject/deck' });
        }
        cards = await Flashcard.findAll({ where: { subject: deck.id } });
      }
    }

    if (!deck) {
      return res.status(404).json({ success: false, error: 'Flashcard deck not found' });
    }

    if (!cards || cards.length === 0) {
      return res.status(400).json({ success: false, error: 'Flashcard deck has no flashcards to process' });
    }

    const episode = await audioPodcastService.generatePodcastForDeck(deck, cards, {
      userId: req.user.id,
      ambientTrack,
    });

    return res.status(201).json({
      success: true,
      data: episode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get podcast episode details with timestamped transcript
// @route   GET /api/flashcards/podcasts/:id
// @access  Private
exports.getPodcastEpisodeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const episode = await PodcastEpisode.findByPk(id);

    if (!episode) {
      return res.status(404).json({ success: false, error: 'Podcast episode not found' });
    }

    if (episode.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this podcast episode' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        durationSeconds: episode.durationSeconds,
        ambientTrack: episode.ambientTrack,
        status: episode.status,
        transcript: episode.transcript || [],
        createdAt: episode.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI flashcards from YouTube lecture video transcript
// @route   POST /api/flashcards/generate-from-youtube, POST /api/flashcards/from-youtube
// @access  Private
const { generateFromYoutube: youtubeGen } = require('./youtubeFlashcardController');
exports.generateFlashcardsFromYouTube = youtubeGen;

