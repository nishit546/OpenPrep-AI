const goalAlignmentService = require('../services/goalAlignmentService');

// @desc    Compute alignment for a period
// @route   POST /api/goal-alignment/compute
// @access  Private
exports.computeAlignment = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, period } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'periodStart and periodEnd are required',
      });
    }

    const alignment = await goalAlignmentService.computeAlignment(req.user.id, {
      periodStart,
      periodEnd,
      period: period || 'weekly',
    });

    res.status(201).json({ success: true, data: alignment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alignment history with pagination
// @route   GET /api/goal-alignment/history
// @access  Private
exports.getAlignments = async (req, res, next) => {
  try {
    const { period, page, limit } = req.query;

    const result = await goalAlignmentService.getAlignments(req.user.id, {
      period,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    res.status(200).json({
      success: true,
      count: result.alignments.length,
      ...result.pagination,
      data: result.alignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest alignment snapshot
// @route   GET /api/goal-alignment/latest
// @access  Private
exports.getLatestAlignment = async (req, res, next) => {
  try {
    const { period } = req.query;
    const alignment = await goalAlignmentService.getLatestAlignment(
      req.user.id, period || 'weekly',
    );

    if (!alignment) {
      return res.status(404).json({
        success: false,
        error: 'No alignment data. Run compute first.',
      });
    }

    res.status(200).json({ success: true, data: alignment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alignment trend over time
// @route   GET /api/goal-alignment/trend
// @access  Private
exports.getAlignmentTrend = async (req, res, next) => {
  try {
    const { period, count } = req.query;

    const trend = await goalAlignmentService.getAlignmentTrend(req.user.id, {
      period: period || 'weekly',
      count: parseInt(count, 10) || 8,
    });

    res.status(200).json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single alignment snapshot
// @route   GET /api/goal-alignment/:id
// @access  Private
exports.getAlignmentById = async (req, res, next) => {
  try {
    const GoalAlignment = require('../models/GoalAlignment');
    const alignment = await GoalAlignment.findOne({
      where: { id: req.params.id, user: req.user.id },
    });

    if (!alignment) {
      return res.status(404).json({ success: false, error: 'Alignment snapshot not found' });
    }

    res.status(200).json({ success: true, data: alignment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an alignment snapshot
// @route   DELETE /api/goal-alignment/:id
// @access  Private
exports.deleteAlignment = async (req, res, next) => {
  try {
    const deleted = await goalAlignmentService.deleteAlignment(req.user.id, req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Alignment snapshot not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
