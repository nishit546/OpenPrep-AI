const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
const Flashcard = require('../models/Flashcard');
const FlashcardDeck = require('../models/FlashcardDeck');
const Subject = require('../models/Subject');
const FlashcardMasterySnapshot = require('../models/FlashcardMasterySnapshot');
const FlashcardRevisionQuizModel = require('../models/FlashcardRevisionQuizModel');

// ── Constants ────────────────────────────────────────────────────────────

/** Ebbinghaus decay constant — higher = slower forgetting. */
const DECAY_CONSTANT = 0.5;

/** SM-2 defaults when card has never been reviewed. */
const SM2_DEFAULTS = {
  interval: 1,
  repetitions: 0,
  efactor: 2.5,
};

/** Mastery level thresholds based on interval and repetition count. */
const MASTERY_LEVELS = {
  NEW: { maxInterval: 0, maxReps: 0, label: 'New' },
  LEARNING: { maxInterval: 6, maxReps: 3, label: 'Learning' },
  YOUNG: { maxInterval: 20, maxReps: 10, label: 'Young' },
  MATURE: { maxInterval: Infinity, maxReps: 10, label: 'Mature' },
};

/** Retention buckets for distribution analysis. */
const RETENTION_BUCKETS = [
  { min: 0, max: 20, label: '0-20%' },
  { min: 20, max: 40, label: '20-40%' },
  { min: 40, max: 60, label: '40-60%' },
  { min: 60, max: 80, label: '60-80%' },
  { min: 80, max: 101, label: '80-100%' },
];

// ── Forgetting Curve ─────────────────────────────────────────────────────

/**
 * Compute the predicted retention of a single card after `daysSinceReview`
 * days, using a simplified Ebbinghaus forgetting curve model.
 *
 * R(t) = e^(-t / (S * DECAY_CONSTANT))
 *
 * where S = SM-2 stability factor derived from interval and efactor.
 *
 * @param {Object} card - Flashcard instance with interval, repetitions, efactor
 * @param {number} daysSinceReview - Days since last review
 * @returns {number} Predicted retention 0-100
 */
function predictRetention(card, daysSinceReview) {
  const interval = card.interval || SM2_DEFAULTS.interval;
  const efactor = card.efactor || SM2_DEFAULTS.efactor;
  const repetitions = card.repetitions || SM2_DEFAULTS.repetitions;

  // Stability grows with repetitions and efactor
  const stability = Math.max(1, interval * (efactor / 2.5) * (1 + repetitions * 0.1));
  const decayRate = DECAY_CONSTANT * stability;

  // Retention decays exponentially
  const retention = Math.exp(-daysSinceReview / decayRate) * 100;
  return Math.max(0, Math.min(100, Math.round(retention * 10) / 10));
}

/**
 * Generate a forgetting curve projection for a card over `forecastDays`.
 *
 * @param {Object} card
 * @param {number} forecastDays
 * @returns {Array<{ day: number, retentionPercent: number }>}
 */
function generateCardCurve(card, forecastDays = 14) {
  const curve = [];
  const baseDate = new Date();
  for (let day = 0; day <= forecastDays; day++) {
    curve.push({
      day,
      retentionPercent: predictRetention(card, day),
    });
  }
  return curve;
}

/**
 * Generate an aggregate forgetting curve across all of a user's cards.
 *
 * @param {Array} cards
 * @param {number} forecastDays
 * @returns {Array<{ day: number, retentionPercent: number }>}
 */
function generateAggregateCurve(cards, forecastDays = 14) {
  if (cards.length === 0) {
    return Array.from({ length: forecastDays + 1 }, (_, i) => ({
      day: i,
      retentionPercent: 0,
    }));
  }

  const curve = [];
  for (let day = 0; day <= forecastDays; day++) {
    const avgRetention =
      cards.reduce((sum, card) => sum + predictRetention(card, day), 0) / cards.length;
    curve.push({
      day,
      retentionPercent: Math.round(avgRetention * 10) / 10,
    });
  }
  return curve;
}

// ── Mastery Classification ───────────────────────────────────────────────

function classifyCard(card) {
  const interval = card.interval || 0;
  const reps = card.repetitions || 0;

  if (reps === 0) return 'new';
  if (interval < 7 || reps <= 3) return 'learning';
  if (interval < 21) return 'young';
  return 'mature';
}

