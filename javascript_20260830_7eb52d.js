const HabitTrackingService = require('../services/habitTrackingService');

/**
 * @desc    Create a new habit
 * @route   POST /api/habits
 * @access  Private
 */
exports.createHabit = async (req, res, next) => {
  try {
    const habit = await HabitTrackingService.createHabit(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all habits
 * @route   GET /api/habits
 * @access  Private
 */
exports.getHabits = async (req, res, next) => {
  try {
    const { category, isActive, limit, offset } = req.query;
    const habits = await HabitTrackingService.getUserHabits(req.user.id, {
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.status(200).json({
      success: true,
      data: habits,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single habit
 * @route   GET /api/habits/:habitId
 * @access  Private
 */
exports.getHabit = async (req, res, next) => {
  try {
    const habit = await HabitTrackingService.getHabitById(req.user.id, req.params.habitId);
    res.status(200).json({
      success: true,
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a habit
 * @route   PUT /api/habits/:habitId
 * @access  Private
 */
exports.updateHabit = async (req, res, next) => {
  try {
    const habit = await HabitTrackingService.updateHabit(req.user.id, req.params.habitId, req.body);
    res.status(200).json({
      success: true,
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a habit
 * @route   DELETE /api/habits/:habitId
 * @access  Private
 */
exports.deleteHabit = async (req, res, next) => {
  try {
    const result = await HabitTrackingService.deleteHabit(req.user.id, req.params.habitId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive a habit
 * @route   POST /api/habits/:habitId/archive
 * @access  Private
 */
exports.archiveHabit = async (req, res, next) => {
  try {
    const habit = await HabitTrackingService.archiveHabit(req.user.id, req.params.habitId);
    res.status(200).json({
      success: true,
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log habit completion
 * @route   POST /api/habits/:habitId/log
 * @access  Private
 */
exports.logHabit = async (req, res, next) => {
  try {
    const log = await HabitTrackingService.logHabitCompletion(
      req.user.id,
      req.params.habitId,
      req.body
    );
    res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Use streak freeze
 * @route   POST /api/habits/:habitId/freeze
 * @access  Private
 */
exports.useStreakFreeze = async (req, res, next) => {
  try {
    const result = await HabitTrackingService.useStreakFreeze(req.user.id, req.params.habitId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get streak status
 * @route   GET /api/habits/:habitId/streak
 * @access  Private
 */
exports.getStreakStatus = async (req, res, next) => {
  try {
    const status = await HabitTrackingService.getStreakStatus(req.user.id, req.params.habitId);
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get habit analytics
 * @route   GET /api/habits/analytics
 * @access  Private
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { habitId } = req.query;
    const analytics = await HabitTrackingService.getHabitAnalytics(req.user.id, habitId);
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get weekly summary
 * @route   GET /api/habits/weekly-summary
 * @access  Private
 */
exports.getWeeklySummary = async (req, res, next) => {
  try {
    const summary = await HabitTrackingService.getWeeklySummary(req.user.id);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recommendations
 * @route   GET /api/habits/recommendations
 * @access  Private
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await HabitTrackingService.getRecommendations(req.user.id);
    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's status
 * @route   GET /api/habits/today
 * @access  Private
 */
exports.getTodayStatus = async (req, res, next) => {
  try {
    const status = await HabitTrackingService.getTodayStatus(req.user.id);
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};