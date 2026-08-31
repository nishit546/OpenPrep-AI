/**
 * Unit tests for goalAlignmentService helper functions.
 * Validates pure logic without database dependency.
 */

const {
  computeIdealAllocation,
  computeActualAllocation,
  computeSubjectBreakdown,
  computeSubjectScore,
  computeOverallScore,
  getStatus,
  MIN_STUDY_MINUTES,
  ALIGNMENT_EXCELLENT,
  ALIGNMENT_GOOD,
  ALIGNMENT_FAIR,
} = require('../../services/goalAlignmentService');

function makeSubject(id, name, weightage) {
  return { id, name, weightage, toJSON() { return this; } };
}

function makeGoal(subjectId, metricType, currentValue, targetValue) {
  return {
    subject: subjectId,
    metricType,
    currentValue,
    targetValue,
    toJSON() { return this; },
  };
}

describe('goalAlignmentService – computeIdealAllocation', () => {
  it('distributes pct proportionally to weightage', () => {
    const subjects = [
      makeSubject('s1', 'Math', 60),
      makeSubject('s2', 'Science', 40),
    ];
    const result = computeIdealAllocation(subjects);

    expect(result.s1.idealPct).toBeCloseTo(60, 0);
    expect(result.s2.idealPct).toBeCloseTo(40, 0);
  });

  it('handles equal weightages', () => {
    const subjects = [
      makeSubject('s1', 'A', 1),
      makeSubject('s2', 'B', 1),
      makeSubject('s3', 'C', 1),
    ];
    const result = computeIdealAllocation(subjects);

    expect(result.s1.idealPct).toBeCloseTo(33.3, 0);
    expect(result.s2.idealPct).toBeCloseTo(33.3, 0);
  });

  it('returns empty for no subjects', () => {
    expect(computeIdealAllocation([])).toEqual({});
  });
});

describe('goalAlignmentService – computeActualAllocation', () => {
  it('aggregates minutes per subject from goals', () => {
    const subjects = [
      makeSubject('s1', 'Math', 50),
      makeSubject('s2', 'Science', 50),
    ];
    const goals = [
      makeGoal('s1', 'study_hours', 2, 3),  // 120 minutes
      makeGoal('s1', 'study_hours', 1, 2),  // 60 minutes → total 180
      makeGoal('s2', 'study_hours', 1.5, 2), // 90 minutes
    ];

    const result = computeActualAllocation(goals, subjects);

    expect(result.s1.actualMinutes).toBe(180);
    expect(result.s2.actualMinutes).toBe(90);
    // Total = 270; s1 = 180/270 = 66.7%, s2 = 90/270 = 33.3%
    expect(result.s1.actualPct).toBeCloseTo(66.7, 0);
    expect(result.s2.actualPct).toBeCloseTo(33.3, 0);
  });

  it('returns 0% for subjects with no goals', () => {
    const subjects = [makeSubject('s1', 'Math', 50)];
    const result = computeActualAllocation([], subjects);

    expect(result.s1.actualMinutes).toBe(0);
    expect(result.s1.actualPct).toBe(0);
  });
});

describe('goalAlignmentService – computeSubjectScore', () => {
  it('returns 100 for perfect alignment with good effort', () => {
    expect(computeSubjectScore(50, 50, 120)).toBe(100);
  });

  it('penalises large allocation gaps', () => {
    const score = computeSubjectScore(50, 80, 120);
    expect(score).toBeLessThan(100);
  });

  it('penalises zero study minutes', () => {
    const score = computeSubjectScore(50, 50, 0);
    expect(score).toBeLessThan(100);
  });

  it('returns 0 for very bad alignment', () => {
    const score = computeSubjectScore(10, 90, 0);
    expect(score).toBe(0);
  });
});

describe('goalAlignmentService – getStatus', () => {
  it('returns excellent for high scores', () => {
    expect(getStatus(ALIGNMENT_EXCELLENT)).toBe('excellent');
    expect(getStatus(100)).toBe('excellent');
  });

  it('returns good for mid-high scores', () => {
    expect(getStatus(ALIGNMENT_GOOD)).toBe('good');
  });

  it('returns fair for mid scores', () => {
    expect(getStatus(ALIGNMENT_FAIR)).toBe('fair');
  });

  it('returns poor for low scores', () => {
    expect(getStatus(10)).toBe('poor');
    expect(getStatus(0)).toBe('poor');
  });
});

describe('goalAlignmentService – computeOverallScore', () => {
  it('returns 0 for empty breakdown', () => {
    expect(computeOverallScore([], 0)).toBe(0);
  });

  it('returns 0 when study minutes are below minimum', () => {
    const breakdown = [{ score: 80 }];
    expect(computeOverallScore(breakdown, 5)).toBe(0);
  });

  it('computes weighted average with volume bonus', () => {
    const breakdown = [{ score: 80 }, { score: 80 }];
    const result = computeOverallScore(breakdown, 200);
    // avg = 80, volume bonus = min(10, 200/120) = 1
    expect(result).toBeGreaterThanOrEqual(80);
    expect(result).toBeLessThanOrEqual(90);
  });
});
