const studyHeatmapService = require('../services/studyHeatmapService');
const ActivityLog = require('../models/ActivityLog');

// @desc    Record a study activity session
// @route   POST /api/study-heatmap/activity
// @access  Private
exports.recordActivity = async (req, res, next) => {
  try {
    const {
      durationMinutes,
      subjectId,
      subjectName,
      hour,
      quizId,
      quizScore,
      quizTotal,
      flashcardsReviewed,
      date,
    } = req.body;

    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'durationMinutes must be a positive number',
      });
    }

    const heatmap = await studyHeatmapService.recordActivity(req.user.id, {
      durationMinutes,
      subjectId,
      subjectName,
      hour,
      quizId,
      quizScore,
      quizTotal,
      flashcardsReviewed,
      date,
    });

    res.status(201).json({ success: true, data: heatmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly heatmap grid
// @route   GET /api/study-heatmap/monthly/:year/:month
// @access  Private
exports.getMonthlyHeatmap = async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Valid year and month (1-12) are required',
      });
    }

    const heatmap = await studyHeatmapService.getMonthlyHeatmap(req.user.id, year, month);
    res.status(200).json({ success: true, data: heatmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Get yearly heatmap (daily granularity)
// @route   GET /api/study-heatmap/yearly/:year
// @access  Private
exports.getYearlyHeatmap = async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Valid year is required',
      });
    }

    const heatmap = await studyHeatmapService.getYearlyHeatmap(req.user.id, year);
    res.status(200).json({ success: true, data: heatmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Get peak hours analysis
// @route   GET /api/study-heatmap/peak-hours
// @access  Private
exports.getPeakHoursAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const analysis = await studyHeatmapService.getPeakHoursAnalysis(req.user.id, {
      startDate,
      endDate,
    });

    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

// @desc    Get streak analytics
// @route   GET /api/study-heatmap/streaks
// @access  Private
exports.getStreakAnalytics = async (req, res, next) => {
  try {
    const analytics = await studyHeatmapService.getStreakAnalytics(req.user.id);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get consolidated heatmap dashboard
// @route   GET /api/study-heatmap/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studyHeatmapService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk record multiple study activities
// @route   POST /api/study-heatmap/activity/bulk
// @access  Private
exports.bulkRecordActivity = async (req, res, next) => {
  try {
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'activities must be a non-empty array',
      });
    }

    if (activities.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 activities per bulk request',
      });
    }

    const results = [];
    for (const activity of activities) {
      const record = await studyHeatmapService.recordActivity(req.user.id, activity);
      results.push(record);
    }

    res.status(201).json({
      success: true,
      data: { recorded: results.length, records: results },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap data for a date range
// @route   GET /api/study-heatmap/range
// @access  Private
exports.getHeatmapRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query params are required',
      });
    }

    const StudyHeatmap = require('../models/StudyHeatmap');
    const { Op } = require('sequelize');

    const records = await StudyHeatmap.findAll({
      where: {
        user: req.user.id,
        date: { [Op.gte]: startDate, [Op.lte]: endDate },
      },
      order: [['date', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        records,
        totalDays: records.length,
        totalMinutes: records.reduce((sum, r) => sum + r.totalMinutes, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