function getMasteryBreakdown(cards) {
  const breakdown = {
    new: { count: 0, percentage: 0 },
    learning: { count: 0, percentage: 0 },
    young: { count: 0, percentage: 0 },
    mature: { count: 0, percentage: 0 },
  };

  for (const card of cards) {
    const level = classifyCard(card);
    breakdown[level].count += 1;
  }

  const total = cards.length || 1;
  for (const level of Object.keys(breakdown)) {
    breakdown[level].percentage = Math.round((breakdown[level].count / total) * 100);
  }

  return breakdown;
}

// ── Retention Distribution ───────────────────────────────────────────────

function getRetentionDistribution(cards) {
  const now = new Date();
  const distribution = {};

  for (const bucket of RETENTION_BUCKETS) {
    distribution[bucket.label] = 0;
  }

  for (const card of cards) {
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const retention = predictRetention(card, daysSinceReview);

    for (const bucket of RETENTION_BUCKETS) {
      if (retention >= bucket.min && retention < bucket.max) {
        distribution[bucket.label] += 1;
        break;
      }
    }
  }

  return distribution;
}

// ── Cards at Risk & Overdue ──────────────────────────────────────────────

function identifyAtRiskCards(cards, riskThreshold = 40) {
  const now = new Date();
  const atRisk = [];

  for (const card of cards) {
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const retention = predictRetention(card, daysSinceReview);

    if (retention < riskThreshold) {
      atRisk.push({
        cardId: card.id,
        front: (card.front || '').substring(0, 80),
        retention: Math.round(retention),
        daysSinceReview: Math.round(daysSinceReview),
        subject: card.subject,
      });
    }
  }

  return atRisk.sort((a, b) => a.retention - b.retention);
}

function identifyOverdueCards(cards) {
  const now = new Date();
  return cards.filter((card) => {
    if (!card.nextReviewDate) return false;
    return new Date(card.nextReviewDate) <= now;
  });
}

// ── Per-Deck/Subject Mastery ─────────────────────────────────────────────

async function computeDeckMastery(userId, cards) {
  const deckIds = [...new Set(cards.map((c) => c.deckId).filter(Boolean))];
  if (deckIds.length === 0) return {};

  const decks = await FlashcardDeck.findAll({
    where: { id: { [Op.in]: deckIds }, user: userId },
    attributes: ['id', 'name'],
  });

  const deckMap = {};
  decks.forEach((d) => { deckMap[d.id] = d.name; });

  const deckMastery = {};
  for (const card of cards) {
    const deckId = card.deckId || 'unassigned';
    if (!deckMastery[deckId]) {
      deckMastery[deckId] = {
        name: deckMap[deckId] || 'Unassigned',
        totalCards: 0,
        totalRetention: 0,
        totalInterval: 0,
        matureCount: 0,
      };
    }
    const now = new Date();
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const retention = predictRetention(card, daysSinceReview);

    deckMastery[deckId].totalCards += 1;
    deckMastery[deckId].totalRetention += retention;
    deckMastery[deckId].totalInterval += card.interval || 0;
    if (classifyCard(card) === 'mature') deckMastery[deckId].matureCount += 1;
  }

  // Compute scores
  for (const deckId of Object.keys(deckMastery)) {
    const d = deckMastery[deckId];
    d.retentionRate = d.totalCards > 0
      ? Math.round((d.totalRetention / d.totalCards) * 10) / 10
      : 0;
    d.averageInterval = d.totalCards > 0
      ? Math.round((d.totalInterval / d.totalCards) * 10) / 10
      : 0;
    d.masteryScore = d.totalCards > 0
      ? Math.round(((d.retentionRate / 100) * 0.6 + (d.matureCount / d.totalCards) * 0.4) * 100)
      : 0;
    delete d.totalRetention;
    delete d.totalInterval;
  }

  return deckMastery;
}

