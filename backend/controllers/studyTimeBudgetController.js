const studyTimeBudgetService = require('../services/studyTimeBudgetService');

/**
 * @desc    Set or update a weekly time budget for a subject
 * @route   POST /api/time-budgets
 * @access  Private
 */
exports.setBudget = async (req, res, next) => {
  try {
    const { subject, plannedMinutes, priority, notes, alertThreshold } = req.body;
    const budget = await studyTimeBudgetService.setBudget(req.user.id, {
      subject, plannedMinutes, priority, notes, alertThreshold,
    });
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('non-negative')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * @desc    Get budgets for the current week (or a specified week)
 * @route   GET /api/time-budgets
 * @access  Private
 */
exports.getWeekBudgets = async (req, res, next) => {
  try {
    const budgets = await studyTimeBudgetService.getWeekBudgets(req.user.id, req.query.weekKey);
    res.status(200).json({ success: true, data: budgets });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log actual study time for a subject
 * @route   POST /api/time-budgets/log
 * @access  Private
 */
exports.logStudyTime = async (req, res, next) => {
  try {
    const { subject, minutes } = req.body;
    const budget = await studyTimeBudgetService.logStudyTime(req.user.id, { subject, minutes });
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('positive')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * @desc    Get the weekly dashboard with all computed metrics
 * @route   GET /api/time-budgets/dashboard
 * @access  Private
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studyTimeBudgetService.getDashboard(req.user.id, req.query.weekKey);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get historical efficiency over past weeks
 * @route   GET /api/time-budgets/history
 * @access  Private
 */
exports.getHistory = async (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks, 10) || 8;
    const history = await studyTimeBudgetService.getHistoricalEfficiency(req.user.id, weeks);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a budget entry
 * @route   DELETE /api/time-budgets/:id
 * @access  Private
 */
exports.deleteBudget = async (req, res, next) => {
  try {
    const deleted = await studyTimeBudgetService.deleteBudget(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clone current week's budgets to next week
 * @route   POST /api/time-budgets/clone
 * @access  Private
 */
exports.cloneToNextWeek = async (req, res, next) => {
  try {
    const cloned = await studyTimeBudgetService.cloneToNextWeek(req.user.id);
    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    next(error);
  }
};
