/**
 * Unit tests for studyBuddyService — compatibility scoring, validation, and helpers.
 */

const {
  computeCompatibility,
  computeAvailabilityOverlap,
  computeStudyStyleAlignment,
  MATCH_WEIGHTS,
  MIN_COMPATIBILITY_SCORE,
  DAYS_OF_WEEK,
} = require('../../services/studyBuddyService');

// ── Helper factories ─────────────────────────────────────────────────────

function makeRequest(overrides = {}) {
  return {
    user: overrides.user || 'user-1',
    subjects: overrides.subjects || ['math', 'physics'],
    strengths: overrides.strengths || ['chemistry'],
    studyGoals: overrides.studyGoals || ['exam_prep'],
    preferredStudyStyle: overrides.preferredStudyStyle || 'any',
    availabilityWindows: overrides.availabilityWindows || [
      { day: 'monday', startHour: 14, endHour: 17 },
      { day: 'wednesday', startHour: 10, endHour: 13 },
    ],
    ...overrides,
  };
}

// ── Constants ────────────────────────────────────────────────────────────

describe('studyBuddyService — constants', () => {
  test('MATCH_WEIGHTS keys sum to 1', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  test('MIN_COMPATIBILITY_SCORE is between 0 and 100', () => {
    expect(MIN_COMPATIBILITY_SCORE).toBeGreaterThan(0);
    expect(MIN_COMPATIBILITY_SCORE).toBeLessThanOrEqual(100);
  });

  test('DAYS_OF_WEEK has 7 entries', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });
});

// ── Compatibility Scoring ────────────────────────────────────────────────

describe('computeCompatibility', () => {
  test('identical requests score high', () => {
    const a = makeRequest({ user: 'a' });
    const b = makeRequest({ user: 'b' });
    const result = computeCompatibility(a, b);

    expect(result.score).toBeGreaterThan(60);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.breakdown).toHaveProperty('subjectOverlap');
    expect(result.breakdown).toHaveProperty('complementarySubjects');
    expect(result.breakdown).toHaveProperty('availabilityOverlap');
    expect(result.breakdown).toHaveProperty('studyStyleAlignment');
    expect(result.breakdown).toHaveProperty('goalAlignment');
  });

  test('completely different subjects score low', () => {
    const a = makeRequest({ user: 'a', subjects: ['math'], strengths: ['math'] });
    const b = makeRequest({ user: 'b', subjects: ['history'], strengths: ['history'] });
    const result = computeCompatibility(a, b);

    expect(result.score).toBeLessThan(40);
    expect(result.reasons.some((r) => r.includes('Shared subjects'))).toBe(false);
  });

  test('complementary subjects boost score', () => {
    const a = makeRequest({
      user: 'a',
      subjects: ['math'],
      strengths: ['physics'],
    });
    const b = makeRequest({
      user: 'b',
      subjects: ['physics'],
      strengths: ['math'],
    });
    const result = computeCompatibility(a, b);

    expect(result.breakdown.complementarySubjects).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes('tutor'))).toBe(true);
  });

  test('overlapping availability boosts score', () => {
    const sharedWindow = [
      { day: 'monday', startHour: 14, endHour: 17 },
    ];
    const a = makeRequest({ user: 'a', availabilityWindows: sharedWindow });
    const b = makeRequest({ user: 'b', availabilityWindows: sharedWindow });
    const result = computeCompatibility(a, b);

    expect(result.breakdown.availabilityOverlap).toBeGreaterThan(0);
  });

  test('no availability overlap scores zero for availability', () => {
    const a = makeRequest({
      user: 'a',
      availabilityWindows: [{ day: 'monday', startHour: 9, endHour: 12 }],
    });
    const b = makeRequest({
      user: 'b',
      availabilityWindows: [{ day: 'friday', startHour: 14, endHour: 17 }],
    });
    const result = computeCompatibility(a, b);

    expect(result.breakdown.availabilityOverlap).toBe(0);
  });

  test('matching study style scores higher', () => {
    const a = makeRequest({ user: 'a', preferredStudyStyle: 'discuss' });
    const b = makeRequest({ user: 'b', preferredStudyStyle: 'discuss' });
    const result = computeCompatibility(a, b);

    expect(result.breakdown.studyStyleAlignment).toBeGreaterThan(0);
  });

  test('any study style gets partial credit', () => {
    const a = makeRequest({ user: 'a', preferredStudyStyle: 'any' });
    const b = makeRequest({ user: 'b', preferredStudyStyle: 'discuss' });
    const result = computeCompatibility(a, b);

    expect(result.breakdown.studyStyleAlignment).toBeGreaterThan(0);
  });
});