async function computeSubjectMastery(userId, cards) {
  const subjectIds = [...new Set(cards.map((c) => c.subject).filter(Boolean))];
  if (subjectIds.length === 0) return {};

  const subjects = await Subject.findAll({
    where: { id: { [Op.in]: subjectIds }, user: userId },
    attributes: ['id', 'name'],
  });

  const subjectMap = {};
  subjects.forEach((s) => { subjectMap[s.id] = s.name; });

  const subjectMastery = {};
  for (const card of cards) {
    const subjectId = card.subject || 'unassigned';
    if (!subjectMastery[subjectId]) {
      subjectMastery[subjectId] = {
        name: subjectMap[subjectId] || 'Unassigned',
        totalCards: 0,
        totalRetention: 0,
        totalInterval: 0,
      };
    }
    const now = new Date();
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const retention = predictRetention(card, daysSinceReview);

    subjectMastery[subjectId].totalCards += 1;
    subjectMastery[subjectId].totalRetention += retention;
    subjectMastery[subjectId].totalInterval += card.interval || 0;
  }

  for (const subjectId of Object.keys(subjectMastery)) {
    const s = subjectMastery[subjectId];
    s.retentionRate = s.totalCards > 0
      ? Math.round((s.totalRetention / s.totalCards) * 10) / 10
      : 0;
    s.averageInterval = s.totalCards > 0
      ? Math.round((s.totalInterval / s.totalCards) * 10) / 10
      : 0;
    delete s.totalRetention;
    delete s.totalInterval;
  }

  return subjectMastery;
}

// ── Review Efficiency ────────────────────────────────────────────────────

function computeReviewEfficiency(cards) {
  if (cards.length === 0) return 0;

  let alignmentScore = 0;
  const now = new Date();

  for (const card of cards) {
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const actualRetention = predictRetention(card, daysSinceReview);

    // Ideal: card should be reviewed when retention drops to ~80%
    // Efficiency = how close to 80% the card's predicted retention is
    // when reviewed at its scheduled interval
    const idealRetention = 80;
    const diff = Math.abs(actualRetention - idealRetention);
    alignmentScore += Math.max(0, 100 - diff);
  }

  return Math.round((alignmentScore / cards.length) * 10) / 10;
}

// ── Review Queue ─────────────────────────────────────────────────────────

function generateReviewQueue(cards, limit = 20) {
  const now = new Date();
  const queue = [];

  for (const card of cards) {
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    const retention = predictRetention(card, daysSinceReview);
    const isOverdue = card.nextReviewDate && new Date(card.nextReviewDate) <= now;

    queue.push({
      cardId: card.id,
      front: (card.front || '').substring(0, 100),
      retention: Math.round(retention),
      urgency: isOverdue ? 'overdue' : retention < 40 ? 'critical' : retention < 70 ? 'high' : 'normal',
      daysSinceReview: Math.round(daysSinceReview),
      subject: card.subject,
      deckId: card.deckId,
    });
  }

  // Sort: overdue first, then by lowest retention
  queue.sort((a, b) => {
    if (a.urgency === 'overdue' && b.urgency !== 'overdue') return -1;
    if (b.urgency === 'overdue' && a.urgency !== 'overdue') return 1;
    return a.retention - b.retention;
  });

  return queue.slice(0, limit);
}

// ── Recommendations ──────────────────────────────────────────────────────

function generateMasteryRecommendations(metrics) {
  const recs = [];

  if (metrics.cardsOverdue > 10) {
    recs.push({
      category: 'overdue',
      message: `You have ${metrics.cardsOverdue} overdue flashcards. Catch up today to maintain your streak.`,
      impact: 'high',
    });
  }

  if (metrics.newCards > metrics.totalCards * 0.5 && metrics.totalCards > 10) {
    recs.push({
      category: 'new_cards',
      message: 'More than half your cards are new. Focus on reviewing existing cards before adding more.',
      impact: 'high',
    });
  }

  if (metrics.overallRetentionRate < 60) {
    recs.push({
      category: 'retention',
      message: `Overall retention is ${metrics.overallRetentionRate}%. Consider shorter, more frequent review sessions.`,
      impact: 'high',
    });
  }

  if (metrics.averageInterval < 3 && metrics.totalReviews > 50) {
    recs.push({
      category: 'intervals',
      message: 'Your average review interval is very short. Try increasing intervals for cards you know well.',
      impact: 'medium',
    });
  }

  if (metrics.reviewStreak >= 7) {
    recs.push({
      category: 'streak',
      message: `Great ${metrics.reviewStreak}-day review streak! Keep it up for optimal long-term retention.`,
      impact: 'low',
    });
  }

  if (metrics.reviewEfficiency < 50) {
    recs.push({
      category: 'efficiency',
      message: 'Review efficiency is low — many cards are reviewed when retention is already very high or very low. Adjust intervals.',
      impact: 'medium',
    });
  }

  return recs;
}

