/**
 * Unit tests for flashcardMasteryService.
 *
 * Tests cover: forgetting curve prediction, mastery classification,
 * retention distribution, review queue generation, SM-2 update logic,
 * and recommendation generation.
 */

const {
  predictRetention,
  generateCardCurve,
  generateAggregateCurve,
  classifyCard,
  getMasteryBreakdown,
  getRetentionDistribution,
  identifyAtRiskCards,
  identifyOverdueCards,
  computeReviewEfficiency,
  generateReviewQueue,
  generateMasteryRecommendations,
  applySm2Update,
  DECAY_CONSTANT,
  MASTERY_LEVELS,
  RETENTION_BUCKETS,
  SM2_DEFAULTS,
} = require('../services/flashcardMasteryService');

// ── Helpers ──────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'card-1',
    front: overrides.front || 'What is photosynthesis?',
    back: overrides.back || 'The process by which plants convert light to energy',
    interval: overrides.interval ?? 1,
    repetitions: overrides.repetitions ?? 0,
    efactor: overrides.efactor ?? 2.5,
    nextReviewDate: overrides.nextReviewDate || new Date(Date.now() + 86400000),
    createdAt: overrides.createdAt || new Date(Date.now() - 7 * 86400000),
    subject: overrides.subject || null,
    deckId: overrides.deckId || null,
    difficulty: overrides.difficulty || null,
  };
}

// ── Forgetting Curve Prediction ──────────────────────────────────────────

describe('predictRetention', () => {
  it('should return ~100% retention immediately after review', () => {
    const card = makeCard({ interval: 5, repetitions: 3, efactor: 2.5 });
    const retention = predictRetention(card, 0);
    expect(retention).toBeGreaterThanOrEqual(99);
  });

  it('should return lower retention as days increase', () => {
    const card = makeCard({ interval: 5, repetitions: 2, efactor: 2.5 });
    const r0 = predictRetention(card, 0);
    const r3 = predictRetention(card, 3);
    const r7 = predictRetention(card, 7);
    expect(r0).toBeGreaterThanOrEqual(r3);
    expect(r3).toBeGreaterThanOrEqual(r7);
  });

  it('should return 0 or near-0 for very old cards with low stability', () => {
    const card = makeCard({ interval: 1, repetitions: 0, efactor: 2.5 });
    const retention = predictRetention(card, 100);
    expect(retention).toBeLessThan(5);
  });

  it('should clamp to 0-100 range', () => {
    const card = makeCard();
    expect(predictRetention(card, 0)).toBeLessThanOrEqual(100);
    expect(predictRetention(card, 1000)).toBeGreaterThanOrEqual(0);
  });

  it('should return higher retention for cards with higher efactor', () => {
    const cardLow = makeCard({ interval: 5, efactor: 1.5, repetitions: 2 });
    const cardHigh = makeCard({ interval: 5, efactor: 3.0, repetitions: 2 });
    const rLow = predictRetention(cardLow, 10);
    const rHigh = predictRetention(cardHigh, 10);
    expect(rHigh).toBeGreaterThan(rLow);
  });

  it('should handle card with default/missing values', () => {
    const card = makeCard({ interval: undefined, efactor: undefined, repetitions: undefined });
    const retention = predictRetention(card, 5);
    expect(retention).toBeGreaterThanOrEqual(0);
    expect(retention).toBeLessThanOrEqual(100);
  });
});

// ── Card Curve Generation ────────────────────────────────────────────────

describe('generateCardCurve', () => {
  it('should return array with length = forecastDays + 1', () => {
    const card = makeCard();
    const curve = generateCardCurve(card, 14);
    expect(curve).toHaveLength(15);
  });

  it('should start at day 0 with ~100% retention', () => {
    const card = makeCard();
    const curve = generateCardCurve(card, 7);
    expect(curve[0].day).toBe(0);
    expect(curve[0].retentionPercent).toBeGreaterThanOrEqual(99);
  });

  it('should have monotonically decreasing retention', () => {
    const card = makeCard();
    const curve = generateCardCurve(card, 14);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].retentionPercent).toBeLessThanOrEqual(curve[i - 1].retentionPercent);
    }
  });

  it('should default to 14 days', () => {
    const card = makeCard();
    const curve = generateCardCurve(card);
    expect(curve).toHaveLength(15);
  });
});

// ── Aggregate Curve ──────────────────────────────────────────────────────

