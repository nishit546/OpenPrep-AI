import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  calculateVelocitySummary,
  calculateBurnoutRisk,
  countHeavyStreak,
  calculateAccuracyDrop,
  getDaysRemaining,
  buildVelocityMetrics,
} = require('../../services/studyVelocityService');

const NOW = new Date('2026-10-24T10:00:00Z');
const daysAgo = (n, hour = 9) => new Date(Date.UTC(2026, 9, 24 - n, hour));
const session = (n, hours) => ({ durationHours: hours, timestamp: daysAgo(n) });

describe('getDaysRemaining', () => {
  it('counts whole UTC days', () => {
    expect(getDaysRemaining('2026-10-30T00:00:00Z', NOW)).toBe(6);
  });
  it('does not shift around UTC midnight', () => {
    const lateNow = new Date('2026-10-24T23:59:00Z');
    expect(getDaysRemaining('2026-10-25T00:01:00Z', lateNow)).toBe(1);
    expect(getDaysRemaining('2026-10-26T00:01:00Z', lateNow)).toBe(2);
  });
  it('is at least 1 when the exam date has passed', () => {
    expect(getDaysRemaining('2026-10-01T00:00:00Z', NOW)).toBe(1);
  });
  it('is 1 for a missing or invalid date', () => {
    expect(getDaysRemaining(null, NOW)).toBe(1);
    expect(getDaysRemaining('nope', NOW)).toBe(1);
  });
});

describe('calculateVelocitySummary', () => {
  it('averages the last 14 days and ignores older sessions', () => {
    const sessions = [session(0, 7), session(13, 7), session(14, 100)];
    const out = calculateVelocitySummary(sessions, [], 5, NOW);
    expect(out.currentVelocity).toBe(1);
  });
  it('accepts durationMinutes and createdAt as stored by StudySession', () => {
    const out = calculateVelocitySummary(
      [{ durationMinutes: 140, createdAt: daysAgo(1) }],
      [],
      5,
      NOW
    );
    expect(out.currentVelocity).toBe(0.17);
  });
  it('weights hard topics and divides by days remaining', () => {
    const topics = [
      { estimatedBaseHours: 10, difficultyRating: 5 },
      { estimatedBaseHours: 5, difficultyRating: 1 },
    ];
    const out = calculateVelocitySummary([], topics, 10, NOW);
    expect(out.remainingSyllabusHours).toBe(20);
    expect(out.requiredVelocity).toBe(2);
  });
  it('requires nothing when there are no unfinished tasks', () => {
    const out = calculateVelocitySummary([], [], 10, NOW);
    expect(out.requiredVelocity).toBe(0);
    expect(out.remainingSyllabusHours).toBe(0);
  });
  it('treats a past exam date (0 or negative days) as 1 day', () => {
    const out = calculateVelocitySummary([], [{ estimatedBaseHours: 6 }], -3, NOW);
    expect(out.daysRemaining).toBe(1);
    expect(out.requiredVelocity).toBe(6);
  });
  it('handles a user with no sessions', () => {
    expect(calculateVelocitySummary([], [{ estimatedBaseHours: 2 }], 4, NOW).currentVelocity).toBe(0);
  });
});

describe('countHeavyStreak', () => {
  it('counts consecutive days above 8.5 hours', () => {
    const sessions = [session(0, 9), session(1, 8.6), session(2, 9.5), session(3, 8.5), session(4, 10)];
    expect(countHeavyStreak(sessions, NOW)).toBe(3);
  });
  it('treats exactly 8.5 hours as not heavy', () => {
    expect(countHeavyStreak([session(0, 8.5)], NOW)).toBe(0);
  });
  it('a rest day breaks the streak', () => {
    expect(countHeavyStreak([session(0, 9), session(2, 9)], NOW)).toBe(1);
  });
  it('an empty today does not break the streak that ended yesterday', () => {
    expect(countHeavyStreak([session(1, 9), session(2, 9)], NOW)).toBe(2);
  });
  it('sums several sessions on one day', () => {
    expect(countHeavyStreak([session(0, 5), session(0, 4)], NOW)).toBe(1);
  });
  it('is 0 with no sessions', () => {
    expect(countHeavyStreak([], NOW)).toBe(0);
  });
});

describe('calculateAccuracyDrop', () => {
  const attempt = (n, score) => ({ score, totalQuestions: 10, createdAt: daysAgo(n) });
  it('returns the drop between the previous and latest week', () => {
    expect(calculateAccuracyDrop([attempt(9, 9), attempt(2, 6)], NOW)).toBeCloseTo(30);
  });
  it('is 0 when accuracy improved or a window is empty', () => {
    expect(calculateAccuracyDrop([attempt(9, 5), attempt(2, 8)], NOW)).toBe(0);
    expect(calculateAccuracyDrop([attempt(2, 8)], NOW)).toBe(0);
  });
});

describe('calculateBurnoutRisk', () => {
  it('is 0 and low for a relaxed schedule', () => {
    const r = calculateBurnoutRisk({ requiredVelocity: 2, heavyStreakDays: 0, accuracyDrop: 0 });
    expect(r.burnoutRisk).toBe(0);
    expect(r.burnoutLevel).toBe('low');
    expect(r.tips.length).toBe(1);
  });
  it('is capped at 100', () => {
    const r = calculateBurnoutRisk({ requiredVelocity: 20, heavyStreakDays: 30, accuracyDrop: 90 });
    expect(r.burnoutRisk).toBe(100);
    expect(r.burnoutLevel).toBe('high');
  });
  it('flags the 8.5 hour threshold with a buffer day tip', () => {
    const below = calculateBurnoutRisk({ requiredVelocity: 8.5 });
    const above = calculateBurnoutRisk({ requiredVelocity: 8.6 });
    expect(below.tips.join(' ')).not.toMatch(/above 8.5/);
    expect(above.tips.join(' ')).toMatch(/above 8.5/);
    expect(above.tips.join(' ')).toMatch(/buffer day every 6 days/);
  });
  it('recommends a rest day after a heavy streak', () => {
    const r = calculateBurnoutRisk({ requiredVelocity: 3, heavyStreakDays: 4 });
    expect(r.tips.join(' ')).toMatch(/rest day/);
    expect(r.burnoutRisk).toBe(32);
  });
});

describe('buildVelocityMetrics', () => {
  it('combines everything for a user with a past exam date and no history', () => {
    const out = buildVelocityMetrics({
      sessions: [],
      tasks: [{ estimatedHours: 12 }],
      quizAttempts: [],
      examDate: '2026-10-01T00:00:00Z',
      now: NOW,
    });
    expect(out.daysRemaining).toBe(1);
    expect(out.requiredVelocity).toBe(12);
    expect(out.burnoutRisk).toBe(40);
    expect(out.currentVelocity).toBe(0);
  });
  it('handles zero tasks', () => {
    const out = buildVelocityMetrics({ sessions: [], tasks: [], quizAttempts: [], examDate: '2026-11-30', now: NOW });
    expect(out.requiredVelocity).toBe(0);
    expect(out.burnoutRisk).toBe(0);
  });
});
