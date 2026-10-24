/**
 * @fileoverview Retention forecast / what-if layer on top of the existing
 * flashcard forgetting curves.
 *
 * Stability S comes from flashcardMasteryService.getStability (the same SM-2
 * derivation predictRetention uses), so there is no new per-card state.
 * Here S is read as "days until recall drops to 90%", which gives
 * R(t) = exp(ln(0.9) * t / S) = 0.9^(t / S).
 *
 * Everything in this file is pure: no database access, no clock reads unless
 * `now` is omitted.
 */
const { getStability } = require('./flashcardMasteryService');

const DAY_MS = 86400000;
const FORECAST_DAYS = 30;
const DANGER_THRESHOLD = 70; // percent
const VULNERABILITY_WINDOW_HOURS = 48;
const HEATMAP_DAYS = [0, 1, 2, 3, 5, 7, 14, 30];

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Retention (0-100) after `days` days for a card of stability `stability`.
 */
function retentionAt(stability, days) {
  const r = Math.exp((Math.log(0.9) * Math.max(0, days)) / stability) * 100;
  return round1(Math.max(0, Math.min(100, r)));
}

/**
 * Days since the card was last reviewed, using the same estimate as
 * flashcardMasteryService (nextReviewDate minus interval). A card that has
 * never been reviewed counts as fresh (0 days) so brand new cards do not
 * show up as forgotten.
 */
function daysSinceLastReview(card, now = new Date()) {
  if (!card.repetitions || !card.nextReviewDate) return 0;
  const next = new Date(card.nextReviewDate).getTime();
  const last = next - (card.interval || 1) * DAY_MS;
  return Math.max(0, (now.getTime() - last) / DAY_MS);
}

/**
 * Average retention of `cards` for each day 0..days, starting from now.
 *
 * @param {Array} cards
 * @param {Object} [opts]
 * @param {number} [opts.days=30]
 * @param {Date} [opts.now]
 * @param {number} [opts.reviewAtDay] - if set, every card is reviewed on this
 *   day (retention resets to 100% and decays again from there)
 * @returns {Array<{ day: number, retentionPercent: number }>}
 */
function forecastDeck(cards, { days = FORECAST_DAYS, now = new Date(), reviewAtDay = null } = {}) {
  const prepared = (cards || []).map((card) => ({
    stability: getStability(card),
    elapsed: daysSinceLastReview(card, now),
  }));

  const curve = [];
  for (let day = 0; day <= days; day++) {
    if (prepared.length === 0) {
      curve.push({ day, retentionPercent: 0 });
      continue;
    }
    let sum = 0;
    for (const { stability, elapsed } of prepared) {
      const t = reviewAtDay !== null && day >= reviewAtDay ? day - reviewAtDay : elapsed + day;
      sum += retentionAt(stability, t);
    }
    curve.push({ day, retentionPercent: round1(sum / prepared.length) });
  }
  return curve;
}

/**
 * How exposed a deck is over the next 48 hours.
 * Score = share of cards (0-100) predicted to be under the danger threshold
 * 48h from now. Cards already under it today count too.
 */
function vulnerabilityScore(cards, { now = new Date(), hours = VULNERABILITY_WINDOW_HOURS } = {}) {
  if (!cards || cards.length === 0) {
    return { score: 0, atRiskCount: 0, totalCards: 0, averageRetention: 0, atRiskCards: [] };
  }
  const horizon = hours / 24;
  const atRisk = [];
  let sum = 0;
  for (const card of cards) {
    const retention = retentionAt(getStability(card), daysSinceLastReview(card, now) + horizon);
    sum += retention;
    if (retention < DANGER_THRESHOLD) {
      atRisk.push({
        cardId: card.id,
        front: (card.front || '').substring(0, 80),
        retention: Math.round(retention),
      });
    }
  }
  atRisk.sort((a, b) => a.retention - b.retention);
  return {
    score: Math.round((atRisk.length / cards.length) * 100),
    atRiskCount: atRisk.length,
    totalCards: cards.length,
    averageRetention: round1(sum / cards.length),
    atRiskCards: atRisk.slice(0, 5),
  };
}

/**
 * Compare reviewing the deck today against putting it off by `daysDelay`.
 * A review is modelled as resetting recall to 100% with the same stability.
 *
 * Both full 30-day curves are returned for charting. The headline numbers
 * only look at the waiting period (days 0 to daysDelay - 1), because after
 * the delayed review the later start makes that curve look better on a
 * fixed 30-day window, which would hide the cost of waiting.
 */
function whatIf(cards, daysDelay, { days = FORECAST_DAYS, now = new Date() } = {}) {
  const delay = Math.max(0, Math.min(days, Math.round(Number(daysDelay) || 0)));
  const reviewToday = forecastDeck(cards, { days, now, reviewAtDay: 0 });
  const delayed = forecastDeck(cards, { days, now, reviewAtDay: delay });
  const noReview = forecastDeck(cards, { days, now });

  const waiting = Math.max(1, delay);
  const avgOver = (curve) =>
    round1(curve.slice(0, waiting).reduce((s, p) => s + p.retentionPercent, 0) / waiting);
  const averageReviewToday = avgOver(reviewToday);
  const averageDelayed = avgOver(delayed);

  return {
    daysDelay: delay,
    reviewToday,
    delayed,
    averageReviewToday,
    averageDelayed,
    retentionLostByDelaying: round1(averageReviewToday - averageDelayed),
    retentionBeforeDelayedReview: noReview[delay].retentionPercent,
    cardsBelowDangerBeforeReview: vulnerabilityScore(cards, { now, hours: delay * 24 }).atRiskCount,
  };
}

/**
 * Full payload for one deck: 30-day curve, danger line, vulnerability and
 * an optional what-if.
 */
function buildDeckForecast(cards, { daysDelay = 3, now = new Date() } = {}) {
  return {
    dangerThreshold: DANGER_THRESHOLD,
    forecast: forecastDeck(cards, { now }),
    vulnerability: vulnerabilityScore(cards, { now }),
    whatIf: whatIf(cards, daysDelay, { now }),
  };
}

/**
 * Heatmap rows, one per deck: average retention at HEATMAP_DAYS plus the
 * 48h vulnerability score.
 *
 * @param {Array<{ id: string|null, name: string, cards: Array }>} decks
 */
function buildRetentionHeatmap(decks, { now = new Date() } = {}) {
  return {
    dangerThreshold: DANGER_THRESHOLD,
    days: HEATMAP_DAYS,
    decks: (decks || []).map((deck) => {
      const curve = forecastDeck(deck.cards, { now });
      return {
        deckId: deck.id,
        name: deck.name,
        totalCards: deck.cards.length,
        retention: HEATMAP_DAYS.map((d) => curve[d].retentionPercent),
        vulnerabilityScore: vulnerabilityScore(deck.cards, { now }).score,
      };
    }),
  };
}

module.exports = {
  retentionAt,
  daysSinceLastReview,
  forecastDeck,
  vulnerabilityScore,
  whatIf,
  buildDeckForecast,
  buildRetentionHeatmap,
  FORECAST_DAYS,
  DANGER_THRESHOLD,
  HEATMAP_DAYS,
};
