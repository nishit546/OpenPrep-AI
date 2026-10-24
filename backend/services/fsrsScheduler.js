/**
 * @fileoverview Free Spaced Repetition Scheduler (FSRS v4) Algorithm
 * Implements the DSR (Difficulty, Stability, Retrievability) mathematical model
 * based on FSRS v4 parameter optimization.
 */

const FACTOR = 19.0 / 81.0; // 0.23456790123...
const DECAY = -0.5;

/**
 * Standard FSRS v4 Default Parameter Weights (w0 through w16)
 */
const DEFAULT_PARAMETERS = [
  0.4,   // w[0]: S0(Again)
  0.6,   // w[1]: S0(Hard)
  2.4,   // w[2]: S0(Good)
  5.8,   // w[3]: S0(Easy)
  4.93,  // w[4]: D0 base difficulty
  0.94,  // w[5]: D0 modifier
  0.86,  // w[6]: D transition factor
  0.01,  // w[7]: D mean reversion weight
  1.49,  // w[8]: S_recall base
  0.14,  // w[9]: S_recall S decay power
  0.94,  // w[10]: S_recall R factor
  2.18,  // w[11]: S_forget base
  0.05,  // w[12]: S_forget D power
  0.34,  // w[13]: S_forget S power
  1.26,  // w[14]: S_forget R factor
  0.29,  // w[15]: Hard penalty
  2.61,  // w[16]: Easy bonus
];

const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
};

const State = {
  New: 'new',
  Learning: 'learning',
  Review: 'review',
  Relearning: 'relearning',
};

/**
 * Calculates retrievability R(t, S) = (1 + FACTOR * (t / S))^DECAY
 *
 * @param {number} elapsedDays - Time in days since last review
 * @param {number} stability - Card memory stability in days
 * @returns {number} Probability of recall between 0.0 and 1.0
 */
function calculateRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0.0;
  if (elapsedDays <= 0) return 1.0;
  const factorRatio = (FACTOR * elapsedDays) / stability;
  const r = Math.pow(1 + factorRatio, DECAY);
  return Math.max(0.0, Math.min(1.0, r));
}

/**
 * Calculates next review interval in days given target retention r and stability S.
 * I(r, S) = (S / FACTOR) * (r^(1/DECAY) - 1)
 *
 * @param {number} requestedRetention - Target retention (e.g. 0.90 for 90%)
 * @param {number} stability - Current card stability in days
 * @returns {number} Interval in days
 */
function calculateInterval(requestedRetention = 0.90, stability) {
  const r = Math.max(0.70, Math.min(0.99, requestedRetention));
  const s = Math.max(0.1, stability);
  // (r^(1 / -0.5) - 1) = (r^-2 - 1)
  const power = Math.pow(r, 1.0 / DECAY) - 1.0;
  const interval = (s / FACTOR) * power;
  return Math.max(1, Math.round(interval));
}

/**
 * Clamps a difficulty score between 1.0 and 10.0.
 */
function clampDifficulty(d) {
  return Math.max(1.0, Math.min(10.0, d));
}

/**
 * Maps legacy 0-5 quality to FSRS 1-4 rating.
 * 0, 1 -> 1 (Again)
 * 2, 3 -> 2 (Hard)
 * 4    -> 3 (Good)
 * 5    -> 4 (Easy)
 */
function mapQualityToRating(quality) {
  const q = Number(quality);
  if (q <= 1) return Rating.Again;
  if (q <= 3) return Rating.Hard;
  if (q === 4) return Rating.Good;
  return Rating.Easy;
}

/**
 * Converts legacy SM-2 flashcard parameters to initial FSRS v4 DSR values.
 *
 * @param {object} params
 * @param {number} [params.efactor=2.5]
 * @param {number} [params.interval=1]
 * @param {number} [params.repetitions=0]
 * @returns {{ stability: number, difficulty: number, reps: number, lapses: number, state: string, elapsedDays: number, scheduledDays: number }}
 */
function convertSM2ToFSRS({ efactor = 2.5, interval = 1, repetitions = 0 } = {}) {
  const ef = Math.max(1.3, Math.min(3.0, Number(efactor) || 2.5));
  // Higher efactor means lower difficulty
  const difficulty = clampDifficulty(11.0 - ef * 3.0);
  const stability = Math.max(0.1, Number(interval) || 1.0);
  const reps = Math.max(0, Number(repetitions) || 0);
  const lapses = reps > 0 && interval <= 1 ? 1 : 0;
  const state = reps === 0 ? State.New : (lapses > 0 ? State.Relearning : State.Review);

  return {
    stability,
    difficulty,
    reps,
    lapses,
    state,
    elapsedDays: Math.max(0, Number(interval) || 1),
    scheduledDays: Math.max(1, Number(interval) || 1),
  };
}

/**
 * Core FSRS v4 scheduler transition.
 *
 * @param {object} card - Flashcard object or state
 * @param {number} rating - 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 * @param {number} [requestedRetention=0.90] - Desired retention rate (default: 0.90)
 * @param {number} [elapsedDaysOverride=null] - Optional elapsed days
 * @param {number[]} [weights=DEFAULT_PARAMETERS]
 * @returns {object} Updated card scheduling state
 */