// ── Snapshot Generation ──────────────────────────────────────────────────

async function generateMasterySnapshot(userId) {
  const cards = await Flashcard.findAll({
    where: { user: userId },
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Global metrics
  const totalCards = cards.length;
  const totalReviews = cards.reduce((sum, c) => sum + (c.repetitions || 0), 0);
  const averageInterval = totalCards > 0
    ? Math.round((cards.reduce((sum, c) => sum + (c.interval || 0), 0) / totalCards) * 10) / 10
    : 0;
  const averageEfactor = totalCards > 0
    ? Math.round((cards.reduce((sum, c) => sum + (c.efactor || SM2_DEFAULTS.efactor), 0) / totalCards) * 100) / 100
    : 2.5;

  // Retention rate across all cards
  let totalRetention = 0;
  for (const card of cards) {
    const lastReview = card.nextReviewDate
      ? new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000)
      : card.createdAt;
    const daysSinceReview = Math.max(0, (now - lastReview) / 86400000);
    totalRetention += predictRetention(card, daysSinceReview);
  }
  const overallRetentionRate = totalCards > 0
    ? Math.round((totalRetention / totalCards) * 10) / 10
    : 0;

  // Mastery breakdown
  const masteryBreakdown = getMasteryBreakdown(cards);
  const newCards = masteryBreakdown.new.count;
  const learningCards = masteryBreakdown.learning.count;
  const matureCards = masteryBreakdown.mature.count;

  // Forgetting curve
  const predictedForgettingCurve = generateAggregateCurve(cards, 14);
  const retentionDistribution = getRetentionDistribution(cards);

  // At-risk and overdue
  const atRiskCards = identifyAtRiskCards(cards, 40);
  const overdueCards = identifyOverdueCards(cards);

  // Per-deck and per-subject mastery
  const deckMastery = await computeDeckMastery(userId, cards);
  const subjectMastery = await computeSubjectMastery(userId, cards);

  // Review efficiency and queue
  const reviewEfficiency = computeReviewEfficiency(cards);
  const topCardsForReview = generateReviewQueue(cards, 20);

  // Review streak (simplified: count consecutive days with reviews based on nextReviewDate history)
  const reviewStreak = computeReviewStreak(cards);

  const metrics = {
    totalCards,
    reviewedToday: cards.filter((c) => {
      const lr = c.nextReviewDate
        ? new Date(c.nextReviewDate.getTime() - (c.interval || 1) * 86400000)
        : null;
      return lr && lr.toISOString().split('T')[0] === todayStr;
    }).length,
    reviewStreak,
    overallRetentionRate,
    averageInterval,
    averageEfactor,
    totalReviews,
    cardsAtRisk: atRiskCards.length,
    cardsOverdue: overdueCards.length,
  };

  const recommendations = generateMasteryRecommendations(metrics);

  const snapshot = await FlashcardMasterySnapshot.create({
    user: userId,
    snapshotDate: todayStr,
    ...metrics,
    predictedForgettingCurve,
    retentionDistribution,
    masteryBreakdown,
    newCards,
    learningCards,
    matureCards,
    deckMastery,
    subjectMastery,
    reviewEfficiency,
    topCardsForReview,
    recommendations,
  });

  return snapshot;
}

function computeReviewStreak(cards) {
  // Collect all review dates from card intervals
  const reviewDates = new Set();
  const now = new Date();

  for (const card of cards) {
    if (!card.nextReviewDate) continue;
    const lastReview = new Date(card.nextReviewDate.getTime() - (card.interval || 1) * 86400000);
    reviewDates.add(lastReview.toISOString().split('T')[0]);
  }

  const sortedDates = [...reviewDates].sort().reverse();
  let streak = 0;
  let checkDate = new Date(now);
  checkDate.setHours(0, 0, 0, 0);

  for (const dateStr of sortedDates) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dateStr === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < checkStr) {
      break;
    }
  }

  return streak;
}

