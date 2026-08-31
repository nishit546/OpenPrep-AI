/**
 * @fileoverview Spaced Repetition Analytics Service.
 * Calculates 5-tier Leitner Box distribution and 30-Day SM-2 Review Load Forecast projections.
 */
const { Op } = require('sequelize');
const Flashcard = require('../models/Flashcard');

/**
 * Calculates Leitner Box stage (1 to 5) for a given flashcard.
 * @param {Object} card - Flashcard model instance or object.
 * @returns {number} Box number from 1 (Daily) to 5 (Monthly / Mastered).
 */
function getLeitnerBoxNumber(card) {
  const interval = card.interval || 0;
  const reps = card.repetitions || 0;

  if (reps === 0 || interval <= 1) return 1;
  if (interval <= 4) return 2;
  if (interval <= 10) return 3;
  if (interval <= 21) return 4;
  return 5;
}

/**
 * Retrieves the 5-Tier Leitner Box distribution for a user's flashcards.
 * @param {string} userId - UUID of the user.
 * @param {string} [deckId] - Optional deck/subject filter.
 * @returns {Promise<Object>} Distribution metrics object.
 */
async function getLeitnerDistribution(userId, deckId = null) {
  const whereClause = { user: userId };
  if (deckId) {
    whereClause[Op.or] = [{ subject: deckId }, { deckId: deckId }];
  }

  const cards = await Flashcard.findAll({
    where: whereClause,
    attributes: ['id', 'front', 'back', 'interval', 'repetitions', 'efactor', 'nextReviewDate', 'subject', 'deckId'],
    order: [['nextReviewDate', 'ASC']],
  });

  const totalCards = cards.length;
  const now = new Date();

  const boxData = {
    1: { id: 1, label: 'Box 1: Daily', frequency: 'Daily', intervalDays: 1, color: 'rose', count: 0, dueCount: 0, cards: [] },
    2: { id: 2, label: 'Box 2: 3 Days', frequency: 'Every 3 Days', intervalDays: 3, color: 'amber', count: 0, dueCount: 0, cards: [] },
    3: { id: 3, label: 'Box 3: Weekly', frequency: 'Weekly', intervalDays: 7, color: 'yellow', count: 0, dueCount: 0, cards: [] },
    4: { id: 4, label: 'Box 4: Bi-Weekly', frequency: 'Bi-Weekly', intervalDays: 14, color: 'indigo', count: 0, dueCount: 0, cards: [] },
    5: { id: 5, label: 'Box 5: Mastered', frequency: 'Monthly', intervalDays: 30, color: 'emerald', count: 0, dueCount: 0, cards: [] },
  };

  cards.forEach((card) => {
    const boxNum = getLeitnerBoxNumber(card);
    const box = boxData[boxNum];
    box.count += 1;

    const isDue = card.nextReviewDate ? new Date(card.nextReviewDate) <= now : true;
    if (isDue) {
      box.dueCount += 1;
    }

    if (box.cards.length < 5) {
      box.cards.push({
        id: card.id,
        front: card.front,
        interval: card.interval,
        repetitions: card.repetitions,
        nextReviewDate: card.nextReviewDate,
        isDue,
      });
    }
  });

  const boxes = Object.values(boxData).map((box) => ({
    ...box,
    percentage: totalCards > 0 ? Math.round((box.count / totalCards) * 100) : 0,
  }));

  return {
    totalCards,
    totalDueToday: boxes.reduce((sum, b) => sum + b.dueCount, 0),
    boxes,
  };
}

/**
 * Computes a 30-day review load forecasting projection based on SM-2 scheduled review dates.
 * @param {string} userId - UUID of the user.
 * @param {string} [deckId] - Optional deck/subject filter.
 * @returns {Promise<Object>} 30-day forecast projection object.
 */
async function get30DayReviewForecast(userId, deckId = null) {
  const whereClause = { user: userId };
  if (deckId) {
    whereClause[Op.or] = [{ subject: deckId }, { deckId: deckId }];
  }

  const cards = await Flashcard.findAll({
    where: whereClause,
    attributes: ['id', 'nextReviewDate', 'interval', 'repetitions'],
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Array of 30 days
  const forecastMap = new Map();
  for (let d = 0; d < 30; d++) {
    const targetDate = new Date(todayStart);
    targetDate.setDate(todayStart.getDate() + d);
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    forecastMap.set(dateStr, {
      date: dateStr,
      dayLabel,
      dayIndex: d,
      dueCount: 0,
      overdueCount: 0,
      cards: [],
    });
  }

  cards.forEach((card) => {
    const reviewDate = card.nextReviewDate ? new Date(card.nextReviewDate) : todayStart;
    const reviewDayStart = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());

    const diffDays = Math.floor((reviewDayStart - todayStart) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // Overdue or due today -> assign to Day 0
      const day0Str = todayStart.toISOString().split('T')[0];
      if (forecastMap.has(day0Str)) {
        const entry = forecastMap.get(day0Str);
        entry.dueCount += 1;
        if (diffDays < 0) entry.overdueCount += 1;
      }
    } else if (diffDays < 30) {
      const dateStr = reviewDayStart.toISOString().split('T')[0];
      if (forecastMap.has(dateStr)) {
        const entry = forecastMap.get(dateStr);
        entry.dueCount += 1;
      }
    }
  });

  const forecast = Array.from(forecastMap.values()).map((day) => {
    let status = 'light';
    if (day.dueCount > 30) {
      status = 'heavy';
    } else if (day.dueCount > 15) {
      status = 'moderate';
    }

    return {
      ...day,
      status,
    };
  });

  // Calculate summary metrics
  let totalDueNext30Days = 0;
  let heavyWorkloadDaysCount = 0;
  let peakDay = { date: '', dayLabel: '', count: 0 };

  forecast.forEach((day) => {
    totalDueNext30Days += day.dueCount;
    if (day.status === 'heavy') heavyWorkloadDaysCount++;
    if (day.dueCount > peakDay.count) {
      peakDay = { date: day.date, dayLabel: day.dayLabel, count: day.dueCount };
    }
  });

  const averageDailyLoad = Math.round((totalDueNext30Days / 30) * 10) / 10;

  return {
    totalCards: cards.length,
    totalDueNext30Days,
    averageDailyLoad,
    heavyWorkloadDaysCount,
    peakDay,
    forecast,
  };
}

module.exports = {
  getLeitnerBoxNumber,
  getLeitnerDistribution,
  get30DayReviewForecast,
};
