const studyPlanVersioningService = require('../services/studyPlanVersioningService');
const ActivityLog = require('../models/ActivityLog');

// @desc    Create a version snapshot of a study plan
// @route   POST /api/study-plans/:planId/versions
// @access  Private
exports.createVersion = async (req, res, next) => {
  try {
    const { changeType, changeDescription } = req.body;

    const version = await studyPlanVersioningService.createVersion(
      req.user.id, req.params.planId, changeType, changeDescription,
    );

    res.status(201).json({ success: true, data: version });
  } catch (error) {
    if (error.message === 'Study plan not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Get version history for a study plan
// @route   GET /api/study-plans/:planId/versions
// @access  Private
exports.getVersionHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await studyPlanVersioningService.getVersionHistory(
      req.user.id, req.params.planId,
      { page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 },
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    res.status(200).json({
      success: true,
      count: result.versions.length,
      ...result.pagination,
      plan: result.plan,
      data: result.versions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a specific version by number
// @route   GET /api/study-plans/:planId/versions/:versionNumber
// @access  Private
exports.getVersion = async (req, res, next) => {
  try {
    const version = await studyPlanVersioningService.getVersionByNumber(
      req.user.id, req.params.planId, parseInt(req.params.versionNumber, 10),
    );

    if (!version) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }

    res.status(200).json({ success: true, data: version });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the latest version for a study plan
// @route   GET /api/study-plans/:planId/versions/latest
// @access  Private
exports.getLatestVersion = async (req, res, next) => {
  try {
    const version = await studyPlanVersioningService.getLatestVersion(
      req.user.id, req.params.planId,
    );

    if (!version) {
      return res.status(404).json({ success: false, error: 'No versions found for this plan' });
    }

    res.status(200).json({ success: true, data: version });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare two versions
// @route   GET /api/study-plans/:planId/versions/compare
// @access  Private
exports.compareVersions = async (req, res, next) => {
  try {
    const { versionA, versionB } = req.query;

    if (!versionA || !versionB) {
      return res.status(400).json({
        success: false,
        error: 'versionA and versionB query params are required',
      });
    }

    const comparison = await studyPlanVersioningService.compareVersions(
      req.user.id, req.params.planId,
      parseInt(versionA, 10), parseInt(versionB, 10),
    );

    res.status(200).json({ success: true, data: comparison });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Restore a study plan to a previous version
// @route   POST /api/study-plans/:planId/versions/:versionNumber/restore
// @access  Private
exports.restoreVersion = async (req, res, next) => {
  try {
    const result = await studyPlanVersioningService.restoreVersion(
      req.user.id, req.params.planId, parseInt(req.params.versionNumber, 10),
    );

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'study_plan_create',
      description: `Restored study plan to version ${req.params.versionNumber}`,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Get version summary and evolution for a plan
// @route   GET /api/study-plans/:planId/versions/summary
// @access  Private
exports.getVersionSummary = async (req, res, next) => {
  try {
    const summary = await studyPlanVersioningService.getPlanVersionSummary(
      req.user.id, req.params.planId,
    );

    if (!summary) {
      return res.status(404).json({ success: false, error: 'No versions found' });
    }

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a specific version
// @route   DELETE /api/study-plans/:planId/versions/:versionId
// @access  Private
exports.deleteVersion = async (req, res, next) => {
  try {
    const deleted = await studyPlanVersioningService.deleteVersion(
      req.user.id, req.params.versionId,
    );

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
