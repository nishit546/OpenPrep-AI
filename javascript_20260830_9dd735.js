const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const StudyHabit = require('../models/StudyHabit');
const HabitLog = require('../models/HabitLog');
const HabitStreak = require('../models/HabitStreak');
const {
  calculateConsistencyScore,
  calculateQualityAnalytics,
  calculateMoodAnalytics,
  calculateCategoryAnalytics,
  calculateWeeklySummary,
  generateRecommendations,
} = require('../utils/habitAnalytics');

class HabitTrackingService {
  /**
   * Create a new habit
   */
  static async createHabit(userId, data) {
    const habit = await StudyHabit.create({
      userId,
      ...data,
    });

    // Initialize streak record
    await HabitStreak.create({
      habitId: habit.id,
      userId,
      currentCount: 0,
      longestCount: 0,
      freezesAvailable: 3,
      freezesUsed: 0,
      status: 'active',
    });

    return habit;
  }

  /**
   * Get all habits for a user
   */
  static async getUserHabits(userId, filters = {}) {
    const { category, isActive = true, limit = 50, offset = 0 } = filters;

    const where = { userId };

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Also get streak data
    const habits = await StudyHabit.findAll({
      where,
      include: [
        {
          model: HabitStreak,
          as: 'streak',
          attributes: ['currentCount', 'longestCount', 'status', 'freezesAvailable', 'freezesUsed'],
        },
      ],
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });

    return habits;
  }

  /**
   * Get a single habit by ID
   */
  static async getHabitById(userId, habitId) {
    const habit = await StudyHabit.findOne({
      where: {
        id: habitId,
        userId,
      },
      include: [
        {
          model: HabitStreak,
          as: 'streak',
        },
      ],
    });

    if (!habit) {
      throw new Error('Habit not found');
    }

    return habit;
  }

  /**
   * Update a habit
   */
  static async updateHabit(userId, habitId, data) {
    const habit = await this.getHabitById(userId, habitId);
    await habit.update(data);
    return habit;
  }

  /**
   * Delete a habit
   */
  static async deleteHabit(userId, habitId) {
    const habit = await this.getHabitById(userId, habitId);
    await habit.destroy();
    return { success: true };
  }

  /**
   * Archive a habit
   */
  static async archiveHabit(userId, habitId) {
    const habit = await this.getHabitById(userId, habitId);
    habit.isArchived = true;
    habit.isActive = false;
    await habit.save();
    return habit;
  }

  /**
   * Log a habit completion
   */
  static async logHabitCompletion(userId, habitId, data) {
    const {
      date = null,
      duration = null,
      quality = null,
      mood = null,
      energy = null,
      notes = null,
      usedFreeze = false,
      source = 'manual',
      deviceType = null,
      sessionId = null,
    } = data;

    const habit = await this.getHabitById(userId, habitId);
    const logDate = date || new Date().toISOString().split('T')[0];

    // Check if already logged for this date
    const existingLog = await HabitLog.findOne({
      where: {
        habitId,
        date: logDate,
      },
    });

    if (existingLog) {
      throw new Error('Habit already logged for this date');
    }

    // Create log entry
    const log = await HabitLog.create({
      habitId,
      userId,
      date: logDate,
      duration,
      quality,
      mood,
      energy,
      notes,
      usedFreeze,
      source,
      deviceType,
      sessionId,
      completedAt: new Date(),
    });

    // Update habit totals
    habit.totalCompletions += 1;
    habit.totalDuration = (habit.totalDuration || 0) + (duration || 0);

    // Update streak
    await this.updateStreak(userId, habitId, logDate, usedFreeze);

    // Update consistency score
    const logs = await HabitLog.findAll({
      where: {
        habitId,
        userId,
      },
      order: [['date', 'DESC']],
    });
    habit.consistencyScore = calculateConsistencyScore(logs);

    await habit.save();

    return log;
  }

