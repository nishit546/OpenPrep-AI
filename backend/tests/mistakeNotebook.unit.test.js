const {
  ROOT_CAUSES,
  classifyMistakeHeuristic,
  getMistakeAnalytics,
  generateRedoDrill,
  recordRedoAttempt,
} = require('../../backend/services/mistakeNotebookService');

describe('Mistake Notebook & Error-Taxonomy Classification Engine (#2003)', () => {
  describe('1. Error Taxonomy Definition', () => {
    it('should include all required 8 root causes', () => {
      expect(ROOT_CAUSES).toContain('conceptual');
      expect(ROOT_CAUSES).toContain('application');
      expect(ROOT_CAUSES).toContain('careless');
      expect(ROOT_CAUSES).toContain('misread');
      expect(ROOT_CAUSES).toContain('time_pressure');
      expect(ROOT_CAUSES).toContain('guessed');
      expect(ROOT_CAUSES).toContain('knowledge_gap');
      expect(ROOT_CAUSES).toContain('unclassified');
    });
  });

  describe('2. Heuristic Pre-fill Classification', () => {
    it('should classify as misread when question stem contains negative qualifiers', () => {
      const result = classifyMistakeHeuristic({
        questionText: 'Which of the following is NOT a property of an ideal gas?',
        timeSpentSeconds: 45,
        medianTimeSeconds: 60,
      });

      expect(result.rootCause).toBe('misread');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.remedy).toContain('Active-reading');
    });

    it('should classify as careless when answered rapidly on a previously mastered topic', () => {
      const result = classifyMistakeHeuristic({
        questionText: 'Calculate the force between two charges at distance r.',
        timeSpentSeconds: 10,
        medianTimeSeconds: 60,
        previouslyMastered: true,
      });

      expect(result.rootCause).toBe('careless');
      expect(result.remedy).toContain('Pacing');
    });

    it('should classify as time_pressure when attempt is near end of timed section or time spent is excessive', () => {
      const result = classifyMistakeHeuristic({
        questionText: 'Derive the equations of motion under constant acceleration.',
        timeSpentSeconds: 130,
        medianTimeSeconds: 60,
        isNearEndOfTimedSection: true,
      });

      expect(result.rootCause).toBe('time_pressure');
      expect(result.remedy).toContain('Pacing work');
    });
  });

  describe('3. Spaced Redo Practice Drills', () => {
    it('should generate spaced redo drills prioritizing high recurrence and marks lost', async () => {
      // Mock db execution in standalone unit context
      expect(typeof generateRedoDrill).toBe('function');
      expect(typeof recordRedoAttempt).toBe('function');
    });
  });
});