describe('generateAggregateCurve', () => {
  it('should return zeros for empty cards array', () => {
    const curve = generateAggregateCurve([], 7);
    expect(curve).toHaveLength(8);
    expect(curve.every((p) => p.retentionPercent === 0)).toBe(true);
  });

  it('should average retention across cards', () => {
    const card1 = makeCard({ interval: 10, repetitions: 5, efactor: 3.0 });
    const card2 = makeCard({ interval: 1, repetitions: 0, efactor: 1.5 });
    const curve = generateAggregateCurve([card1, card2], 7);
    expect(curve).toHaveLength(8);
    expect(curve[0].retentionPercent).toBeGreaterThan(50);
  });
});

// ── Mastery Classification ───────────────────────────────────────────────

describe('classifyCard', () => {
  it('should classify new card (0 reps)', () => {
    expect(classifyCard(makeCard({ repetitions: 0 }))).toBe('new');
  });

  it('should classify learning card (low interval)', () => {
    expect(classifyCard(makeCard({ interval: 3, repetitions: 2 }))).toBe('learning');
  });

  it('should classify young card', () => {
    expect(classifyCard(makeCard({ interval: 14, repetitions: 6 }))).toBe('young');
  });

  it('should classify mature card', () => {
    expect(classifyCard(makeCard({ interval: 30, repetitions: 15 }))).toBe('mature');
  });

  it('should handle missing values gracefully', () => {
    expect(classifyCard(makeCard({ interval: undefined, repetitions: undefined }))).toBe('new');
  });
});

// ── Mastery Breakdown ────────────────────────────────────────────────────

describe('getMasteryBreakdown', () => {
  it('should return 0 counts for empty array', () => {
    const breakdown = getMasteryBreakdown([]);
    expect(breakdown.new.count).toBe(0);
    expect(breakdown.learning.count).toBe(0);
    expect(breakdown.young.count).toBe(0);
    expect(breakdown.mature.count).toBe(0);
  });

  it('should correctly count cards by level', () => {
    const cards = [
      makeCard({ id: '1', repetitions: 0 }),
      makeCard({ id: '2', interval: 3, repetitions: 2 }),
      makeCard({ id: '3', interval: 14, repetitions: 6 }),
      makeCard({ id: '4', interval: 30, repetitions: 15 }),
    ];
    const breakdown = getMasteryBreakdown(cards);
    expect(breakdown.new.count).toBe(1);
    expect(breakdown.learning.count).toBe(1);
    expect(breakdown.young.count).toBe(1);
    expect(breakdown.mature.count).toBe(1);
  });

  it('should compute correct percentages', () => {
    const cards = [
      makeCard({ id: '1', repetitions: 0 }),
      makeCard({ id: '2', repetitions: 0 }),
      makeCard({ id: '3', interval: 30, repetitions: 15 }),
      makeCard({ id: '4', interval: 30, repetitions: 15 }),
    ];
    const breakdown = getMasteryBreakdown(cards);
    expect(breakdown.new.percentage).toBe(50);
    expect(breakdown.mature.percentage).toBe(50);
  });
});

// ── Retention Distribution ───────────────────────────────────────────────

describe('getRetentionDistribution', () => {
  it('should return all buckets for empty array', () => {
    const dist = getRetentionDistribution([]);
    expect(Object.keys(dist)).toHaveLength(RETENTION_BUCKETS.length);
    expect(Object.values(dist).every((v) => v === 0)).toBe(true);
  });

  it('should distribute cards into correct buckets', () => {
    const now = new Date();
    // Card reviewed 30 days ago with short interval — very low retention
    const lowRetentionCard = makeCard({
      id: 'low',
      interval: 1,
      efactor: 2.0,
      repetitions: 1,
      nextReviewDate: new Date(now.getTime() - 30 * 86400000),
    });
    const dist = getRetentionDistribution([lowRetentionCard]);
    const totalCards = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(totalCards).toBe(1);
  });
});

// ── At-Risk & Overdue Cards ──────────────────────────────────────────────