// ── Availability Overlap ─────────────────────────────────────────────────

describe('computeAvailabilityOverlap', () => {
  test('identical windows return 1', () => {
    const windows = [{ day: 'monday', startHour: 10, endHour: 14 }];
    expect(computeAvailabilityOverlap(windows, windows)).toBeCloseTo(1.0, 2);
  });

  test('no overlap returns 0', () => {
    const a = [{ day: 'monday', startHour: 9, endHour: 12 }];
    const b = [{ day: 'friday', startHour: 9, endHour: 12 }];
    expect(computeAvailabilityOverlap(a, b)).toBe(0);
  });

  test('partial overlap returns fractional value', () => {
    const a = [{ day: 'monday', startHour: 10, endHour: 14 }]; // 4 hours
    const b = [{ day: 'monday', startHour: 12, endHour: 16 }]; // 4 hours
    // overlap: 12-14 = 2 hours, total covered: 10-16 = 6 hours
    expect(computeAvailabilityOverlap(a, b)).toBeCloseTo(2 / 6, 2);
  });

  test('empty windows return 0', () => {
    expect(computeAvailabilityOverlap([], [])).toBe(0);
  });

  test('multiple days handled correctly', () => {
    const a = [
      { day: 'monday', startHour: 10, endHour: 12 },
      { day: 'wednesday', startHour: 10, endHour: 12 },
    ];
    const b = [
      { day: 'monday', startHour: 10, endHour: 12 },
      { day: 'friday', startHour: 10, endHour: 12 },
    ];
    // Monday overlap: 2h / 2h = 1.0
    // Wednesday: a has 2h, b has 0
    // Friday: b has 2h, a has 0
    // Total overlap: 2, total covered: 2+2+2=6
    expect(computeAvailabilityOverlap(a, b)).toBeCloseTo(2 / 6, 2);
  });
});

// ── Study Style Alignment ────────────────────────────────────────────────

describe('computeStudyStyleAlignment', () => {
  test('identical styles score 1', () => {
    expect(computeStudyStyleAlignment('discuss', 'discuss')).toBe(1.0);
    expect(computeStudyStyleAlignment('quiz_each_other', 'quiz_each_other')).toBe(1.0);
  });

  test('any style gets partial credit', () => {
    expect(computeStudyStyleAlignment('any', 'discuss')).toBe(0.7);
    expect(computeStudyStyleAlignment('discuss', 'any')).toBe(0.7);
  });

  test('compatible styles score above 0.5', () => {
    expect(computeStudyStyleAlignment('discuss', 'teach_back')).toBeGreaterThan(0.5);
  });

  test('incompatible styles score below 0.5', () => {
    expect(computeStudyStyleAlignment('quiz_each_other', 'silent_together')).toBeLessThan(0.5);
  });
});

// ── Exported module shape ────────────────────────────────────────────────

describe('studyBuddyService — exports', () => {
  const svc = require('../../services/studyBuddyService');

  test('exports all expected functions', () => {
    const fns = [
      'createRequest', 'getUserRequests', 'getRequestById',
      'cancelRequest', 'togglePause', 'expireOverdue',
      'findBestMatch', 'findPotentialMatches', 'acceptMatch',
      'recordSession', 'submitFeedback', 'getDashboard',
    ];
    for (const fn of fns) {
      expect(typeof svc[fn]).toBe('function');
    }
  });

  test('exports scoring helpers for testing', () => {
    expect(typeof svc.computeCompatibility).toBe('function');
    expect(typeof svc.computeAvailabilityOverlap).toBe('function');
    expect(typeof svc.computeStudyStyleAlignment).toBe('function');
  });
});
