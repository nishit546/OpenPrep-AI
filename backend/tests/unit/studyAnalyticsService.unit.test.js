/**
 * Unit tests for studyAnalyticsService.
 *
 * Tests cover: snapshot generation pipeline, consistency metrics,
 * subject distribution balance scoring, performance trend detection,
 * readiness projection via linear regression, insight generation,
 * and recommendation logic.
 */

const {
  computeBalanceScore,
  toDateString,
  linearRegression,
  generateInsights,
  generateRecommendations,
  getWeekPeriod,
  getMonthPeriod,
  getDayPeriod,
  INSIGHT_TYPES,
  PRIORITY,
  INSIGHT_THRESHOLDS,
} = require('../../services/studyAnalyticsService');

describe('studyAnalyticsService', () => {
  // ── Balance Score ────────────────────────────────────────────────────

  describe('computeBalanceScore', () => {
    it('should return 100 for a single subject (perfectly focused)', () => {
      expect(computeBalanceScore([100])).toBe(100);
    });

    it('should return 100 for perfectly even distribution', () => {
      expect(computeBalanceScore([25, 25, 25, 25])).toBe(100);
    });

    it('should return a low score for highly skewed distribution', () => {
      const score = computeBalanceScore([80, 5, 5, 5, 5]);
      expect(score).toBeLessThan(50);
    });

    it('should return 0 for all zeros', () => {
      expect(computeBalanceScore([0, 0, 0])).toBe(0);
    });

    it('should handle empty array', () => {
      expect(computeBalanceScore([])).toBe(100);
    });
  });

  // ── Linear Regression ────────────────────────────────────────────────

  describe('linearRegression', () => {
    it('should return zero slope for constant values', () => {
      const result = linearRegression([50, 50, 50, 50]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(50);
    });

    it('should return positive slope for increasing values', () => {
      const result = linearRegression([20, 40, 60, 80]);
      expect(result.slope).toBeGreaterThan(0);
    });

    it('should return negative slope for decreasing values', () => {
      const result = linearRegression([80, 60, 40, 20]);
      expect(result.slope).toBeLessThan(0);
    });

    it('should return default values for single-element array', () => {
      const result = linearRegression([42]);
      expect(result.intercept).toBe(42);
    });

    it('should return defaults for empty array', () => {
      const result = linearRegression([]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(50);
    });

    it('should accurately predict known linear data', () => {
      // y = 2x + 10
      const values = [10, 12, 14, 16, 18];
      const result = linearRegression(values);
      expect(result.slope).toBeCloseTo(2, 0);
      expect(result.intercept).toBeCloseTo(10, 0);
    });
  });

  // ── Insight Generation ───────────────────────────────────────────────

  describe('generateInsights', () => {
    const baseConsistency = {
      consistencyScore: 60,
      activeDays: 4,
      totalDays: 7,
      totalStudyMinutes: 300,
    };

    const baseSubjectDist = {
      balanceScore: 70,
      mostStudied: { name: 'Math', percentage: 40 },
      leastStudied: { name: 'History', percentage: 10 },
    };

    const basePerformance = {
      quizScoreTrend: 'stable',
      improvementRate: 0,
      flashcardRetentionRate: 75,
    };

    const baseReadiness = {
      currentReadiness: 60,
      readinessDelta: 2,
    };

    const baseQuality = {
      peakStudyHour: 10,
      efficiencyRating: 'good',
    };

    const baseGoals = {
      totalGoals: 3,
      completedGoals: 2,
      goalCompletionRate: 67,
    };

    it('should generate no critical insights for healthy metrics', () => {
      const insights = generateInsights(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        baseQuality,
        baseGoals,
      );
      const criticals = insights.filter((i) => i.priority === PRIORITY.CRITICAL);
      expect(criticals.length).toBe(0);
    });

    it('should flag low consistency as high priority', () => {
      const insights = generateInsights(
        { ...baseConsistency, consistencyScore: 15, activeDays: 1, totalDays: 7 },
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        baseQuality,
        baseGoals,
      );
      const consistencyInsight = insights.find(
        (i) => i.type === INSIGHT_TYPES.CONSISTENCY && i.priority === PRIORITY.HIGH,
      );
      expect(consistencyInsight).toBeDefined();
      expect(consistencyInsight.actionable).toBe(true);
    });

    it('should flag declining quiz scores as high priority', () => {
      const insights = generateInsights(
        baseConsistency,
        baseSubjectDist,
        { ...basePerformance, quizScoreTrend: 'declining', improvementRate: -10 },
        baseReadiness,
        baseQuality,
        baseGoals,
      );
      const perfInsight = insights.find(
        (i) => i.type === INSIGHT_TYPES.PERFORMANCE && i.priority === PRIORITY.HIGH,
      );
      expect(perfInsight).toBeDefined();
    });

    it('should flag critical readiness drops', () => {
      const insights = generateInsights(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        { ...baseReadiness, readinessDelta: -10 },
        baseQuality,
        baseGoals,
      );
      const critical = insights.find((i) => i.priority === PRIORITY.CRITICAL);
      expect(critical).toBeDefined();
      expect(critical.type).toBe(INSIGHT_TYPES.READINESS);
    });

    it('should flag poor balance as medium priority', () => {
      const insights = generateInsights(
        baseConsistency,
        { ...baseSubjectDist, balanceScore: 30 },
        basePerformance,
        baseReadiness,
        baseQuality,
        baseGoals,
      );
      const balanceInsight = insights.find((i) => i.type === INSIGHT_TYPES.BALANCE);
      expect(balanceInsight).toBeDefined();
      expect(balanceInsight.priority).toBe(PRIORITY.MEDIUM);
    });

    it('should flag late-night study as medium priority', () => {
      const insights = generateInsights(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        { ...baseQuality, peakStudyHour: 23 },
        baseGoals,
      );
      const timingInsight = insights.find((i) => i.type === INSIGHT_TYPES.TIMING);
      expect(timingInsight).toBeDefined();
    });

    it('should sort insights by priority', () => {
      const insights = generateInsights(
        { ...baseConsistency, consistencyScore: 10, activeDays: 0, totalDays: 7 },
        { ...baseSubjectDist, balanceScore: 20 },
        { ...basePerformance, quizScoreTrend: 'declining', improvementRate: -15 },
        { ...baseReadiness, readinessDelta: -10 },
        { ...baseQuality, peakStudyHour: 23 },
        { ...baseGoals, totalGoals: 3, completedGoals: 0, goalCompletionRate: 0 },
      );
      for (let i = 1; i < insights.length; i++) {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(order[insights[i].priority]).toBeGreaterThanOrEqual(order[insights[i - 1].priority]);
      }
    });
  });

  // ── Recommendation Generation ────────────────────────────────────────

  describe('generateRecommendations', () => {
    const baseConsistency = {
      totalStudyMinutes: 1200,
      consistencyScore: 80,
    };

    const baseSubjectDist = {
      balanceScore: 70,
      leastStudied: { name: 'Physics', percentage: 5 },
    };

    const basePerformance = {
      quizScoreTrend: 'stable',
      improvementRate: 0,
      flashcardsReviewed: 50,
      flashcardRetentionRate: 70,
    };

    const baseReadiness = {
      currentReadiness: 70,
      projectedReadiness: 85,
    };

    const baseQuality = {
      efficiencyRating: 'good',
      peakStudyHour: 10,
    };

    it('should generate low study time recommendation when minutes are low', () => {
      const recs = generateRecommendations(
        { ...baseConsistency, totalStudyMinutes: 100 },
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        baseQuality,
      );
      const studyTimeRec = recs.find((r) => r.category === 'study_time');
      expect(studyTimeRec).toBeDefined();
      expect(studyTimeRec.impact).toBe('high');
    });

    it('should generate performance recommendation for declining scores', () => {
      const recs = generateRecommendations(
        baseConsistency,
        baseSubjectDist,
        { ...basePerformance, quizScoreTrend: 'declining' },
        baseReadiness,
        baseQuality,
      );
      const perfRec = recs.find((r) => r.category === 'performance');
      expect(perfRec).toBeDefined();
    });

    it('should generate readiness recommendation when projected is low', () => {
      const recs = generateRecommendations(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        { ...baseReadiness, projectedReadiness: 55 },
        baseQuality,
      );
      const readinessRec = recs.find((r) => r.category === 'readiness');
      expect(readinessRec).toBeDefined();
      expect(readinessRec.impact).toBe('high');
    });

    it('should generate session quality recommendation for poor efficiency', () => {
      const recs = generateRecommendations(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        { ...baseQuality, efficiencyRating: 'needs_improvement' },
      );
      const sessionRec = recs.find((r) => r.category === 'session_quality');
      expect(sessionRec).toBeDefined();
    });

    it('should generate low retention recommendation', () => {
      const recs = generateRecommendations(
        baseConsistency,
        baseSubjectDist,
        { ...basePerformance, flashcardsReviewed: 30, flashcardRetentionRate: 45 },
        baseReadiness,
        baseQuality,
      );
      const retentionRec = recs.find((r) => r.category === 'retention');
      expect(retentionRec).toBeDefined();
    });

    it('should generate late-night study recommendation', () => {
      const recs = generateRecommendations(
        baseConsistency,
        baseSubjectDist,
        basePerformance,
        baseReadiness,
        { ...baseQuality, peakStudyHour: 23 },
      );
      const timingRec = recs.find((r) => r.category === 'timing');
      expect(timingRec).toBeDefined();
    });

    it('should generate subject balance recommendation for poor balance', () => {
      const recs = generateRecommendations(
        baseConsistency,
        { ...baseSubjectDist, balanceScore: 30 },
        basePerformance,
        baseReadiness,
        baseQuality,
      );
      const balanceRec = recs.find((r) => r.category === 'subject_balance');
      expect(balanceRec).toBeDefined();
    });
  });

  // ── Period Helpers ───────────────────────────────────────────────────

  /**
   * Dates here are built with `new Date(year, monthIndex, day)`, which is
   * local midnight. `new Date('2026-08-15')` is *UTC* midnight, which is a
   * different calendar day west of UTC — passing that in and asserting on a
   * local date string tests the runner's timezone rather than the helper.
   */
  const localDate = (year, month, day) => new Date(year, month - 1, day);

  describe('getWeekPeriod', () => {
    it('should return a 7-day period', () => {
      const { periodStart, periodEnd } = getWeekPeriod(localDate(2026, 8, 25));
      const start = new Date(`${periodStart}T00:00:00Z`);
      const end = new Date(`${periodEnd}T00:00:00Z`);
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(6); // 7 days inclusive = 6 day diff
    });

    it('should start the week on the Monday', () => {
      // 25 August 2026 is a Tuesday.
      expect(getWeekPeriod(localDate(2026, 8, 25)).periodStart).toBe('2026-08-24');
    });

    it('should treat Sunday as the end of the week it closes, not the start of the next', () => {
      // 30 August 2026 is a Sunday; its week began on Monday the 24th.
      const { periodStart, periodEnd } = getWeekPeriod(localDate(2026, 8, 30));
      expect(periodStart).toBe('2026-08-24');
      expect(periodEnd).toBe('2026-08-30');
    });

    it('should carry the week across a month boundary', () => {
      // Monday 31 August 2026 runs into September.
      const { periodStart, periodEnd } = getWeekPeriod(localDate(2026, 8, 31));
      expect(periodStart).toBe('2026-08-31');
      expect(periodEnd).toBe('2026-09-06');
    });

    it('should default to current date when no argument', () => {
      const { periodStart, periodEnd } = getWeekPeriod();
      const today = toDateString(new Date());

      // Compared as YYYY-MM-DD strings, which sort lexicographically and carry
      // no timezone. Parsing periodStart back with `new Date()` reads it as UTC
      // midnight, which is *ahead* of local midnight east of UTC — so early on
      // a Monday in Auckland the week's own start looked like it was in the
      // future.
      expect(periodStart <= today).toBe(true);
      expect(today <= periodEnd).toBe(true);
    });
  });

  describe('getMonthPeriod', () => {
    it('should return a period within the same month', () => {
      const { periodStart, periodEnd } = getMonthPeriod(localDate(2026, 8, 15));
      expect(periodStart).toBe('2026-08-01');
      expect(periodEnd).toBe('2026-08-31');
    });

    it('should end February on the 28th in a common year', () => {
      expect(getMonthPeriod(localDate(2026, 2, 10)).periodEnd).toBe('2026-02-28');
    });

    it('should end February on the 29th in a leap year', () => {
      expect(getMonthPeriod(localDate(2028, 2, 10)).periodEnd).toBe('2028-02-29');
    });

    it('should end a 30-day month on the 30th', () => {
      expect(getMonthPeriod(localDate(2026, 4, 10)).periodEnd).toBe('2026-04-30');
    });
  });

  describe('getDayPeriod', () => {
    it('should return same date for start and end', () => {
      const { periodStart, periodEnd } = getDayPeriod(localDate(2026, 8, 15));
      expect(periodStart).toBe('2026-08-15');
      expect(periodEnd).toBe('2026-08-15');
    });
  });

  /**
   * All three helpers build their boundary in local time and used to serialise
   * it with toISOString(), which converts to UTC first. East of UTC that shifts
   * the label back a day — local midnight on 1 August in IST is
   * 2026-07-31T18:30:00Z — so every snapshot period was labelled a day early
   * for the majority of this app's users.
   */
  describe('period labels do not shift with the timezone', () => {
    it('formats a date from its local calendar fields', () => {
      expect(toDateString(localDate(2026, 8, 1))).toBe('2026-08-01');
      expect(toDateString(localDate(2026, 1, 1))).toBe('2026-01-01');
      expect(toDateString(localDate(2026, 12, 31))).toBe('2026-12-31');
    });

    it('zero-pads single-digit months and days', () => {
      expect(toDateString(localDate(2026, 3, 7))).toBe('2026-03-07');
    });

    it('starts August on the 1st, not on 31 July', () => {
      // The exact regression: toISOString() on a local-midnight Date.
      expect(getMonthPeriod(localDate(2026, 8, 15)).periodStart).toBe('2026-08-01');
    });

    it('reports the local day for a time late in the evening', () => {
      // 23:30 local on 15 August is already 16 August in UTC for IST.
      const lateEvening = new Date(2026, 7, 15, 23, 30);
      expect(getDayPeriod(lateEvening).periodStart).toBe('2026-08-15');
    });

    it('reports the local day for a time early in the morning', () => {
      // 00:30 local on 15 August is still 14 August in UTC west of it.
      const earlyMorning = new Date(2026, 7, 15, 0, 30);
      expect(getDayPeriod(earlyMorning).periodStart).toBe('2026-08-15');
    });

    it('keeps the week boundaries on their local days', () => {
      const { periodStart, periodEnd } = getWeekPeriod(new Date(2026, 7, 25, 23, 45));
      expect(periodStart).toBe('2026-08-24');
      expect(periodEnd).toBe('2026-08-30');
    });
  });

  // ── Constants ────────────────────────────────────────────────────────

  describe('constants', () => {
    it('should have all insight types defined', () => {
      expect(INSIGHT_TYPES.CONSISTENCY).toBeDefined();
      expect(INSIGHT_TYPES.BALANCE).toBeDefined();
      expect(INSIGHT_TYPES.PERFORMANCE).toBeDefined();
      expect(INSIGHT_TYPES.RETENTION).toBeDefined();
      expect(INSIGHT_TYPES.READINESS).toBeDefined();
      expect(INSIGHT_TYPES.TIMING).toBeDefined();
      expect(INSIGHT_TYPES.GOAL).toBeDefined();
    });

    it('should have all priorities defined', () => {
      expect(PRIORITY.CRITICAL).toBe('critical');
      expect(PRIORITY.HIGH).toBe('high');
      expect(PRIORITY.MEDIUM).toBe('medium');
      expect(PRIORITY.LOW).toBe('low');
    });

    it('should have valid thresholds', () => {
      expect(INSIGHT_THRESHOLDS.highConsistency).toBeGreaterThan(INSIGHT_THRESHOLDS.mediumConsistency);
      expect(INSIGHT_THRESHOLDS.mediumConsistency).toBeGreaterThan(INSIGHT_THRESHOLDS.lowConsistency);
    });
  });
});