function calculateFSRS(
  card = {},
  rating,
  requestedRetention = 0.90,
  elapsedDaysOverride = null,
  weights = DEFAULT_PARAMETERS
) {
  const G = Number(rating);
  if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(G)) {
    throw new Error('FSRS Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)');
  }

  // Read or migrate current state
  let stability = Number(card.stability);
  let difficulty = Number(card.difficulty ?? card.fsrsDifficulty);
  let reps = Number(card.reps ?? card.repetitions ?? 0);
  let lapses = Number(card.lapses ?? 0);
  let state = card.state || (reps === 0 ? State.New : State.Review);

  // Fallback migration if card only had SM-2 fields
  if (isNaN(stability) || isNaN(difficulty)) {
    const migrated = convertSM2ToFSRS({
      efactor: card.efactor ?? 2.5,
      interval: card.interval ?? 1,
      repetitions: card.repetitions ?? 0,
    });
    stability = isNaN(stability) ? migrated.stability : stability;
    difficulty = isNaN(difficulty) ? migrated.difficulty : difficulty;
    reps = migrated.reps;
    lapses = migrated.lapses;
    state = migrated.state;
  }

  // Calculate elapsed days since last review
  let elapsedDays = elapsedDaysOverride;
  if (elapsedDays === null || elapsedDays === undefined) {
    if (card.lastReviewedAt || card.updatedAt) {
      const lastDate = new Date(card.lastReviewedAt || card.updatedAt).getTime();
      elapsedDays = Math.max(0, Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)));
    } else {
      elapsedDays = card.elapsedDays || 0;
    }
  }

  let newStability;
  let newDifficulty;
  let nextState;

  // 1. First Review (New Card)
  if (state === State.New || reps === 0) {
    newStability = weights[G - 1]; // S0(G)
    newDifficulty = clampDifficulty(weights[4] - (G - 3) * weights[5]); // D0(G)
    nextState = G === Rating.Again ? State.Learning : State.Review;
    if (G === Rating.Again) lapses += 1;
  } else {
    // 2. Subsequent Review
    const r = calculateRetrievability(elapsedDays, stability);

    // Calculate updated difficulty D'
    const nextD = difficulty - weights[6] * (G - 3);
    newDifficulty = clampDifficulty(weights[7] * weights[4] + (1 - weights[7]) * nextD);

    if (G === Rating.Again) {
      // Lapse / Recall Failure
      const forgetBase = weights[11];
      const dFactor = Math.pow(difficulty, -weights[12]);
      const sFactor = Math.pow(stability + 1, weights[13]) - 1;
      const rFactor = Math.exp((1 - r) * weights[14]);
      newStability = Math.max(0.1, forgetBase * dFactor * sFactor * rFactor);
      lapses += 1;
      nextState = State.Relearning;
    } else {
      // Successful Recall (Hard, Good, Easy)
      const hardPenalty = G === Rating.Hard ? weights[15] : 1.0;
      const easyBonus = G === Rating.Easy ? weights[16] : 1.0;
      const recallBase = Math.exp(weights[8]);
      const dFactor = 11 - difficulty;
      const sFactor = Math.pow(stability, -weights[9]);
      const rFactor = Math.exp((1 - r) * weights[10]) - 1;

      const stabilityRecall = stability * (1 + recallBase * dFactor * sFactor * rFactor * hardPenalty * easyBonus);
      newStability = Math.max(0.1, stabilityRecall);
      nextState = State.Review;
    }
  }

  reps += 1;
  const nextInterval = G === Rating.Again ? 1 : calculateInterval(requestedRetention, newStability);
  const retrievability = calculateRetrievability(elapsedDays, newStability);
  const nextReviewDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    stability: Number(newStability.toFixed(4)),
    difficulty: Number(newDifficulty.toFixed(2)),
    interval: nextInterval,
    scheduledDays: nextInterval,
    elapsedDays,
    reps,
    lapses,
    state: nextState,
    retrievability: Number(retrievability.toFixed(4)),
    nextReviewDate,
  };
}

/**
 * Formats review interval for UI presentation (e.g., '10m', '2d', '6d', '14d', '2mo').
 *
 * @param {number} days
 * @param {number} rating
 * @returns {string}
 */
function formatInterval(days, rating) {
  if (rating === Rating.Again) {
    return '10m';
  }
  if (days <= 0) return '10m';
  if (days === 1) return '1d';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Predicts upcoming intervals for all 4 response ratings for real-time UI button badges.
 *
 * @param {object} card - Flashcard object or state
 * @param {number} [requestedRetention=0.90] - Target retention rate
 * @returns {object} Intervals keyed by again, hard, good, easy
 */
function calculateUpcomingIntervals(card, requestedRetention = 0.90) {
  const configs = [
    { rating: Rating.Again, key: 'again', label: 'Again', color: 'red' },
    { rating: Rating.Hard, key: 'hard', label: 'Hard', color: 'orange' },
    { rating: Rating.Good, key: 'good', label: 'Good', color: 'green' },
    { rating: Rating.Easy, key: 'easy', label: 'Easy', color: 'emerald' },
  ];

  const result = {};
  for (const cfg of configs) {
    const calculation = calculateFSRS(card, cfg.rating, requestedRetention);
    result[cfg.key] = {
      rating: cfg.rating,
      label: cfg.label,
      color: cfg.color,
      intervalDays: calculation.interval,
      intervalFormatted: formatInterval(calculation.interval, cfg.rating),
      stability: calculation.stability,
      difficulty: calculation.difficulty,
    };
  }

  return result;
}

module.exports = {
  FACTOR,
  DECAY,
  DEFAULT_PARAMETERS,
  Rating,
  State,
  calculateRetrievability,
  calculateInterval,
  calculateFSRS,
  calculateUpcomingIntervals,
  convertSM2ToFSRS,
  mapQualityToRating,
  formatInterval,
};
