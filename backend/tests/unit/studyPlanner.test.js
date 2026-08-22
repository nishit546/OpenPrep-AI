// backend/tests/unit/studyPlanner.test.js

const { 
  calculateStudyDays,
  generateDailySchedule,
  calculateTotalStudyHours,
  getDaysUntilExam,
  createStudyPlanTimeline,
  validateDateRange
} = require('../../services/studyPlanner.service');

describe('Study Planner - Date and Time Calculations', () => {
  describe('getDaysUntilExam', () => {
    test('should calculate correct number of days until exam', () => {
      const today = new Date('2026-08-22');
      const examDate = new Date('2026-09-15');
      const days = getDaysUntilExam(examDate, today);
      expect(days).toBe(24);
    });

    test('should return 0 if exam is today', () => {
      const today = new Date('2026-08-22');
      const examDate = new Date('2026-08-22');
      const days = getDaysUntilExam(examDate, today);
      expect(days).toBe(0);
    });

    test('should return negative days if exam has passed', () => {
      const today = new Date('2026-08-22');
      const examDate = new Date('2026-08-20');
      const days = getDaysUntilExam(examDate, today);
      expect(days).toBeLessThan(0);
    });

    test('should throw error if examDate is invalid', () => {
      expect(() => getDaysUntilExam('invalid-date')).toThrow();
    });
  });

  describe('calculateStudyDays', () => {
    test('should calculate available study days excluding weekends', () => {
      const startDate = new Date('2026-08-22'); // Saturday
      const examDate = new Date('2026-09-05'); // Saturday (14 days)
      
      const studyDays = calculateStudyDays(startDate, examDate, {
        excludeWeekends: true,
        excludeHolidays: []
      });
      
      // 14 days total, 4 weekends (Sat-Sun), 10 weekdays
      expect(studyDays).toBe(10);
    });

    test('should include weekends when specified', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-09-05');
      
      const studyDays = calculateStudyDays(startDate, examDate, {
        excludeWeekends: false,
        excludeHolidays: []
      });
      
      expect(studyDays).toBe(14);
    });

    test('should exclude specified holidays', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-08-29');
      const holidays = [new Date('2026-08-24'), new Date('2026-08-26')];
      
      const studyDays = calculateStudyDays(startDate, examDate, {
        excludeWeekends: true,
        excludeHolidays: holidays
      });
      
      // Aug 22-29: 8 days, 2 weekends (4 days), 2 holidays = 2 study days
      expect(studyDays).toBe(2);
    });

    test('should handle invalid date ranges', () => {
      const startDate = new Date('2026-09-05');
      const examDate = new Date('2026-08-22');
      
      expect(() => calculateStudyDays(startDate, examDate)).toThrow('Start date must be before exam date');
    });
  });

  describe('calculateTotalStudyHours', () => {
    test('should calculate total study hours based on daily hours', () => {
      const studyDays = 20;
      const hoursPerDay = 4;
      const total = calculateTotalStudyHours(studyDays, hoursPerDay);
      expect(total).toBe(80);
    });

    test('should handle zero days', () => {
      expect(calculateTotalStudyHours(0, 4)).toBe(0);
    });

    test('should round to nearest hour', () => {
      const studyDays = 10;
      const hoursPerDay = 3.5;
      const total = calculateTotalStudyHours(studyDays, hoursPerDay);
      expect(total).toBe(35);
    });

    test('should throw error for negative hours', () => {
      expect(() => calculateTotalStudyHours(10, -2)).toThrow('Hours per day must be positive');
    });
  });

  describe('generateDailySchedule', () => {
    test('should generate schedule for each study day', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-09-05');
      const topics = ['Topic A', 'Topic B', 'Topic C'];
      
      const schedule = generateDailySchedule(startDate, examDate, topics, {
        excludeWeekends: true,
        hoursPerDay: 4
      });

      expect(schedule).toHaveLength(10); // 10 weekdays
      expect(schedule[0]).toHaveProperty('date');
      expect(schedule[0]).toHaveProperty('topics');
      expect(schedule[0]).toHaveProperty('hoursAllocated');
      expect(schedule[0]).toHaveProperty('completed', false);
    });

    test('should distribute topics evenly across study days', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-08-26'); // 5 days
      const topics = ['Math', 'Science', 'English', 'History'];
      
      const schedule = generateDailySchedule(startDate, examDate, topics, {
        excludeWeekends: false,
        hoursPerDay: 4
      });

      // Each day should have at least one topic
      schedule.forEach(day => {
        expect(day.topics.length).toBeGreaterThan(0);
      });
    });

    test('should allocate hours based on topic difficulty', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-08-24');
      const topics = [
        { name: 'Math', difficulty: 5 },
        { name: 'Science', difficulty: 3 }
      ];
      
      const schedule = generateDailySchedule(startDate, examDate, topics, {
        excludeWeekends: false,
        hoursPerDay: 4,
        adjustByDifficulty: true
      });

      expect(schedule[0].hoursAllocated).toBe(4);
      expect(schedule[0].topics).toContain('Math');
    });

    test('should skip weekends when specified', () => {
      const startDate = new Date('2026-08-22'); // Saturday
      const examDate = new Date('2026-08-26'); // Wednesday
      
      const schedule = generateDailySchedule(startDate, examDate, ['Topic A'], {
        excludeWeekends: true,
        hoursPerDay: 3
      });

      // Should only include weekdays: Mon, Tue, Wed (3 days)
      expect(schedule).toHaveLength(3);
      
      schedule.forEach(day => {
        const date = new Date(day.date);
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // Not Sunday
        expect(dayOfWeek).not.toBe(6); // Not Saturday
      });
    });
  });

  describe('validateDateRange', () => {
    test('should validate correct date range', () => {
      const start = new Date('2026-08-22');
      const end = new Date('2026-09-22');
      const result = validateDateRange(start, end);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid date formats', () => {
      const result = validateDateRange('invalid', new Date());
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format');
    });

    test('should reject dates too far in future', () => {
      const start = new Date('2026-08-22');
      const end = new Date('2027-08-22');
      const result = validateDateRange(start, end);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Planning horizon exceeds 6 months');
    });
  });

  describe('createStudyPlanTimeline', () => {
    test('should create timeline with milestones', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-09-22');
      const totalHours = 80;
      const milestones = ['Complete Module 1', 'Review Practice Tests', 'Final Revision'];
      
      const timeline = createStudyPlanTimeline(startDate, examDate, totalHours, milestones);
      
      expect(timeline).toHaveProperty('startDate');
      expect(timeline).toHaveProperty('examDate');
      expect(timeline).toHaveProperty('totalDays');
      expect(timeline).toHaveProperty('milestones');
      expect(timeline.milestones).toHaveLength(3);
    });

    test('should calculate milestone dates correctly', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-09-22');
      const totalHours = 80;
      const milestones = ['Milestone 1', 'Milestone 2'];
      
      const timeline = createStudyPlanTimeline(startDate, examDate, totalHours, milestones);
      
      expect(timeline.milestones[0].date).toBeDefined();
      expect(timeline.milestones[1].date).toBeDefined();
      // Milestone 2 should be after Milestone 1
      expect(new Date(timeline.milestones[1].date).getTime())
        .toBeGreaterThan(new Date(timeline.milestones[0].date).getTime());
    });

    test('should handle edge case with one day until exam', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-08-23');
      const totalHours = 8;
      const milestones = ['Study all day'];
      
      const timeline = createStudyPlanTimeline(startDate, examDate, totalHours, milestones);
      
      expect(timeline.totalDays).toBe(1);
      expect(timeline.milestones[0].date).toEqual(startDate);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle same day start and end', () => {
      const date = new Date('2026-08-22');
      expect(calculateStudyDays(date, date, { excludeWeekends: true })).toBe(1);
    });

    test('should handle leap year dates correctly', () => {
      const startDate = new Date('2024-02-28');
      const examDate = new Date('2024-03-01');
      const days = getDaysUntilExam(examDate, startDate);
      expect(days).toBe(2);
    });

    test('should handle timezone transitions', () => {
      const startDate = new Date('2026-08-22T23:00:00Z');
      const examDate = new Date('2026-08-23T01:00:00Z');
      const days = getDaysUntilExam(examDate, startDate);
      // Even though time difference is 2 hours, it should count as 1 day
      expect(days).toBe(1);
    });

    test('should default parameters when not provided', () => {
      const startDate = new Date('2026-08-22');
      const examDate = new Date('2026-08-23');
      const result = calculateStudyDays(startDate, examDate);
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });
});