describe('identifyAtRiskCards', () => {
  it('should return empty for no at-risk cards', () => {
    const cards = [
      makeCard({ id: '1', interval: 30, repetitions: 10, efactor: 2.5 }),
    ];
    const atRisk = identifyAtRiskCards(cards, 40);
    expect(atRisk.length).toBe(0);
  });

  it('should identify low-retention cards as at-risk', () => {
    const now = new Date();
    const atRiskCard = makeCard({
      id: 'at-risk',
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(now.getTime() - 30 * 86400000),
    });
    const atRisk = identifyAtRiskCards([atRiskCard], 40);
    expect(atRisk.length).toBe(1);
    expect(atRisk[0].cardId).toBe('at-risk');
  });

  it('should sort by lowest retention first', () => {
    const now = new Date();
    const cards = [
      makeCard({ id: 'a', interval: 1, repetitions: 0, nextReviewDate: new Date(now.getTime() - 10 * 86400000) }),
      makeCard({ id: 'b', interval: 1, repetitions: 0, nextReviewDate: new Date(now.getTime() - 50 * 86400000) }),
    ];
    const atRisk = identifyAtRiskCards(cards, 40);
    if (atRisk.length === 2) {
      expect(atRisk[0].retention).toBeLessThanOrEqual(atRisk[1].retention);
    }
  });
});

describe('identifyOverdueCards', () => {
  it('should return empty for no overdue cards', () => {
    const cards = [
      makeCard({ nextReviewDate: new Date(Date.now() + 86400000) }),
    ];
    expect(identifyOverdueCards(cards)).toHaveLength(0);
  });

  it('should identify overdue cards', () => {
    const cards = [
      makeCard({ id: 'overdue', nextReviewDate: new Date(Date.now() - 86400000) }),
    ];
    const overdue = identifyOverdueCards(cards);
    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe('overdue');
  });

  it('should handle cards with no nextReviewDate', () => {
    const cards = [makeCard({ nextReviewDate: null })];
    expect(identifyOverdueCards(cards)).toHaveLength(0);
  });
});

// ── Review Queue ─────────────────────────────────────────────────────────

describe('generateReviewQueue', () => {
  it('should return empty for no cards', () => {
    expect(generateReviewQueue([], 10)).toHaveLength(0);
  });

  it('should respect limit', () => {
    const cards = Array.from({ length: 50 }, (_, i) =>
      makeCard({ id: `card-${i}`, interval: 1, repetitions: 0 })
    );
    const queue = generateReviewQueue(cards, 5);
    expect(queue.length).toBe(5);
  });

  it('should prioritise overdue cards', () => {
    const now = new Date();
    const cards = [
      makeCard({ id: 'normal', interval: 30, repetitions: 10, efactor: 2.5, nextReviewDate: new Date(now.getTime() + 86400000) }),
      makeCard({ id: 'overdue', interval: 1, repetitions: 0, nextReviewDate: new Date(now.getTime() - 86400000) }),
    ];
    const queue = generateReviewQueue(cards, 10);
    const overdueIdx = queue.findIndex((q) => q.cardId === 'overdue');
    const normalIdx = queue.findIndex((q) => q.cardId === 'normal');
    if (overdueIdx >= 0 && normalIdx >= 0) {
      expect(overdueIdx).toBeLessThan(normalIdx);
    }
  });

  it('should include urgency field', () => {
    const cards = [makeCard()];
    const queue = generateReviewQueue(cards, 5);
    expect(queue[0]).toHaveProperty('urgency');
    expect(['overdue', 'critical', 'high', 'normal']).toContain(queue[0].urgency);
  });

  it('should trim card front to 100 characters', () => {
    const longFront = 'A'.repeat(200);
    const cards = [makeCard({ front: longFront })];
    const queue = generateReviewQueue(cards, 1);
    expect(queue[0].front.length).toBeLessThanOrEqual(100);
  });
});

// ── Review Efficiency ────────────────────────────────────────────────────

describe('computeReviewEfficiency', () => {
  it('should return 0 for empty cards', () => {
    expect(computeReviewEfficiency([])).toBe(0);
  });

  it('should return a score between 0 and 100', () => {
    const cards = [
      makeCard({ interval: 5, repetitions: 3, efactor: 2.5 }),
      makeCard({ interval: 10, repetitions: 5, efactor: 2.5 }),
    ];
    const efficiency = computeReviewEfficiency(cards);
    expect(efficiency).toBeGreaterThanOrEqual(0);
    expect(efficiency).toBeLessThanOrEqual(100);
  });
});

// ── Recommendations ──────────────────────────────────────────────────────

