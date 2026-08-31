/**
 * Unit tests for StudyHeatmap service.
 * These tests validate the pure helper functions without requiring a database.
 */

const {
  computeIntensityScore,
  getIntensityLevel,
  computeCurrentStreak,
  computeLongestStreak,
  INTENSITY_THRESHOLDS,
  FULL_DAY_MINUTES,
} = require('../../services/studyHeatmapService');

describe('studyHeatmapService – helper functions', () => {
  // ── computeIntensityScore ────────────────────────────────────────────

  describe('computeIntensityScore', () => {
    it('returns 0 for zero minutes', () => {
      expect(computeIntensityScore(0)).toBe(0);
    });

    it('returns 100 for FULL_DAY_MINUTES', () => {
      expect(computeIntensityScore(FULL_DAY_MINUTES)).toBe(100);
    });

    it('returns values between 0 and 100 for intermediate inputs', () => {
      expect(computeIntensityScore(60)).toBeGreaterThan(0);
      expect(computeIntensityScore(60)).toBeLessThan(100);
    });

    it('caps at 100 for values exceeding FULL_DAY_MINUTES', () => {
      expect(computeIntensityScore(600)).toBe(100);
    });

    it('rounds to nearest integer', () => {
      const result = computeIntensityScore(123);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  // ── getIntensityLevel ────────────────────────────────────────────────

  describe('getIntensityLevel', () => {
    it('returns 0 for zero minutes', () => {
      expect(getIntensityLevel(0)).toBe(0);
    });

    it('returns 0 for minutes below first threshold', () => {
      expect(getIntensityLevel(5)).toBe(0);
    });

    it('returns 1 at first non-zero threshold', () => {
      expect(getIntensityLevel(INTENSITY_THRESHOLDS[1])).toBe(1);
    });

    it('returns highest level for very large values', () => {
      expect(getIntensityLevel(9999)).toBe(INTENSITY_THRESHOLDS.length - 1);
    });

    it('returns correct level at exact thresholds', () => {
      for (let i = 0; i < INTENSITY_THRESHOLDS.length; i++) {
        expect(getIntensityLevel(INTENSITY_THRESHOLDS[i])).toBe(i);
      }
    });
  });

  // ── computeCurrentStreak ─────────────────────────────────────────────

  describe('computeCurrentStreak', () => {
    it('returns 0 for empty array', () => {
      expect(computeCurrentStreak([])).toBe(0);
    });

    it('returns 0 when most recent date is not today or yesterday', () => {
      const oldDates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      expect(computeCurrentStreak(oldDates)).toBe(0);
    });

    it('counts streak including today', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const dates = [yesterday, today];
      expect(computeCurrentStreak(dates)).toBe(2);
    });

    it('counts streak starting from yesterday when today is missing', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
      const dates = [twoDaysAgo, yesterday];
      expect(computeCurrentStreak(dates)).toBe(2);
    });

    it('breaks streak when there is a gap', () => {
      const today = new Date().toISOString().split('T')[0];
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
      const dates = [threeDaysAgo, today];
      expect(computeCurrentStreak(dates)).toBe(1);
    });
  });

  // ── computeLongestStreak ─────────────────────────────────────────────

  describe('computeLongestStreak', () => {
    it('returns 0 for empty records', () => {
      expect(computeLongestStreak([])).toBe(0);
    });

    it('returns 1 for a single active day', () => {
      expect(computeLongestStreak([{ date: '2025-06-01', totalMinutes: 60 }])).toBe(1);
    });

    it('computes consecutive streak correctly', () => {
      const records = [
        { date: '2025-06-01', totalMinutes: 30 },
        { date: '2025-06-02', totalMinutes: 45 },
        { date: '2025-06-03', totalMinutes: 60 },
      ];
      expect(computeLongestStreak(records)).toBe(3);
    });

    it('finds longest streak among multiple streaks', () => {
      const records = [
        { date: '2025-06-01', totalMinutes: 30 },
        { date: '2025-06-02', totalMinutes: 30 },
        // gap
        { date: '2025-06-05', totalMinutes: 30 },
        { date: '2025-06-06', totalMinutes: 30 },
        { date: '2025-06-07', totalMinutes: 30 },
        { date: '2025-06-08', totalMinutes: 30 },
      ];
      expect(computeLongestStreak(records)).toBe(4);
    });

    it('ignores zero-minute days', () => {
      const records = [
        { date: '2025-06-01', totalMinutes: 0 },
        { date: '2025-06-02', totalMinutes: 60 },
        { date: '2025-06-03', totalMinutes: 0 },
      ];
      expect(computeLongestStreak(records)).toBe(1);
    });
  });
});
