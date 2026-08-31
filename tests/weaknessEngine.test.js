const { calculateMasteryScore, getMasteryCategory } = require('../backend/services/weaknessEngine');

describe('Mastery Engine Weighted Calculation Matrix Suite', () => {
  test('Should classify low performing exposed tracks as critical vulnerabilities', () => {
    const rawMetrics = { accuracy: 30, retentionRate: 40, daysSinceReview: 15, pyqWeight: 90 };
    const score = calculateMasteryScore(rawMetrics);
    
    expect(score).toBeLessThan(40);
    expect(getMasteryCategory(score)).toBe('Critical Vulnerability');
  });

  test('Should handle consistent recent performance streaks with full green scoring outputs', () => {
    const rawMetrics = { accuracy: 95, retentionRate: 90, daysSinceReview: 1, pyqWeight: 20 };
    const score = calculateMasteryScore(rawMetrics);
    
    expect(score).toBeGreaterThan(75);
    expect(getMasteryCategory(score)).toBe('Mastered');
  });

  test('Should strictly bound calculated boundaries to ensure scores never fall below zero', () => {
    const absoluteZeroMetrics = { accuracy: 0, retentionRate: 0, daysSinceReview: 100, pyqWeight: 100 };
    const score = calculateMasteryScore(absoluteZeroMetrics);
    
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
