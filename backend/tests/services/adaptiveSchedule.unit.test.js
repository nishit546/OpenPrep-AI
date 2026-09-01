/**
 * Unit tests for adaptiveScheduleService.js
 */
const { describe, it, expect } = require('vitest');
const {
  srInterval,
  addDays,
  daysBetween,
  computeCognitiveLoad,
  smoothWorkload,
} = require('../../services/adaptiveScheduleService');

// ─── Helper: make a minimal slot object ──────────────────────────────────────
const makeSlot = (date, durationMinutes = 60, priorityScore = 0.5, opts = {}) => ({
  scheduledDate: date,
  durationMinutes,
  priorityScore,
  status: 'pending',
  revisionNumber: opts.revisionNumber || 1,
  metadata: opts.metadata || {},
  title: opts.title || 'Test slot',
  ...opts,
});

// ─── srInterval ───────────────────────────────────────────────────────────────
describe('srInterval', () => {
  it('returns 1 day for first pass of a hard topic', () => {
    expect(srInterval(1, 3)).toBe(1);
  });

  it('returns longer interval for later revision passes at medium difficulty', () => {
    const pass2 = srInterval(2, 1.5);
    const pass3 = srInterval(3, 1.5);
    expect(pass3).toBeGreaterThan(pass2);
  });

  it('hard topics (difficultyFactor=3) get shorter intervals than easy ones', () => {
    const hardPass3 = srInterval(3, 3);
    const easyPass3 = srInterval(3, 1);
    expect(hardPass3).toBeLessThan(easyPass3);
  });

  it('never returns an interval less than 1', () => {
    expect(srInterval(1, 10)).toBeGreaterThanOrEqual(1);
  });
});

// ─── addDays / daysBetween ────────────────────────────────────────────────────
describe('addDays and daysBetween', () => {
  it('addDays returns correct date', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06');
  });

  it('addDays crosses month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('daysBetween returns 0 for same date', () => {
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('daysBetween returns correct count', () => {
    expect(daysBetween('2026-09-01', '2026-09-11')).toBe(10);
  });
});

// ─── computeCognitiveLoad ────────────────────────────────────────────────────
describe('computeCognitiveLoad', () => {
  it('returns an empty array for no slots', () => {
    expect(computeCognitiveLoad([])).toEqual([]);
  });

  it('labels a day with minimal load as "light"', () => {
    const slots = [makeSlot('2026-10-01', 30, 0.1)];
    const [day] = computeCognitiveLoad(slots, 240);
    expect(day.label).toBe('light');
    expect(day.loadScore).toBeLessThan(0.3);
  });

  it('labels an over-capacity day as "overload"', () => {
    // 5 × 60-min hard slots = 300 min against 240-min capacity
    const slots = Array.from({ length: 5 }, () => makeSlot('2026-10-05', 60, 0.9));
    const [day] = computeCognitiveLoad(slots, 240);
    expect(day.label).toBe('overload');
    expect(day.loadScore).toBeGreaterThan(0.75);
  });

  it('groups multiple slots on the same date correctly', () => {
    const slots = [
      makeSlot('2026-10-03', 60, 0.5),
      makeSlot('2026-10-03', 45, 0.4),
      makeSlot('2026-10-04', 30, 0.3),
    ];
    const result = computeCognitiveLoad(slots, 240);
    expect(result).toHaveLength(2);
    const day3 = result.find((r) => r.date === '2026-10-03');
    expect(day3.slotCount).toBe(2);
    expect(day3.totalMinutes).toBe(105);
  });

  it('results are sorted ascending by date', () => {
    const slots = [
      makeSlot('2026-10-05', 60, 0.5),
      makeSlot('2026-10-02', 60, 0.5),
    ];
    const result = computeCognitiveLoad(slots, 240);
    expect(result[0].date).toBe('2026-10-02');
    expect(result[1].date).toBe('2026-10-05');
  });
});

// ─── smoothWorkload ───────────────────────────────────────────────────────────
describe('smoothWorkload', () => {
  it('does not move first-pass slots even when overloaded', () => {
    const overloaded = Array.from({ length: 5 }, (_, i) =>
      makeSlot('2026-11-01', 60, 0.8, { revisionNumber: 1, title: `Slot ${i}` })
    );
    const result = smoothWorkload([...overloaded], 120, '2026-12-31');
    const onDay = result.filter((s) => s.scheduledDate === '2026-11-01');
    expect(onDay).toHaveLength(5); // first passes are never moved
  });

  it('moves later-pass slots off overloaded days within exam deadline', () => {
    const slots = [
      makeSlot('2026-11-10', 120, 0.6, { revisionNumber: 2, title: 'Rev A' }),
      makeSlot('2026-11-10', 120, 0.6, { revisionNumber: 3, title: 'Rev B' }),
    ];
    const result = smoothWorkload([...slots], 180, '2026-12-31');
    const onOriginal = result.filter((s) => s.scheduledDate === '2026-11-10');
    // At most one should remain (180-min capacity, each slot = 120-min)
    expect(onOriginal.length).toBeLessThanOrEqual(1);
  });

  it('handles empty slot list without error', () => {
    expect(() => smoothWorkload([], 240, '2026-12-31')).not.toThrow();
  });
});
