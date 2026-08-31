const habitCorrelationService = require('../../services/habitCorrelationService');

// Mock the database model
jest.mock('../../models', () => ({
  StudyHabitCorrelation: {
    create: jest.fn(),
    findAll: jest.fn(),
    sequelize: {
      fn: jest.fn((fn, col) => ({ fn, col })),
      col: jest.fn((col) => col),
    },
  },
}));

const { StudyHabitCorrelation } = require('../../models');

describe('HabitCorrelationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordObservation', () => {
    it('should create a new observation with all provided fields', async () => {
      const mockObservation = {
        id: 'obs-1',
        user: 'user-123',
        studyHourOfDay: 9,
        studyDayOfWeek: 2,
        sessionDurationMinutes: 45,
        flashcardsReviewed: 20,
        quizzesAttempted: 1,
        avgQuizScore: 78,
        observationDate: '2026-08-30',
      };

      StudyHabitCorrelation.create.mockResolvedValue(mockObservation);

      const result = await habitCorrelationService.recordObservation('user-123', {
        studyHourOfDay: 9,
        studyDayOfWeek: 2,
        sessionDurationMinutes: 45,
        flashcardsReviewed: 20,
        quizzesAttempted: 1,
        avgQuizScore: 78,
        observationDate: '2026-08-30',
      });

      expect(StudyHabitCorrelation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user-123',
          studyHourOfDay: 9,
          studyDayOfWeek: 2,
          sessionDurationMinutes: 45,
          flashcardsReviewed: 20,
          quizzesAttempted: 1,
          avgQuizScore: 78,
        })
      );
      expect(result).toEqual(mockObservation);
    });
  });

  describe('getCorrelationSummary', () => {
    it('should return insufficient data message when fewer than 5 observations', async () => {
      StudyHabitCorrelation.findAll.mockResolvedValue([{ toJSON: () => ({ avgQuizScore: 70 }) }]);

      const result = await habitCorrelationService.getCorrelationSummary('user-123');

      expect(result.hasEnoughData).toBe(false);
      expect(result.correlations).toHaveLength(0);
      expect(result.message).toContain('5 study sessions');
    });

    it('should compute correlations when enough data is present', async () => {
      // Generate 20 observations spread across different hours and days
      const observations = [];
      for (let i = 0; i < 20; i++) {
        observations.push({
          toJSON: () => ({
            studyHourOfDay: i % 24,
            studyDayOfWeek: i % 7,
            sessionDurationMinutes: 30 + (i % 5) * 15,
            flashcardsReviewed: 10 + (i % 3) * 10,
            quizzesAttempted: 1,
            notesStudied: i % 2,
            tookBreak: i % 3 === 0,
            gapSinceLastSessionHours: 4 + (i % 4) * 12,
            avgQuizScore: 50 + (i % 4) * 10,
            flashcardRetentionRate: 60 + (i % 3) * 10,
            productivityScore: 55 + (i % 4) * 10,
            observationDate: `2026-08-${String(10 + i).padStart(2, '0')}`,
          }),
        });
      }

      StudyHabitCorrelation.findAll.mockResolvedValue(observations);

      const result = await habitCorrelationService.getCorrelationSummary('user-123');

      expect(result.hasEnoughData).toBe(true);
      expect(result.totalObservations).toBe(20);
      expect(result.correlations.length).toBeGreaterThan(0);
      expect(result.overallInsights.length).toBeGreaterThan(0);
    });
  });

  describe('getPerformanceByHour', () => {
    it('should return hourly performance data', async () => {
      const mockData = [
        {
          studyHourOfDay: 9,
          getDataValue: jest.fn((key) => {
            const values = { avgScore: '78.5', avgRetention: '82.0', avgProductivity: '75.0', sessionCount: '12' };
            return values[key];
          }),
        },
        {
          studyHourOfDay: 14,
          getDataValue: jest.fn((key) => {
            const values = { avgScore: '65.2', avgRetention: '70.0', avgProductivity: '62.0', sessionCount: '8' };
            return values[key];
          }),
        },
      ];

      StudyHabitCorrelation.findAll.mockResolvedValue(mockData);

      const result = await habitCorrelationService.getPerformanceByHour('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hour: 9,
        avgScore: 79,
        avgRetention: 82,
        avgProductivity: 75,
        sessionCount: 12,
      });
    });
  });

  describe('getPerformanceByDay', () => {
    it('should return daily performance data with day names', async () => {
      const mockData = [
        {
          studyDayOfWeek: 1,
          getDataValue: jest.fn((key) => {
            const values = { avgScore: '82.0', avgRetention: '85.0', avgDuration: '55', sessionCount: '6' };
            return values[key];
          }),
        },
      ];

      StudyHabitCorrelation.findAll.mockResolvedValue(mockData);

      const result = await habitCorrelationService.getPerformanceByDay('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].dayName).toBe('Monday');
      expect(result[0].avgScore).toBe(82);
    });
  });

  describe('getOptimalSchedule', () => {
    it('should return insufficient data message when no data', async () => {
      StudyHabitCorrelation.findAll.mockResolvedValue([]);

      const result = await habitCorrelationService.getOptimalSchedule('user-123');

      expect(result.hasEnoughData).toBe(false);
    });

    it('should build a recommendation when enough data exists', async () => {
      const hourData = [
        { hour: 9, avgScore: 85, avgRetention: 88, avgProductivity: 82, sessionCount: 5 },
        { hour: 14, avgScore: 70, avgRetention: 72, avgProductivity: 68, sessionCount: 4 },
        { hour: 20, avgScore: 60, avgRetention: 55, avgProductivity: 58, sessionCount: 3 },
      ];

      const dayData = [
        { dayOfWeek: 1, dayName: 'Monday', avgScore: 80, avgRetention: 82, avgDuration: 50, sessionCount: 4 },
        { dayOfWeek: 3, dayName: 'Wednesday', avgScore: 75, avgRetention: 78, avgDuration: 45, sessionCount: 5 },
      ];

      StudyHabitCorrelation.findAll
        .mockResolvedValueOnce(
          hourData.map((d) => ({
            studyHourOfDay: d.hour,
            getDataValue: jest.fn((key) => {
              const vals = { avgScore: String(d.avgScore), avgRetention: String(d.avgRetention), avgProductivity: String(d.avgProductivity), sessionCount: String(d.sessionCount) };
              return vals[key];
            }),
          }))
        )
        .mockResolvedValueOnce(
          dayData.map((d) => ({
            studyDayOfWeek: d.dayName,
            getDataValue: jest.fn((key) => {
              const vals = { avgScore: String(d.avgScore), avgRetention: String(d.avgRetention), avgDuration: String(d.avgDuration), sessionCount: String(d.sessionCount) };
              return vals[key];
            }),
          }))
        );

      const result = await habitCorrelationService.getOptimalSchedule('user-123');

      expect(result.hasEnoughData).toBe(true);
      expect(result.recommendation).toContain('Study during');
      expect(result.bestHours.length).toBeGreaterThan(0);
      expect(result.bestDays.length).toBeGreaterThan(0);
    });
  });
});