  /**
   * Update streak for a habit
   */
  static async updateStreak(userId, habitId, logDate, usedFreeze = false) {
    const habit = await this.getHabitById(userId, habitId);
    let streak = await HabitStreak.findOne({
      where: { habitId },
    });

    if (!streak) {
      streak = await HabitStreak.create({
        habitId,
        userId,
        currentCount: 0,
        longestCount: 0,
        freezesAvailable: 3,
        freezesUsed: 0,
        status: 'active',
      });
    }

    const today = new Date();
    const logDay = new Date(logDate);

    // Check for streak freeze reset (monthly)
    const currentMonth = logDate.substring(0, 7);
    if (streak.freezeResetDate !== currentMonth) {
      streak.freezesAvailable = 3;
      streak.freezesUsed = 0;
      streak.freezeResetDate = currentMonth;
    }

    // Check if this is a consecutive day
    const lastDate = streak.lastCompletionDate;
    const daysDiff = lastDate 
      ? Math.floor((logDay - new Date(lastDate)) / (1000 * 60 * 60 * 24))
      : null;

    if (lastDate && daysDiff === 1) {
      // Consecutive day - increment streak
      streak.currentCount += 1;
      streak.streakDates.push(logDate);
    } else if (lastDate && daysDiff === 0) {
      // Same day - do nothing (already logged)
      return streak;
    } else if (lastDate && daysDiff > 1) {
      // Streak broken - check if freeze can be used
      if (usedFreeze && streak.freezesAvailable > 0) {
        // Use a freeze
        streak.freezesUsed += 1;
        streak.freezesAvailable -= 1;
        streak.freezeDates.push(logDate);
        streak.currentCount += 1;
        streak.streakDates.push(logDate);
        streak.status = 'saved';
      } else if (usedFreeze && streak.freezesAvailable === 0) {
        throw new Error('No streak freezes available');
      } else {
        // Streak is broken
        streak.currentCount = 1;
        streak.streakDates = [logDate];
        streak.freezeDates = [];
        streak.status = 'broken';
        streak.brokenDate = logDate;
      }
    } else if (!lastDate) {
      // First log
      streak.currentCount = 1;
      streak.streakDates = [logDate];
      streak.status = 'active';
    }

    // Update longest streak
    if (streak.currentCount > streak.longestCount) {
      streak.longestCount = streak.currentCount;
    }

    // Update last completion date
    streak.lastCompletionDate = logDate;
    if (!streak.streakStartDate) {
      streak.streakStartDate = logDate;
    }

    // Calculate next milestone
    const milestones = [7, 14, 21, 30, 60, 90, 180, 365];
    const nextMilestone = milestones.find(m => m > streak.currentCount);
    streak.nextMilestone = nextMilestone || null;

    await streak.save();

    // Update habit streak values
    habit.currentStreak = streak.currentCount;
    habit.longestStreak = streak.longestCount;
    await habit.save();

    return streak;
  }

  /**
   * Use a streak freeze
   */
  static async useStreakFreeze(userId, habitId) {
    const habit = await this.getHabitById(userId, habitId);
    const streak = await HabitStreak.findOne({ where: { habitId } });

    if (!streak) {
      throw new Error('No streak found for this habit');
    }

    // Check monthly limit
    const today = new Date();
    const currentMonth = today.toISOString().split('T')[0].substring(0, 7);
    if (streak.freezeResetDate !== currentMonth) {
      streak.freezesAvailable = 3;
      streak.freezesUsed = 0;
      streak.freezeResetDate = currentMonth;
    }

    if (streak.freezesAvailable <= 0) {
      throw new Error('No streak freezes available. Limit is 3 per month.');
    }

    streak.freezesAvailable -= 1;
    streak.freezesUsed += 1;

    // Use freeze for today
    const todayStr = today.toISOString().split('T')[0];
    streak.freezeDates.push(todayStr);
    streak.currentCount += 1;
    streak.streakDates.push(todayStr);
    streak.status = 'saved';

    await streak.save();

    // Update habit
    habit.currentStreak = streak.currentCount;
    await habit.save();

    return streak;
  }

