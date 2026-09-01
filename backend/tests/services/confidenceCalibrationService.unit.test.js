const {
  normalizeConfidence,
  calculateBrierScore,
  calculateAggregateMetrics,
  classifyConfidenceQuadrant,
  identifyBlindSpots
} = require('../../services/confidenceCalibrationService');

describe('confidenceCalibrationService', () => {

  describe('normalizeConfidence', () => {
    it('should normalize percentage numbers properly', () => {
      expect(normalizeConfidence(50)).toBe(0.5);
      expect(normalizeConfidence(100)).toBe(1.0);
      expect(normalizeConfidence(0)).toBe(0);
      expect(normalizeConfidence(0.5)).toBe(0.5); // already normalized
      expect(normalizeConfidence(110)).toBe(1.0);
      expect(normalizeConfidence(-10)).toBe(0);
    });

    it('should handle buckets', () => {
      expect(normalizeConfidence('guess')).toBe(0.2);
      expect(normalizeConfidence('certain')).toBe(1.0);
      expect(normalizeConfidence('neutral')).toBe(0.6);
      expect(normalizeConfidence('UNKNOWN')).toBe(null);
    });
  });

  describe('calculateBrierScore', () => {
    it('should calculate accurate binary Brier score', () => {
      // 100% confidence, correct => (1 - 1)^2 = 0
      expect(calculateBrierScore(100, true)).toBe(0);
      
      // 100% confidence, incorrect => (1 - 0)^2 = 1
      expect(calculateBrierScore(100, false)).toBe(1);
      
      // 50% confidence, correct => (0.5 - 1)^2 = 0.25
      expect(calculateBrierScore(50, true)).toBeCloseTo(0.25);
    });
  });

  describe('calculateAggregateMetrics', () => {
    it('should handle empty answers gracefully', () => {
      const metrics = calculateAggregateMetrics([]);
      expect(metrics.brierScore).toBeNull();
      expect(metrics.ece).toBeNull();
      expect(metrics.sampleSize).toBe(0);
    });

    it('should compute comprehensive calibration metrics correctly', () => {
      const answers = [
        { confidence: 0.9, isCorrect: true }, // confident, right
        { confidence: 0.9, isCorrect: true }, // confident, right
        { confidence: 0.9, isCorrect: false }, // confident, wrong -> Blind spot
        { confidence: 0.4, isCorrect: true }, // unsure, right
        { confidence: 0.2, isCorrect: false }, // unsure, wrong
      ];

      const metrics = calculateAggregateMetrics(answers);
      expect(metrics.sampleSize).toBe(5);
      expect(metrics.accuracy).toBe(3 / 5); // 0.6
      expect(metrics.averageConfidence).toBe((0.9 + 0.9 + 0.9 + 0.4 + 0.2) / 5); // 3.3 / 5 = 0.66
      
      expect(metrics.overUnderConfidence).toBeCloseTo(0.06); // 0.66 - 0.6 = +0.06 overconfident
      
      // ECE calculations
      expect(metrics.ece).toBeGreaterThan(0);
      
      // Reliability curve buckets
      const highBucket = metrics.reliabilityCurve.find(b => b.label === '80-90%');
      expect(highBucket.count).toBe(3); // The three 0.9s (Wait! 0.9 belongs to 90-100 bucket? 90% is 0.9. min is inclusive, max is exclusive. bucket 9 is 0.9 to 1.01)
      
      const highestBucket = metrics.reliabilityCurve.find(b => b.label === '90-100%');
      expect(highestBucket.count).toBe(3);
      expect(highestBucket.observedAccuracy).toBeCloseTo(0.666);
    });
  });

  describe('classifyConfidenceQuadrant', () => {
    it('should properly classify based on threshold', () => {
      expect(classifyConfidenceQuadrant(0.8, true)).toBe('confidently_right');
      expect(classifyConfidenceQuadrant(0.8, false)).toBe('confidently_wrong');
      expect(classifyConfidenceQuadrant(0.5, true)).toBe('unsure_but_right');
      expect(classifyConfidenceQuadrant(0.5, false)).toBe('unsure_and_wrong');
    });
  });

  describe('identifyBlindSpots', () => {
    it('should isolate high-confidence incorrect answers and sort by priority', () => {
      const answers = [
        { questionId: '1', confidence: 0.9, isCorrect: false },
        { questionId: '2', confidence: 0.95, isCorrect: false },
        { questionId: '3', confidence: 0.9, isCorrect: true },
        { questionId: '4', confidence: 0.4, isCorrect: false },
      ];
      
      const blindSpots = identifyBlindSpots(answers);
      expect(blindSpots.length).toBe(2);
      expect(blindSpots[0].questionId).toBe('2'); // Higher confidence first
      expect(blindSpots[1].questionId).toBe('1');
    });
  });

});
