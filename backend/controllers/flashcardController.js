const { Op } = require('sequelize');
const Flashcard = require('../models/Flashcard');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const Progress = require('../models/Progress');
const geminiService = require('../services/geminiService');

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

    // Load notes for context
    const notes = await Note.findAll({ where: { subject: subjectId, user: req.user.id } });
    let notesText = '';
    if (notes && notes.length > 0) {
      notesText = notes
        .map((n) => n.content || '')
        .join('\n')
        .substring(0, 5000);
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
    next(error);
  }
};

// @desc    Create manual Flashcard
// @route   POST /api/flashcards
// @access  Private
exports.createFlashcard = async (req, res, next) => {
  try {
    const { subjectId, topicId, front, back } = req.body;
    const card = await Flashcard.create({
      user: req.user.id,
      subject: subjectId,
      topic: topicId || null,
      front,
      back,
    });
    res.status(201).json({ success: true, data: card });
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
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
      ],
      offset,
      limit,
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

    // SuperMemo SM-2 Algorithm
    let { interval, repetitions, efactor } = card;

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * efactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    // Adjust E-Factor
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    card.interval = interval;
    card.repetitions = repetitions;
    card.efactor = efactor;

    // Set next review date from now
    card.nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    await card.save();

    // If card is mastered (quality >= 4), increment mastered count in progress
    if (quality >= 4 && card.topic) {
      const progress = await Progress.findOne({
        where: {
          user: req.user.id,
          subject: card.subject,
          topic: card.topic,
        },
      });
      if (progress) {
        progress.flashcardsMastered += 1;
        await progress.save();
      }
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
