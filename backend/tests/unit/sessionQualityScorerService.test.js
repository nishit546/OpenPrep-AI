/**
 * Unit tests for sessionQualityScorerService helper functions.
 * Validates pure scoring logic without database dependency.
 */

const {
  computeFocusScore,
  computeEfficiencyScore,
  computeRetentionScore,
  computeHealthScore,
  computeOverallScore,
  scoreToGrade,
  OPTIMAL_MIN_MINUTES,
  OPTIMAL_MAX_MINUTES,
  GRADE_THRESHOLDS,
  DIMENSION_WEIGHTS,
} = require('../../services/sessionQualityScorerService');

describe('sessionQualityScorerService – computeFocusScore', () => {
  it('returns high score for high focus rating, zero interruptions', () => {
    const score = computeFocusScore(5, 0, 30);
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it('returns low score for low focus rating', () => {
    const score = computeFocusScore(1, 0, 30);
    expect(score).toBeLessThanOrEqual(20);
  });

  it('penalises interruptions heavily', () => {
    const clean = computeFocusScore(4, 0, 30);
    const interrupted = computeFocusScore(4, 3, 30);
    expect(interrupted).toBeLessThan(clean);
  });

  it('gives sustain bonus for sessions >= 25 min', () => {
    const short = computeFocusScore(3, 0, 20);
    const sustained = computeFocusScore(3, 0, 30);
    expect(sustained).toBeGreaterThanOrEqual(short);
  });

  it('clamps to 0 minimum', () => {
    const score = computeFocusScore(1, 10, 5);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('sessionQualityScorerService – computeEfficiencyScore', () => {
  it('returns 0 for zero duration', () => {
    expect(computeEfficiencyScore(0, 5, 10, 2)).toBe(0);
  });

  it('rewards high activity rate', () => {
    const low = computeEfficiencyScore(60, 1, 5, 0);
    const high = computeEfficiencyScore(60, 3, 20, 5);
    expect(high).toBeGreaterThan(low);
  });

  it('rewards activity variety', () => {
    const single = computeEfficiencyScore(30, 2, 0, 0);
    const varied = computeEfficiencyScore(30, 2, 10, 2);
    expect(varied).toBeGreaterThan(single);
  });

  it('caps at 100', () => {
    const score = computeEfficiencyScore(1, 10, 100, 10);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('sessionQualityScorerService – computeRetentionScore', () => {
  it('returns neutral 50 when no quiz/flashcard data', () => {
    expect(computeRetentionScore(0, 0, 0, 0)).toBe(50);
  });

  it('weights quiz score when only quizzes taken', () => {
    const score = computeRetentionScore(80, 0, 3, 0);
    expect(score).toBeCloseTo(80, 0);
  });

  it('weights flashcard accuracy when only flashcards reviewed', () => {
    const score = computeRetentionScore(0, 70, 0, 10);
    expect(score).toBeCloseTo(70, 0);
  });

  it('blends both when both present', () => {
    const score = computeRetentionScore(80, 60, 3, 10);
    // quiz weight 0.6, flashcard weight 0.4 → (80*0.6 + 60*0.4) / 1.0 = 72
    expect(score).toBeCloseTo(72, 0);
  });
});

describe('sessionQualityScorerService – computeHealthScore', () => {
  it('returns high score for optimal duration during peak hours', () => {
    const score = computeHealthScore(45, 10);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('penalises very short sessions', () => {
    const score = computeHealthScore(5, 10);
    expect(score).toBeLessThan(50);
  });

  it('penalises non-peak study hours', () => {
    const peak = computeHealthScore(45, 10);
    const offPeak = computeHealthScore(45, 3);
    expect(peak).toBeGreaterThan(offPeak);
  });

  it('handles very long sessions gracefully', () => {
    const score = computeHealthScore(180, 10);
    expect(score).toBeGreaterThanOrEqual(20);
  });
});

describe('sessionQualityScorerService – computeOverallScore', () => {
  it('weights dimensions correctly', () => {
    const result = computeOverallScore({
      focusScore: 100, efficiencyScore: 0, retentionScore: 0, healthScore: 0,
    });
    expect(result).toBeCloseTo(DIMENSION_WEIGHTS.focus * 100, 0);
  });

  it('returns 0 when all dimensions are 0', () => {
    expect(computeOverallScore({ focusScore: 0, efficiencyScore: 0, retentionScore: 0, healthScore: 0 })).toBe(0);
  });

  it('returns 100 when all dimensions are 100', () => {
    const result = computeOverallScore({ focusScore: 100, efficiencyScore: 100, retentionScore: 100, healthScore: 100 });
    expect(result).toBeCloseTo(100, 0);
  });
});

describe('sessionQualityScorerService – scoreToGrade', () => {
  it('maps scores to correct grades', () => {
    expect(scoreToGrade(95)).toBe('A+');
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(35)).toBe('D');
    expect(scoreToGrade(10)).toBe('F');
  });

  it('returns F for negative scores', () => {
    expect(scoreToGrade(-5)).toBe('F');
  });
});

describe('sessionQualityScorerService – constants', () => {
  it('has optimal range with min < max', () => {
    expect(OPTIMAL_MIN_MINUTES).toBeLessThan(OPTIMAL_MAX_MINUTES);
  });

  it('grades are sorted descending by min threshold', () => {
    for (let i = 1; i < GRADE_THRESHOLDS.length; i++) {
      expect(GRADE_THRESHOLDS[i].min).toBeLessThan(GRADE_THRESHOLDS[i - 1].min);
    }
  });

  it('dimension weights sum to 1', () => {
    const total = Object.values(DIMENSION_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});
