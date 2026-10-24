const svc = require('../services/retentionForecastService');
const { createRetentionHandlers } = require('../controllers/flashcardRetentionController');

const NOW = new Date('2026-10-24T12:00:00Z');
const DAY = 86400000;

// A card reviewed `ago` days back, with the given SM-2 state.
function card(id, { interval = 5, repetitions = 3, efactor = 2.5, ago = 2 } = {}) {
  const last = NOW.getTime() - ago * DAY;
  return {
    id,
    front: `Card ${id}`,
    interval,
    repetitions,
    efactor,
    nextReviewDate: new Date(last + interval * DAY),
  };
}

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('retentionAt', () => {
  test('is 100 at day 0 and 90 after one stability period', () => {
    expect(svc.retentionAt(10, 0)).toBe(100);
    expect(svc.retentionAt(10, 10)).toBe(90);
  });
  test('never rises with time', () => {
    expect(svc.retentionAt(5, 20)).toBeLessThan(svc.retentionAt(5, 10));
  });
});

describe('forecastDeck', () => {
  test('empty deck gives a flat zero 31 point curve', () => {
    const curve = svc.forecastDeck([], { now: NOW });
    expect(curve).toHaveLength(31);
    expect(curve.every((p) => p.retentionPercent === 0)).toBe(true);
  });

  test('a card with 0 reviews counts as fresh and decays from 100', () => {
    const fresh = { id: 'n', front: 'new', interval: 1, repetitions: 0, efactor: 2.5 };
    const curve = svc.forecastDeck([fresh], { now: NOW });
    expect(curve[0].retentionPercent).toBe(100);
    expect(curve[30].retentionPercent).toBeLessThan(curve[0].retentionPercent);
  });

  test('a card with 100+ reviews decays much slower than a fresh one', () => {
    const veteran = card('v', { interval: 90, repetitions: 120, efactor: 2.8, ago: 1 });
    const fresh = { id: 'n', front: 'new', interval: 1, repetitions: 0, efactor: 2.5 };
    const v = svc.forecastDeck([veteran], { now: NOW });
    const f = svc.forecastDeck([fresh], { now: NOW });
    expect(v[30].retentionPercent).toBeGreaterThan(f[30].retentionPercent);
    expect(v[30].retentionPercent).toBeGreaterThan(90);
  });

  test('is monotonically non-increasing without a review', () => {
    const curve = svc.forecastDeck([card('a'), card('b', { interval: 20 })], { now: NOW });
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].retentionPercent).toBeLessThanOrEqual(curve[i - 1].retentionPercent);
    }
  });
});

describe('vulnerabilityScore', () => {
  test('is 0 for an empty deck', () => {
    expect(svc.vulnerabilityScore([], { now: NOW }).score).toBe(0);
  });

  test('counts only cards below 70% in 48h', () => {
    const weak = card('weak', { interval: 1, repetitions: 1, ago: 6 });
    const strong = card('strong', { interval: 60, repetitions: 30, ago: 1 });
    const result = svc.vulnerabilityScore([weak, strong], { now: NOW });
    expect(result.atRiskCount).toBe(1);
    expect(result.score).toBe(50);
    expect(result.atRiskCards[0].cardId).toBe('weak');
  });

  test('is 100 when every card is overdue', () => {
    const cards = [card('a', { interval: 1, ago: 20 }), card('b', { interval: 2, ago: 30 })];
    expect(svc.vulnerabilityScore(cards, { now: NOW }).score).toBe(100);
  });
});

describe('whatIf', () => {
  const cards = [card('a', { interval: 3, ago: 1 }), card('b', { interval: 6, ago: 3 })];

  test('delaying costs retention versus reviewing today', () => {
    const r = svc.whatIf(cards, 3, { now: NOW });
    expect(r.averageDelayed).toBeLessThan(r.averageReviewToday);
    expect(r.retentionLostByDelaying).toBeGreaterThan(0);
    expect(r.reviewToday[0].retentionPercent).toBe(100);
  });

  test('no delay means identical curves', () => {
    const r = svc.whatIf(cards, 0, { now: NOW });
    expect(r.delayed).toEqual(r.reviewToday);
    expect(r.retentionLostByDelaying).toBe(0);
  });

  test('clamps an out of range delay', () => {
    expect(svc.whatIf(cards, 99, { now: NOW }).daysDelay).toBe(30);
    expect(svc.whatIf(cards, -4, { now: NOW }).daysDelay).toBe(0);
  });
});

describe('buildRetentionHeatmap', () => {
  test('returns one row per deck with retention per heatmap day', () => {
    const out = svc.buildRetentionHeatmap([{ id: 'd1', name: 'Bio', cards: [card('a')] }], {
      now: NOW,
    });
    expect(out.decks).toHaveLength(1);
    expect(out.decks[0].retention).toHaveLength(svc.HEATMAP_DAYS.length);
    expect(out.decks[0].vulnerabilityScore).toBeGreaterThanOrEqual(0);
  });
});

describe('endpoint handlers (injected loaders)', () => {
  const user = { id: 'u1' };

  test('deck curve returns forecast for the owner', async () => {
    const loadDeckCards = vi.fn().mockResolvedValue([card('a')]);
    const h = createRetentionHandlers({ loadDeckCards });
    const res = mockRes();
    await h.getDeckRetentionCurve({ user, params: { id: 'd1' }, query: {} }, res, vi.fn());
    expect(loadDeckCards).toHaveBeenCalledWith('u1', 'd1');
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.forecast).toHaveLength(31);
    expect(body.data.dangerThreshold).toBe(70);
    expect(body.data.whatIf.daysDelay).toBe(3);
  });

  test('deck curve is 404 when the deck is not the users', async () => {
    const h = createRetentionHandlers({ loadDeckCards: vi.fn().mockResolvedValue(null) });
    const res = mockRes();
    await h.getDeckRetentionCurve({ user, params: { id: 'x' }, query: {} }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deck curve rejects a bad daysDelay', async () => {
    const h = createRetentionHandlers({ loadDeckCards: vi.fn().mockResolvedValue([]) });
    const res = mockRes();
    await h.getDeckRetentionCurve(
      { user, params: { id: 'd' }, query: { daysDelay: 'abc' } },
      res,
      vi.fn()
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deck curve forwards loader errors to next', async () => {
    const err = new Error('db down');
    const h = createRetentionHandlers({ loadDeckCards: vi.fn().mockRejectedValue(err) });
    const next = vi.fn();
    await h.getDeckRetentionCurve({ user, params: { id: 'd' }, query: {} }, mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  test('heatmap returns a row per deck', async () => {
    const loadUserDecks = vi.fn().mockResolvedValue([
      { id: 'd1', name: 'Bio', cards: [card('a')] },
      { id: 'd2', name: 'Chem', cards: [card('b', { ago: 15 })] },
    ]);
    const h = createRetentionHandlers({ loadUserDecks });
    const res = mockRes();
    await h.getRetentionHeatmap({ user }, res, vi.fn());
    expect(loadUserDecks).toHaveBeenCalledWith('u1');
    expect(res.json.mock.calls[0][0].data.decks).toHaveLength(2);
  });
});
