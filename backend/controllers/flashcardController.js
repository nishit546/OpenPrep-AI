const { Op } = require('sequelize');
const fs = require('fs');
const Flashcard = require('../models/Flashcard');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Exam = require('../models/Exam');
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { YoutubeTranscript } = require('youtube-transcript');

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
}const { default: Exporter } = require('anki-apkg-export');
const { calculateSM2 } = require('../utils/sm2');
const { parseCSV, validateCSVHeaders } = require('../utils/csvParser');

// @desc    Generate AI Flashcards
// @route   POST /api/flashcards/generate-ai
// @access  Private
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
      notesText = notes
        .map((n) => n.content || '')
        .join('\n');
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

// @desc    Suggest AI tags & difficulty rating for a flashcard (not saved)
// @route   POST /api/flashcards/auto-tag
// @access  Private
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

// @desc    Preview AI-generated flashcards from a note's content (not saved)
// @route   POST /api/flashcards/generate-from-note
// @access  Private
exports.generateFlashcardsFromNote = async (req, res, next) => {  try {
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
      return res.status(400).json({ success: false, error: 'Please provide a valid YouTube video URL' });
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

    const transcriptText = (transcriptItems || []).map((item) => item.text).join(' ').trim();
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
      count || 6
    );

    res.status(200).json({
      success: true,
      count: cardsList.length,
      videoId,
      subjectId: subjectId || null,
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

// @desc    Create manual Flashcard// @route   POST /api/flashcards
// @access  Private
exports.createFlashcard = async (req, res, next) => {  try {
    const { subjectId, topicId, front, back, tags, difficulty } = req.body;
    const card = await Flashcard.create({
      user: req.user.id,
      subject: subjectId,
      topic: topicId || null,
      front,
      back,
      tags: tags || [],
      difficulty: difficulty || null,
    });    res.status(201).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
};

// @desc    Get flashcards for review (due cards)
// @route   GET /api/flashcards
// @access  Private
exports.getFlashcards = async (req, res, next) => {
  try {
    const { subjectId, dueOnly } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const filter = { user: req.user.id };

    if (subjectId) filter.subject = subjectId;
    if (dueOnly === 'true') {
      filter.nextReviewDate = { [Op.lte]: new Date() };
    }

    const { count: total, rows: cards } = await Flashcard.findAndCountAll({
      where: filter,
      distinct: true,
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
      ],
      order: [
        ['nextReviewDate', 'ASC'],
        ['createdAt', 'ASC'],
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

// @desc    Review a Flashcard (Update SM-2 variables)
// @route   PUT /api/flashcards/:id/review
// @access  Private
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
    let { interval, repetitions, efactor } = card;
    const easyFactorModifier = req.user.sm2EasyFactorModifier ?? 1.0;
    const intervalModifier = req.user.sm2IntervalModifier ?? 1.0;
    const step1Interval = req.user.sm2Step1Interval ?? 1;
    const step2Interval = req.user.sm2Step2Interval ?? 6;

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = step1Interval;
      } else if (repetitions === 1) {
        interval = step2Interval;
      } else {
        interval = Math.round(interval * efactor * intervalModifier);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = step1Interval;
    }

    // Adjust E-Factor
    const deltaEF = (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    efactor = efactor + deltaEF * easyFactorModifier;
    if (efactor < 1.3) efactor = 1.3;

    card.interval = result.interval;
    card.repetitions = result.repetitions;
    card.efactor = result.efactor;

    // Set next review date from now
    card.nextReviewDate = new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000);
    await card.save();

    // If card is mastered (quality >= 4), increment mastered count in progress
    // NOTE: progress entries are tracked both for topic-level flashcards (topic: id)
    //       AND subject-level flashcards (topic: null) — we no longer skip the latter.
    //       Progress row is atomically upserted via findOrCreate so rows are created
    //       dynamically even if user reviews cards before ever taking a quiz.
    if (quality >= 4) {
      const progressTopic = card.topic || null;
      const [progress] = await Progress.findOrCreate({
        where: {
          user: req.user.id,
          subject: card.subject,
          topic: progressTopic,
        },
        defaults: {
          user: req.user.id,
          subject: card.subject,
          topic: progressTopic,
          flashcardsMastered: 0,
          completionPercentage: 0,
          studyHours: 0,
        },
      });
      progress.flashcardsMastered += 1;
      await progress.save();
    }

    res.status(200).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
exports.deleteFlashcard = async (req, res, next) => {
  try {
    const card = await Flashcard.findOne({ where: { id: req.params.id, user: req.user.id } });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
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
      return res.status(400).json({ success: false, error: 'format must be "json", "csv", or "apkg"' });
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
      
      payload.forEach(c => {
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
      return res.status(400).json({ success: false, error: 'subjectId query parameter is required' });
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
    } else if (req.body && Array.isArray(req.body.cards)) {      // Raw JSON body fallback
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
      const hint = typeof hintRaw === 'string' && hintRaw.trim() ? hintRaw.trim().slice(0, 1000) : null;

      valid.push({
        user: req.user.id,
        subject: subject.id,
        topic: null,
        front,
        back,
        tags,
        hint,
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
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
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
        return res.status(400).json({ success: false, error: 'Cannot share an empty flashcard deck' });
      }

      // Automatically generate summary tags and description via Gemini AI
      const review = await geminiService.reviewFlashcardDeck(
        subject.name,
        cards.map(c => ({ front: c.front, back: c.back }))
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
    const { search, subject, exam, rating } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
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

    if (rating) {
      filter.rating = { [Op.gte]: parseFloat(rating) };
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
      order: [['cloneCount', 'DESC'], ['rating', 'DESC']],
    });

    // If filtering by exam specifically after loading relationships
    let filteredDecks = decks;
    if (exam) {
      filteredDecks = decks.filter(deck => 
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
      return res.status(404).json({ success: false, error: 'Flashcard deck not found or not public' });
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
      }
    });

    if (existingClone) {
      return res.status(400).json({
        success: false,
        error: 'You have already cloned this flashcard deck to your selected exam'
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