  /**
   * Get streak status for a habit
   */
  static async getStreakStatus(userId, habitId) {
    const streak = await HabitStreak.findOne({ where: { habitId } });

    if (!streak) {
      return {
        hasStreak: false,
        currentCount: 0,
        longestCount: 0,
        status: 'none',
      };
    }

    // Check if streak is still active (last completion within 24 hours)
    const lastDate = streak.lastCompletionDate;
    const isActive = lastDate && (new Date() - new Date(lastDate)) <= 24 * 60 * 60 * 1000;

    return {
      hasStreak: streak.currentCount > 0,
      currentCount: streak.currentCount,
      longestCount: streak.longestCount,
      status: streak.status,
      isActive,
      freezesAvailable: streak.freezesAvailable,
      freezesUsed: streak.freezesUsed,
      nextMilestone: streak.nextMilestone,
      streakStartDate: streak.streakStartDate,
    };
  }

  /**
   * Get habit analytics
   */
  static async getHabitAnalytics(userId, habitId = null) {
    let habits, logs;

    if (habitId) {
      // Get specific habit
      habits = [await this.getHabitById(userId, habitId)];
      logs = await HabitLog.findAll({
        where: {
          habitId,
          userId,
        },
        order: [['date', 'ASC']],
      });
    } else {
      // Get all habits
      habits = await StudyHabit.findAll({
        where: { userId, isActive: true },
      });
      logs = await HabitLog.findAll({
        where: { userId },
        order: [['date', 'ASC']],
      });
    }

    if (habits.length === 0) {
      return {
        hasData: false,
        message: 'No habits found',
      };
    }

    // Calculate analytics
    const qualityAnalytics = calculateQualityAnalytics(logs);
    const moodAnalytics = calculateMoodAnalytics(logs);
    const categoryAnalytics = calculateCategoryAnalytics(habits);

    // Get weekly summary
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weeklySummary = calculateWeeklySummary(logs, weekStart);

    // Get recommendations
    const recommendations = generateRecommendations(habits, logs);

    // Calculate total stats
    const totalCompletions = habits.reduce((sum, h) => sum + (h.totalCompletions || 0), 0);
    const averageConsistency = habits.length > 0 
      ? habits.reduce((sum, h) => sum + (h.consistencyScore || 0), 0) / habits.length
      : 0;
    const longestStreak = Math.max(...habits.map(h => h.longestStreak || 0));

    return {
      hasData: true,
      totalHabits: habits.length,
      totalCompletions,
      averageConsistency: Math.round(averageConsistency),
      longestStreak,
      quality: qualityAnalytics,
      mood: moodAnalytics,
      categories: categoryAnalytics,
      weeklySummary,
      recommendations,
      habits: habits.map(h => ({
        id: h.id,
        name: h.name,
        category: h.category,
        consistencyScore: h.consistencyScore,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        totalCompletions: h.totalCompletions,
        isActive: h.isActive,
      })),
    };
  }

  /**
   * Get weekly summary
   */
  static async getWeeklySummary(userId) {
    const logs = await HabitLog.findAll({
      where: { userId },
      order: [['date', 'ASC']],
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    return calculateWeeklySummary(logs, weekStart);
  }

  /**
   * Get recommendations
   */
  static async getRecommendations(userId) {
    const habits = await StudyHabit.findAll({
      where: { userId, isActive: true },
    });

    const logs = await HabitLog.findAll({
      where: { userId },
      order: [['date', 'ASC']],
    });

    return generateRecommendations(habits, logs);
  }

  /**
   * Get today's habit status
   */
  static async getTodayStatus(userId) {
    const today = new Date().toISOString().split('T')[0];

    const habits = await StudyHabit.findAll({
      where: { userId, isActive: true },
    });

    const result = [];

    for (const habit of habits) {
      const log = await HabitLog.findOne({
        where: {
          habitId: habit.id,
          date: today,
        },
      });

      result.push({
        habitId: habit.id,
        name: habit.name,
        category: habit.category,
        completed: !!log,
        log: log,
        streak: habit.currentStreak,
      });
    }

    return {
      date: today,
      habits: result,
      completedCount: result.filter(h => h.completed).length,
      totalCount: result.length,
    };
  }
}

module.exports = HabitTrackingService;