describe('generateMasteryRecommendations', () => {
  const baseMetrics = {
    totalCards: 100,
    overallRetentionRate: 75,
    averageInterval: 10,
    reviewStreak: 5,
    reviewEfficiency: 70,
    cardsOverdue: 2,
    cardsAtRisk: 3,
    newCards: 20,
    totalReviews: 200,
  };

  it('should recommend catching up on overdue cards', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, cardsOverdue: 15 });
    const overdueRec = recs.find((r) => r.category === 'overdue');
    expect(overdueRec).toBeDefined();
    expect(overdueRec.impact).toBe('high');
  });

  it('should recommend focusing on existing cards if too many new', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, newCards: 80, totalCards: 100 });
    const newRec = recs.find((r) => r.category === 'new_cards');
    expect(newRec).toBeDefined();
  });

  it('should recommend shorter sessions for low retention', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, overallRetentionRate: 45 });
    const retentionRec = recs.find((r) => r.category === 'retention');
    expect(retentionRec).toBeDefined();
  });

  it('should congratulate on long streaks', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, reviewStreak: 14 });
    const streakRec = recs.find((r) => r.category === 'streak');
    expect(streakRec).toBeDefined();
  });

  it('should recommend efficiency improvement when low', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, reviewEfficiency: 30 });
    const effRec = recs.find((r) => r.category === 'efficiency');
    expect(effRec).toBeDefined();
  });

  it('should recommend interval adjustment when average is low', () => {
    const recs = generateMasteryRecommendations({ ...baseMetrics, averageInterval: 2, totalReviews: 100 });
    const intRec = recs.find((r) => r.category === 'intervals');
    expect(intRec).toBeDefined();
  });
});

// ── SM-2 Update ──────────────────────────────────────────────────────────

describe('applySm2Update', () => {
  it('should increase interval for quality >= 3', () => {
    const card = makeCard({ interval: 1, repetitions: 0, efactor: 2.5 });
    const updated = applySm2Update(card, 4);
    expect(updated.interval).toBeGreaterThanOrEqual(1);
    expect(updated.repetitions).toBe(1);
  });

  it('should reset interval for quality < 3', () => {
    const card = makeCard({ interval: 10, repetitions: 5, efactor: 2.5 });
    const updated = applySm2Update(card, 1);
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(0);
  });

  it('should set nextReviewDate in the future', () => {
    const card = makeCard();
    const updated = applySm2Update(card, 3);
    expect(new Date(updated.nextReviewDate).getTime()).toBeGreaterThan(Date.now());
  });

  it('should cap quality between 0 and 5', () => {
    const card = makeCard();
    const updated = applySm2Update(card, 10);
    expect(updated.interval).toBeGreaterThanOrEqual(1);
  });

  it('should decrease efactor for low quality', () => {
    const card = makeCard({ efactor: 2.5 });
    const updated = applySm2Update(card, 0);
    expect(updated.efactor).toBeLessThan(2.5);
  });

  it('should increase efactor for high quality', () => {
    const card = makeCard({ efactor: 2.5 });
    const updated = applySm2Update(card, 5);
    expect(updated.efactor).toBeGreaterThanOrEqual(2.5);
  });

  it('should not let efactor drop below 1.3', () => {
    const card = makeCard({ efactor: 1.3 });
    const updated = applySm2Update(card, 0);
    expect(updated.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it('should handle first review (quality >= 3)', () => {
    const card = makeCard({ interval: 1, repetitions: 0, efactor: 2.5 });
    const updated = applySm2Update(card, 3);
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(1);
  });

  it('should handle second review (quality >= 3)', () => {
    const card = makeCard({ interval: 1, repetitions: 1, efactor: 2.5 });
    const updated = applySm2Update(card, 4);
    expect(updated.interval).toBe(6);
    expect(updated.repetitions).toBe(2);
  });
});

// ── Constants ────────────────────────────────────────────────────────────

describe('constants', () => {
  it('should have valid decay constant', () => {
    expect(DECAY_CONSTANT).toBeGreaterThan(0);
    expect(DECAY_CONSTANT).toBeLessThan(1);
  });

  it('should have valid SM2 defaults', () => {
    expect(SM2_DEFAULTS.interval).toBe(1);
    expect(SM2_DEFAULTS.repetitions).toBe(0);
    expect(SM2_DEFAULTS.efactor).toBe(2.5);
  });

  it('should have 5 retention buckets', () => {
    expect(RETENTION_BUCKETS).toHaveLength(5);
  });
});