// ── Query / Retrieval ────────────────────────────────────────────────────

async function getSnapshots(userId, { page = 1, limit = 10 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: snapshots } = await FlashcardMasterySnapshot.findAndCountAll({
    where: { user: userId },
    order: [['snapshotDate', 'DESC']],
    offset,
    limit,
  });

  return {
    snapshots,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getLatestSnapshot(userId) {
  return FlashcardMasterySnapshot.findOne({
    where: { user: userId },
    order: [['snapshotDate', 'DESC']],
  });
}

async function getSnapshotById(userId, snapshotId) {
  return FlashcardMasterySnapshot.findOne({
    where: { id: snapshotId, user: userId },
  });
}

async function deleteSnapshot(userId, snapshotId) {
  const snapshot = await FlashcardMasterySnapshot.findOne({
    where: { id: snapshotId, user: userId },
  });
  if (!snapshot) return false;
  await snapshot.destroy();
  return true;
}

// ── Dashboard ────────────────────────────────────────────────────────────

async function getDashboard(userId) {
  const [latestSnapshot, recentSnapshots, cards] = await Promise.all([
    getLatestSnapshot(userId),
    FlashcardMasterySnapshot.findAll({
      where: { user: userId },
      order: [['snapshotDate', 'DESC']],
      limit: 7,
      attributes: ['snapshotDate', 'overallRetentionRate', 'cardsOverdue', 'cardsAtRisk', 'totalCards', 'matureCards'],
    }),
    Flashcard.findAll({
      where: { user: userId },
      attributes: ['id', 'interval', 'repetitions', 'efactor', 'nextReviewDate', 'createdAt', 'subject', 'deckId', 'front'],
    }),
  ]);

  const trendData = recentSnapshots.reverse().map((s) => ({
    date: s.snapshotDate,
    retention: s.overallRetentionRate,
    overdue: s.cardsOverdue,
    atRisk: s.cardsAtRisk,
    totalCards: s.totalCards,
    matureCards: s.matureCards,
  }));

  // Live review queue
  const reviewQueue = generateReviewQueue(cards, 10);

  return {
    latestSnapshot,
    trendData,
    reviewQueue,
    summary: latestSnapshot
      ? {
          totalCards: latestSnapshot.totalCards,
          retentionRate: latestSnapshot.overallRetentionRate,
          overdue: latestSnapshot.cardsOverdue,
          atRisk: latestSnapshot.cardsAtRisk,
          matureCards: latestSnapshot.matureCards,
          reviewEfficiency: latestSnapshot.reviewEfficiency,
        }
      : null,
  };
}

// ── SM-2 Card Update Helper ──────────────────────────────────────────────

/**
 * Apply SM-2 algorithm to update a card's spaced repetition data
 * based on the user's quality of recall (0-5 scale).
 *
 * @param {Object} card - Flashcard instance
 * @param {number} quality - 0-5 (0=complete blackout, 5=perfect recall)
 * @returns {Object} Updated card fields
 */
function applySm2Update(card, quality) {
  const q = Math.max(0, Math.min(5, quality));
  let { interval, repetitions, efactor } = card;

  if (q >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response — reset
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor
  efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  efactor = Math.max(1.3, efactor);

  // Compute next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    interval,
    repetitions,
    efactor: Math.round(efactor * 100) / 100,
    nextReviewDate,
  };
}

// ── Exports ──────────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = {
  predictRetention,
  generateCardCurve,
  generateAggregateCurve,
  classifyCard,
  getMasteryBreakdown,
  getRetentionDistribution,
  identifyAtRiskCards,
  identifyOverdueCards,
  computeDeckMastery,
  computeSubjectMastery,
  computeReviewEfficiency,
  generateReviewQueue,
  generateMasteryRecommendations,
  generateMasterySnapshot,
  getSnapshots,
  getLatestSnapshot,
  getSnapshotById,
  deleteSnapshot,
  getDashboard,
  applySm2Update,
  DECAY_CONSTANT,
  MASTERY_LEVELS,
  RETENTION_BUCKETS,
  SM2_DEFAULTS,
  NotFoundError,
};
