const studyTimeBudgetService = require('../../services/studyTimeBudgetService');

jest.mock('../../models', () => ({
  StudyTimeBudget: {
    create: jest.fn(),
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  ActivityLog: { create: jest.fn() },
}));

const { StudyTimeBudget } = require('../../models');

describe('StudyTimeBudgetService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getWeekKey', () => {
    it('should return a valid ISO week key format', () => {
      const key = studyTimeBudgetService.getWeekKey(new Date('2026-08-30'));
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('setBudget', () => {
    it('should throw if subject is missing', async () => {
      await expect(studyTimeBudgetService.setBudget('u1', { plannedMinutes: 60 }))
        .rejects.toThrow('subject and plannedMinutes are required');
    });

    it('should create a new budget via findOrCreate', async () => {
      const mockBudget = { id: 'b1', subject: 'Math', plannedMinutes: 120 };
      StudyTimeBudget.findOrCreate.mockResolvedValue([mockBudget, true]);

      const result = await studyTimeBudgetService.setBudget('u1', {
        subject: 'Math', plannedMinutes: 120,
      });

      expect(StudyTimeBudget.findOrCreate).toHaveBeenCalled();
      expect(result).toEqual(mockBudget);
    });

    it('should update an existing budget', async () => {
      const existing = { id: 'b1', subject: 'Math', plannedMinutes: 60, save: jest.fn() };
      StudyTimeBudget.findOrCreate.mockResolvedValue([existing, false]);

      const result = await studyTimeBudgetService.setBudget('u1', {
        subject: 'Math', plannedMinutes: 180, priority: 5,
      });

      expect(result.plannedMinutes).toBe(180);
      expect(result.priority).toBe(5);
      expect(existing.save).toHaveBeenCalled();
    });
  });

  describe('logStudyTime', () => {
    it('should throw for invalid input', async () => {
      await expect(studyTimeBudgetService.logStudyTime('u1', { subject: 'Math', minutes: 0 }))
        .rejects.toThrow('positive minutes');
    });

    it('should create a new budget if none exists', async () => {
      StudyTimeBudget.findOne.mockResolvedValue(null);
      const mockBudget = { id: 'b2', subject: 'Physics', actualMinutes: 45 };
      StudyTimeBudget.create.mockResolvedValue(mockBudget);

      const result = await studyTimeBudgetService.logStudyTime('u1', {
        subject: 'Physics', minutes: 45,
      });

      expect(StudyTimeBudget.create).toHaveBeenCalled();
      expect(result.actualMinutes).toBe(45);
    });

    it('should increment existing budget', async () => {
      const existing = { id: 'b1', actualMinutes: 30, save: jest.fn() };
      StudyTimeBudget.findOne.mockResolvedValue(existing);

      const result = await studyTimeBudgetService.logStudyTime('u1', {
        subject: 'Math', minutes: 20,
      });

      expect(result.actualMinutes).toBe(50);
      expect(existing.save).toHaveBeenCalled();
    });
  });

  describe('getDashboard', () => {
    it('should compute overall efficiency correctly', async () => {
      const budgets = [
        { id: '1', subject: 'Math', plannedMinutes: 120, actualMinutes: 90, priority: 4, notes: null, alertThreshold: 80 },
        { id: '2', subject: 'English', plannedMinutes: 60, actualMinutes: 60, priority: 3, notes: 'Focus', alertThreshold: 80 },
      ];
      StudyTimeBudget.findAll.mockResolvedValue(budgets);

      const result = await studyTimeBudgetService.getDashboard('u1');

      expect(result.totalPlanned).toBe(180);
      expect(result.totalActual).toBe(150);
      expect(result.overallEfficiency).toBe(83);
      expect(result.subjectStats).toHaveLength(2);
    });

    it('should mark over-budget subjects', async () => {
      const budgets = [
        { id: '1', subject: 'Math', plannedMinutes: 60, actualMinutes: 80, priority: 3, notes: null, alertThreshold: 80 },
      ];
      StudyTimeBudget.findAll.mockResolvedValue(budgets);

      const result = await studyTimeBudgetService.getDashboard('u1');
      expect(result.subjectStats[0].overBudget).toBe(true);
      expect(result.subjectStats[0].remaining).toBe(0);
    });
  });

  describe('deleteBudget', () => {
    it('should return true when deleted', async () => {
      StudyTimeBudget.destroy.mockResolvedValue(1);
      const result = await studyTimeBudgetService.deleteBudget('u1', 'b1');
      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      StudyTimeBudget.destroy.mockResolvedValue(0);
      const result = await studyTimeBudgetService.deleteBudget('u1', 'b999');
      expect(result).toBe(false);
    });
  });
});
