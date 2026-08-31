const habitTrackerService = require('../services/habitTrackerService');
const ActivityLog = require('../models/ActivityLog');

// ── Habit CRUD ───────────────────────────────────────────────────────────

// @desc    Create a new study habit
// @route   POST /api/habits
// @access  Private
exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, subject, habitType, frequency, frequencyPeriod, targetMinutes, category, priority, startDate, endDate, reminderTime, tags } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Habit name is required' });
    }

    const habit = await habitTrackerService.createHabit(req.user.id, {
      name, description, subject, habitType, frequency, frequencyPeriod,
      targetMinutes, category, priority, startDate, endDate, reminderTime, tags,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'habit_created',
      description: `Created study habit: "${habit.name}" (${habit.category})`,
    });

    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all study habits
// @route   GET /api/habits
// @access  Private
exports.getHabits = async (req, res, next) => {
  try {
    const { status, category, habitType, page, limit } = req.query;

    const result = await habitTrackerService.getUserHabits(req.user.id, {
      status, category, habitType,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      count: result.habits.length,
      ...result.pagination,
      data: result.habits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single habit with streak details
// @route   GET /api/habits/:id
// @access  Private
exports.getHabit = async (req, res, next) => {
  try {
    const habit = await habitTrackerService.getHabitById(req.user.id, req.params.id);
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }
    res.status(200).json({ success: true, data: habit });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a study habit
// @route   PUT /api/habits/:id
// @access  Private
exports.updateHabit = async (req, res, next) => {
  try {
    const habit = await habitTrackerService.updateHabit(req.user.id, req.params.id, req.body);
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }
    res.status(200).json({ success: true, data: habit });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a study habit
// @route   DELETE /api/habits/:id
// @access  Private
exports.deleteHabit = async (req, res, next) => {
  try {
    const deleted = await habitTrackerService.deleteHabit(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ── Habit Logging ────────────────────────────────────────────────────────

// @desc    Log a habit completion
// @route   POST /api/habits/:id/log
// @access  Private
exports.logHabit = async (req, res, next) => {
  try {
    const { logDate, completed, actualMinutes, quality, notes, mood } = req.body;

    const log = await habitTrackerService.logHabitCompletion(req.user.id, req.params.id, {
      logDate, completed, actualMinutes, quality, notes, mood,
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Cannot log')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Use a streak freeze
// @route   POST /api/habits/:id/freeze
// @access  Private
exports.useFreeze = async (req, res, next) => {
  try {
    const result = await habitTrackerService.useStreakFreeze(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('limit') || error.message.includes('No active')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// ── Analytics ────────────────────────────────────────────────────────────

// @desc    Get overall habit analytics
// @route   GET /api/habits/analytics
// @access  Private
exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await habitTrackerService.getHabitAnalytics(req.user.id);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get habit completion history
// @route   GET /api/habits/:id/history
// @access  Private
exports.getHabitHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await habitTrackerService.getHabitHistory(req.user.id, req.params.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 30,
    });
    res.status(200).json({
      success: true,
      count: result.logs.length,
      ...result.pagination,
      data: result.logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly summary
// @route   GET /api/habits/summary/weekly
// @access  Private
exports.getWeeklySummary = async (req, res, next) => {
  try {
    const summary = await habitTrackerService.getWeeklySummary(req.user.id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Get habit dashboard
// @route   GET /api/habits/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await habitTrackerService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recommendations
// @route   GET /api/habits/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const analytics = await habitTrackerService.getHabitAnalytics(req.user.id);
    const recommendations = habitTrackerService.generateHabitRecommendations(analytics);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};
