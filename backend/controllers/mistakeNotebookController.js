const MistakeLogEntry = require('../models/MistakeLogEntry');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const mistakeNotebookService = require('../services/mistakeNotebookService');

// @desc    Get user mistake entries with filtering & pagination
// @route   GET /api/mistake-notebook/entries
// @access  Private
exports.getMistakeEntries = async (req, res, next) => {
  try {
    const { status, rootCause, subjectId, topicId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { user: req.user.id };
    if (status) where.status = status;
    if (rootCause) where.rootCause = rootCause;
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;

    const { count, rows } = await MistakeLogEntry.findAndCountAll({
      where,
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      totalCount: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive mistake notebook analytics (Root cause breakdown, cost analysis, recurrence warnings)
// @route   GET /api/mistake-notebook/analytics
// @access  Private
exports.getMistakeAnalytics = async (req, res, next) => {
  try {
    const analytics = await mistakeNotebookService.getMistakeAnalytics(req.user.id);
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update/Triage Root Cause & Notes for a Mistake Entry
// @route   PATCH /api/mistake-notebook/entries/:id/classify
// @access  Private
exports.classifyMistake = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rootCause, notes, status } = req.body;

    const entry = await MistakeLogEntry.findOne({
      where: { id, user: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Mistake log entry not found.' });
    }

    if (rootCause) {
      if (!mistakeNotebookService.ROOT_CAUSES.includes(rootCause)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rootCause. Must be one of: ${mistakeNotebookService.ROOT_CAUSES.join(', ')}`,
        });
      }
      entry.rootCause = rootCause;
    }

    if (notes !== undefined) {
      entry.notes = notes;
    }

    if (status) {
      entry.status = status;
      if (status === 'resolved') {
        entry.resolvedAt = new Date();
      }
    }

    await entry.save();

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Auto-Curated Redo Practice Drill
// @route   POST /api/mistake-notebook/redo-drill/generate
// @access  Private
exports.generateRedoDrill = async (req, res, next) => {
  try {
    const { limit = 10, subjectId, minSpacingHours } = req.body;
    const drill = await mistakeNotebookService.generateRedoDrill(req.user.id, {
      limit: parseInt(limit, 10),
      subjectId,
      minSpacingHours: minSpacingHours !== undefined ? Number(minSpacingHours) : 0,
    });

    res.status(200).json({
      success: true,
      data: drill,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Redo Attempt for a mistake item
// @route   POST /api/mistake-notebook/entries/:id/redo
// @access  Private
exports.submitRedoAttempt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedAnswer, timeSpentSeconds } = req.body;

    if (selectedAnswer === undefined) {
      return res.status(400).json({ success: false, error: 'selectedAnswer is required.' });
    }

    const result = await mistakeNotebookService.recordRedoAttempt(req.user.id, id, {
      selectedAnswer,
      timeSpentSeconds,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
