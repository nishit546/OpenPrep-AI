/**
 * Unit tests for topicDifficultyEstimatorService helper functions.
 * Validates pure estimation logic without database dependency.
 */

const {
  computeDifficulty,
  computeConfidence,
  getDifficultyLabel,
  DIFFICULTY_LABELS,
  SIGNAL_WEIGHTS,
} = require('../../services/topicDifficultyEstimatorService');

function makeRecord(overrides = {}) {
  return {
    averageQuizScore: null,
    quizCount: 0,
    totalStudyMinutes: 0,
    averageTimePerQuiz: 0,
    selfReportedDifficulty: null,
    trend: 'new',
    ...overrides,
  };
}

describe('topicDifficultyEstimatorService – computeDifficulty', () => {
  it('returns neutral 5 for empty record', () => {
    expect(computeDifficulty(makeRecord())).toBe(5);
  });

  it('increases difficulty when quiz scores are low', () => {
    const record = makeRecord({ averageQuizScore: 20, quizCount: 3 });
    const difficulty = computeDifficulty(record);
    expect(difficulty).toBeGreaterThan(5);
  });

  it('decreases difficulty when quiz scores are high', () => {
    const record = makeRecord({ averageQuizScore: 90, quizCount: 3 });
    const difficulty = computeDifficulty(record);
    expect(difficulty).toBeLessThan(5);
  });

  it('increases difficulty with high time per quiz', () => {
    const fast = makeRecord({ averageTimePerQuiz: 3, quizCount: 2 });
    const slow = makeRecord({ averageTimePerQuiz: 15, quizCount: 2 });
    expect(computeDifficulty(slow)).toBeGreaterThan(computeDifficulty(fast));
  });

  it('incorporates self-reported difficulty', () => {
    const low = makeRecord({ selfReportedDifficulty: 2 });
    const high = makeRecord({ selfReportedDifficulty: 9 });
    expect(computeDifficulty(high)).toBeGreaterThan(computeDifficulty(low));
  });

  it('blends quiz and self-report signals', () => {
    const quizHard = makeRecord({ averageQuizScore: 30, quizCount: 3, selfReportedDifficulty: 8 });
    const quizEasy = makeRecord({ averageQuizScore: 80, quizCount: 3, selfReportedDifficulty: 3 });
    expect(computeDifficulty(quizHard)).toBeGreaterThan(computeDifficulty(quizEasy));
  });

  it('clamps between 1 and 10', () => {
    const extreme = makeRecord({ averageQuizScore: 0, quizCount: 5, averageTimePerQuiz: 25, selfReportedDifficulty: 10 });
    expect(computeDifficulty(extreme)).toBeLessThanOrEqual(10);
    expect(computeDifficulty(extreme)).toBeGreaterThanOrEqual(1);
  });

  it('weights are consistent', () => {
    const total = Object.values(SIGNAL_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

describe('topicDifficultyEstimatorService – computeConfidence', () => {
  it('returns 0 for no data', () => {
    expect(computeConfidence(makeRecord())).toBe(0);
  });

  it('increases with more quiz attempts', () => {
    const low = computeConfidence(makeRecord({ quizCount: 1 }));
    const high = computeConfidence(makeRecord({ quizCount: 5 }));
    expect(high).toBeGreaterThan(low);
  });

  it('boosts when both quiz and self-report present', () => {
    const quizOnly = computeConfidence(makeRecord({ quizCount: 3 }));
    const both = computeConfidence(makeRecord({ quizCount: 3, selfReportedDifficulty: 5 }));
    expect(both).toBeGreaterThanOrEqual(quizOnly);
  });

  it('caps at 100', () => {
    expect(computeConfidence(makeRecord({ quizCount: 20, selfReportedDifficulty: 5 }))).toBe(100);
  });
});

describe('topicDifficultyEstimatorService – getDifficultyLabel', () => {
  it('returns correct labels for boundaries', () => {
    expect(getDifficultyLabel(1)).toBe('trivial');
    expect(getDifficultyLabel(2)).toBe('trivial');
    expect(getDifficultyLabel(3)).toBe('easy');
    expect(getDifficultyLabel(5)).toBe('moderate');
    expect(getDifficultyLabel(7)).toBe('hard');
    expect(getDifficultyLabel(9)).toBe('extreme');
    expect(getDifficultyLabel(10)).toBe('extreme');
  });

  it('labels are sorted ascending by max', () => {
    for (let i = 1; i < DIFFICULTY_LABELS.length; i++) {
      expect(DIFFICULTY_LABELS[i].max).toBeGreaterThan(DIFFICULTY_LABELS[i - 1].max);
    }
  });
});
