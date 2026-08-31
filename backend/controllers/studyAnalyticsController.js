const studyAnalyticsService = require('../services/studyAnalyticsService');
const ActivityLog = require('../models/ActivityLog');

// ── Snapshot Management ──────────────────────────────────────────────────

// @desc    Generate a new analytics snapshot
// @route   POST /api/study-analytics/snapshots/generate
// @access  Private
exports.generateSnapshot = async (req, res, next) => {
  try {
    const { periodType, periodStart, periodEnd } = req.body;

    if (!periodType || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'periodType, periodStart, and periodEnd are required',
      });
    }

    if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
      return res.status(400).json({
        success: false,
        error: 'periodType must be daily, weekly, or monthly',
      });
    }

    const snapshot = await studyAnalyticsService.generateSnapshot(
      req.user.id,
      periodType,
      periodStart,
      periodEnd,
    );

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'analytics_snapshot_generated',
      description: `Generated ${periodType} analytics snapshot for ${periodStart} to ${periodEnd}`,
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a weekly snapshot (auto-computed period)
// @route   POST /api/study-analytics/snapshots/weekly
// @access  Private
exports.generateWeeklySnapshot = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = studyAnalyticsService.getWeekPeriod(
      req.body.date ? new Date(req.body.date) : new Date(),
    );

    const snapshot = await studyAnalyticsService.generateSnapshot(
      req.user.id,
      'weekly',
      periodStart,
      periodEnd,
    );

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a monthly snapshot (auto-computed period)
// @route   POST /api/study-analytics/snapshots/monthly
// @access  Private
exports.generateMonthlySnapshot = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = studyAnalyticsService.getMonthPeriod(
      req.body.date ? new Date(req.body.date) : new Date(),
    );

    const snapshot = await studyAnalyticsService.generateSnapshot(
      req.user.id,
      'monthly',
      periodStart,
      periodEnd,
    );

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all snapshots with pagination and filtering
// @route   GET /api/study-analytics/snapshots
// @access  Private
exports.getSnapshots = async (req, res, next) => {
  try {
    const { periodType, page, limit } = req.query;

    const result = await studyAnalyticsService.getSnapshots(req.user.id, {
      periodType,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    res.status(200).json({
      success: true,
      count: result.snapshots.length,
      ...result.pagination,
      data: result.snapshots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single snapshot by ID
// @route   GET /api/study-analytics/snapshots/:id
// @access  Private
exports.getSnapshot = async (req, res, next) => {
  try {
    const snapshot = await studyAnalyticsService.getSnapshotById(
      req.user.id,
      req.params.id,
    );

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }

    res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the latest snapshot for a period type
// @route   GET /api/study-analytics/snapshots/latest
// @access  Private
exports.getLatestSnapshot = async (req, res, next) => {
  try {
    const { periodType } = req.query;
    const snapshot = await studyAnalyticsService.getLatestSnapshot(
      req.user.id,
      periodType || 'weekly',
    );

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'No snapshots found. Generate one first.',
      });
    }

    res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a snapshot
// @route   DELETE /api/study-analytics/snapshots/:id
// @access  Private
exports.deleteSnapshot = async (req, res, next) => {
  try {
    const deleted = await studyAnalyticsService.deleteSnapshot(
      req.user.id,
      req.params.id,
    );

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expired snapshots older than retention days
// @route   DELETE /api/study-analytics/snapshots/expired
// @access  Private
exports.deleteExpiredSnapshots = async (req, res, next) => {
  try {
    const { retentionDays } = req.query;
    const deleted = await studyAnalyticsService.deleteExpiredSnapshots(
      req.user.id,
      parseInt(retentionDays, 10) || 90,
    );

    res.status(200).json({
      success: true,
      data: { deletedCount: deleted },
    });
  } catch (error) {
    next(error);
  }
};

// ── Dashboard & Insights ─────────────────────────────────────────────────

// @desc    Get analytics dashboard with trends and summaries
// @route   GET /api/study-analytics/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studyAnalyticsService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Get consistency metrics for a period
// @route   GET /api/study-analytics/metrics/consistency
// @access  Private
exports.getConsistencyMetrics = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'periodStart and periodEnd query params are required',
      });
    }

    const metrics = await studyAnalyticsService.computeConsistencyMetrics(
      req.user.id,
      periodStart,
      periodEnd,
    );

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subject distribution for a period
// @route   GET /api/study-analytics/metrics/subjects
// @access  Private
exports.getSubjectDistribution = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'periodStart and periodEnd query params are required',
      });
    }

    const distribution = await studyAnalyticsService.computeSubjectDistribution(
      req.user.id,
      periodStart,
      periodEnd,
    );

    res.status(200).json({ success: true, data: distribution });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance trends for a period
// @route   GET /api/study-analytics/metrics/performance
// @access  Private
exports.getPerformanceTrends = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'periodStart and periodEnd query params are required',
      });
    }

    const trends = await studyAnalyticsService.computePerformanceTrends(
      req.user.id,
      periodStart,
      periodEnd,
    );

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

// @desc    Get readiness projections
// @route   GET /api/study-analytics/metrics/readiness
// @access  Private
exports.getReadinessProjections = async (req, res, next) => {
  try {
    const projections = await studyAnalyticsService.computeReadinessProjections(
      req.user.id,
    );

    res.status(200).json({ success: true, data: projections });
  } catch (error) {
    next(error);
  }
};

// @desc    Get insights and recommendations
// @route   GET /api/study-analytics/insights
// @access  Private
exports.getInsights = async (req, res, next) => {
  try {
    const latestSnapshot = await studyAnalyticsService.getLatestSnapshot(
      req.user.id,
      'weekly',
    );

    if (!latestSnapshot) {
      return res.status(404).json({
        success: false,
        error: 'No analytics data available. Generate a snapshot first.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        insights: latestSnapshot.insights || [],
        recommendations: latestSnapshot.recommendations || [],
        snapshotDate: latestSnapshot.snapshotDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Period Helpers ───────────────────────────────────────────────────────

// @desc    Get the current week and month period dates
// @route   GET /api/study-analytics/periods
// @access  Private
exports.getPeriods = async (req, res, next) => {
  try {
    const now = new Date();
    res.status(200).json({
      success: true,
      data: {
        weekly: studyAnalyticsService.getWeekPeriod(now),
        monthly: studyAnalyticsService.getMonthPeriod(now),
        daily: studyAnalyticsService.getDayPeriod(now),
      },
    });
  } catch (error) {
    next(error);
  }
};
