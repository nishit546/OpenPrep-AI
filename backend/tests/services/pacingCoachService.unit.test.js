const pacingCoachService = require('../../services/pacingCoachService');

describe('pacingCoachService', () => {
  describe('createPacingPlan', () => {
    it('should allocate proportional budgets based on marks and difficulty', () => {
      const questions = [
        { id: '1', maxScore: 1, difficulty: 'easy' }, // weight: 0.8
        { id: '2', maxScore: 2, difficulty: 'medium' }, // weight: 2.0
        { id: '3', maxScore: 3, difficulty: 'hard' }, // weight: 3.6
      ];
      // Total weight: 6.4
      
      const plan = pacingCoachService.createPacingPlan({
        totalDurationSeconds: 1000,
        questions,
        reviewBufferPercent: 10,
        personalizationFactor: 1.0,
      });

      expect(plan.usableTimeSeconds).toBe(900); // 10% of 1000 = 100
      expect(plan.reviewBufferSeconds).toBe(100);
      expect(plan.questionBudgets.length).toBe(3);
      
      const q1 = plan.questionBudgets.find(q => q.questionId === '1');
      const q2 = plan.questionBudgets.find(q => q.questionId === '2');
      const q3 = plan.questionBudgets.find(q => q.questionId === '3');
      
      expect(q1.budgetSeconds).toBeGreaterThan(0);
      expect(q3.budgetSeconds).toBeGreaterThan(q2.budgetSeconds);
      expect(q2.budgetSeconds).toBeGreaterThan(q1.budgetSeconds);
      
      const totalAllocated = q1.budgetSeconds + q2.budgetSeconds + q3.budgetSeconds;
      expect(totalAllocated).toBeLessThanOrEqual(900);
    });

    it('should cap budget at total usable time even if personalization factor is > 1', () => {
      const questions = [
        { id: '1', maxScore: 1, difficulty: 'medium' },
      ];
      
      const plan = pacingCoachService.createPacingPlan({
        totalDurationSeconds: 100,
        questions,
        reviewBufferPercent: 0,
        personalizationFactor: 1.5,
      });

      expect(plan.questionBudgets[0].budgetSeconds).toBe(100); // capped at usable time
    });
    
    it('should return error for invalid duration', () => {
      const plan = pacingCoachService.createPacingPlan({
        totalDurationSeconds: 0,
        questions: [{ id: '1', maxScore: 1 }]
      });
      expect(plan.error).toBeDefined();
    });
  });

  describe('calculateRunningPace', () => {
    it('should return correct pace state', () => {
      const plan = {
        allocatedTotalSeconds: 100,
        questionBudgets: [
          { questionId: '1', budgetSeconds: 50 },
          { questionId: '2', budgetSeconds: 50 },
        ]
      };
      
      const aheadState = pacingCoachService.calculateRunningPace({
        elapsedSeconds: 20,
        totalDurationSeconds: 100,
        completedQuestions: [{ questionId: '1' }],
        pacingPlan: plan,
      });
      expect(aheadState.paceState).toBe('ahead'); // consumed budget = 50, elapsed = 20
      
      const behindState = pacingCoachService.calculateRunningPace({
        elapsedSeconds: 70,
        totalDurationSeconds: 100,
        completedQuestions: [{ questionId: '1' }],
        pacingPlan: plan,
      });
      expect(behindState.paceState).toBe('critical'); // remaining time 30 < 40 (0.8 * 50)
      
      const slightlyBehindState = pacingCoachService.calculateRunningPace({
        elapsedSeconds: 65,
        totalDurationSeconds: 200,
        completedQuestions: [{ questionId: '1' }],
        pacingPlan: plan,
      });
      expect(slightlyBehindState.paceState).toBe('behind'); // elapsed 65 > 1.2 * 50 (60)
    });
  });

  describe('analyzeAttempt', () => {
    it('should correctly classify answers', () => {
      const plan = {
        allocatedTotalSeconds: 100,
        questionBudgets: [
          { questionId: '1', budgetSeconds: 50, marks: 1 },
          { questionId: '2', budgetSeconds: 50, marks: 1 },
        ]
      };
      
      const attempt = {
        answers: [
          { questionId: '1', timeSpent: 20, isCorrect: true }, // efficient
          { questionId: '2', timeSpent: 100, isCorrect: false }, // time sink
        ]
      };
      
      const autopsy = pacingCoachService.analyzeAttempt(attempt, plan, 1.5);
      
      expect(autopsy.classifications.efficient).toBe(1);
      expect(autopsy.classifications.time_sink).toBe(1);
      expect(autopsy.totalTimeSaved).toBe(30);
      expect(autopsy.totalTimeLost).toBe(50);
      expect(autopsy.estimatedOpportunityCostMarks).toBe(1);
      expect(autopsy.skipRecommendations.length).toBe(1);
      expect(autopsy.skipRecommendations[0].questionId).toBe('2');
    });
  });
});
