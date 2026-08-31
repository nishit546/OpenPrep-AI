const flashcardMasteryService = require('../services/flashcardMasteryService');
const ActivityLog = require('../models/ActivityLog');
const Flashcard = require('../models/Flashcard');

// ── Snapshot Management ──────────────────────────────────────────────────

// @desc    Generate a new mastery snapshot
// @route   POST /api/flashcard-mastery/snapshots/generate
// @access  Private
exports.generateSnapshot = async (req, res, next) => {
  try {
    const snapshot = await flashcardMasteryService.generateMasterySnapshot(req.user.id);

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'mastery_snapshot_generated',
      description: `Generated flashcard mastery snapshot: ${snapshot.totalCards} cards, ${snapshot.overallRetentionRate}% retention`,
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all snapshots with pagination
// @route   GET /api/flashcard-mastery/snapshots
// @access  Private
exports.getSnapshots = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const result = await flashcardMasteryService.getSnapshots(req.user.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    res.status(200).json({
      success: true,
      count: result.snapshots.length,
      ...result.pagination,
      data: result.snapshots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single snapshot by ID
// @route   GET /api/flashcard-mastery/snapshots/:id
// @access  Private
exports.getSnapshot = async (req, res, next) => {
  try {
    const snapshot = await flashcardMasteryService.getSnapshotById(
      req.user.id,
      req.params.id,
    );

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }

    res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the latest snapshot
// @route   GET /api/flashcard-mastery/snapshots/latest
// @access  Private
exports.getLatestSnapshot = async (req, res, next) => {
  try {
    const snapshot = await flashcardMasteryService.getLatestSnapshot(req.user.id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'No mastery snapshots found. Generate one first.',
      });
    }

    res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a snapshot
// @route   DELETE /api/flashcard-mastery/snapshots/:id
// @access  Private
exports.deleteSnapshot = async (req, res, next) => {
  try {
    const deleted = await flashcardMasteryService.deleteSnapshot(
      req.user.id,
      req.params.id,
    );

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ── Dashboard ────────────────────────────────────────────────────────────

// @desc    Get flashcard mastery dashboard with trends and review queue
// @route   GET /api/flashcard-mastery/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await flashcardMasteryService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// ── Card Analysis ────────────────────────────────────────────────────────

// @desc    Get forgetting curve for a specific card
// @route   GET /api/flashcard-mastery/cards/:cardId/curve
// @access  Private
exports.getCardCurve = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { forecastDays } = req.query;

    const card = await Flashcard.findOne({
      where: { id: cardId, user: req.user.id },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    const curve = flashcardMasteryService.generateCardCurve(
      card,
      parseInt(forecastDays, 10) || 14,
    );

    res.status(200).json({
      success: true,
      data: {
        cardId: card.id,
        front: (card.front || '').substring(0, 100),
        interval: card.interval,
        efactor: card.efactor,
        repetitions: card.repetitions,
        curve,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the review queue (prioritised cards)
// @route   GET /api/flashcard-mastery/review-queue
// @access  Private
exports.getReviewQueue = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const cards = await Flashcard.findAll({
      where: { user: req.user.id },
      attributes: ['id', 'front', 'interval', 'repetitions', 'efactor', 'nextReviewDate', 'createdAt', 'subject', 'deckId'],
    });

    const queue = flashcardMasteryService.generateReviewQueue(
      cards,
      parseInt(limit, 10) || 20,
    );

    res.status(200).json({ success: true, count: queue.length, data: queue });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mastery breakdown for a user's cards
// @route   GET /api/flashcard-mastery/breakdown
// @access  Private
exports.getMasteryBreakdown = async (req, res, next) => {
  try {
    const cards = await Flashcard.findAll({
      where: { user: req.user.id },
      attributes: ['id', 'interval', 'repetitions', 'efactor'],
    });

    const breakdown = flashcardMasteryService.getMasteryBreakdown(cards);
    const distribution = flashcardMasteryService.getRetentionDistribution(cards);

    res.status(200).json({
      success: true,
      data: { breakdown, distribution, totalCards: cards.length },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SM-2 update preview for a card
// @route   POST /api/flashcard-mastery/cards/:cardId/sm2-preview
// @access  Private
exports.sm2Preview = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { quality } = req.body;

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({
        success: false,
        error: 'quality must be a number between 0 and 5',
      });
    }

    const card = await Flashcard.findOne({
      where: { id: cardId, user: req.user.id },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    const updatedFields = flashcardMasteryService.applySm2Update(card, quality);

    res.status(200).json({
      success: true,
      data: {
        cardId: card.id,
        current: {
          interval: card.interval,
          efactor: card.efactor,
          repetitions: card.repetitions,
          nextReviewDate: card.nextReviewDate,
        },
        predicted: updatedFields,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Insights ─────────────────────────────────────────────────────────────

// @desc    Get mastery insights and recommendations
// @route   GET /api/flashcard-mastery/insights
// @access  Private
exports.getInsights = async (req, res, next) => {
  try {
    const snapshot = await flashcardMasteryService.getLatestSnapshot(req.user.id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'No mastery data available. Generate a snapshot first.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations: snapshot.recommendations || [],
        topCardsForReview: snapshot.topCardsForReview || [],
        deckMastery: snapshot.deckMastery || {},
        subjectMastery: snapshot.subjectMastery || {},
        snapshotDate: snapshot.snapshotDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregate forgetting curve across all cards
// @route   GET /api/flashcard-mastery/forgetting-curve
// @access  Private
exports.getForgettingCurve = async (req, res, next) => {
  try {
    const { forecastDays } = req.query;

    const cards = await Flashcard.findAll({
      where: { user: req.user.id },
      attributes: ['id', 'interval', 'repetitions', 'efactor', 'nextReviewDate', 'createdAt'],
    });

    const curve = flashcardMasteryService.generateAggregateCurve(
      cards,
      parseInt(forecastDays, 10) || 14,
    );

    res.status(200).json({
      success: true,
      data: { curve, totalCards: cards.length },
    });
  } catch (error) {
    next(error);
  }
};
