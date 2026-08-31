const learningJournalService = require('../services/learningJournalService');
const ActivityLog = require('../models/ActivityLog');

// @desc    Generate or update a journal entry for today or a specific date
// @route   POST /api/learning-journal/generate
// @access  Private
exports.generateEntry = async (req, res, next) => {
  try {
    const { date } = req.body;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const entry = await learningJournalService.generateJournalEntry(req.user.id, dateStr);

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get journal entries with pagination and date filtering
// @route   GET /api/learning-journal/entries
// @access  Private
exports.getEntries = async (req, res, next) => {
  try {
    const { startDate, endDate, page, limit } = req.query;

    const result = await learningJournalService.getJournalEntries(req.user.id, {
      startDate, endDate,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      count: result.entries.length,
      ...result.pagination,
      data: result.entries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a journal entry by date
// @route   GET /api/learning-journal/entries/date/:date
// @access  Private
exports.getEntryByDate = async (req, res, next) => {
  try {
    const entry = await learningJournalService.getEntryByDate(req.user.id, req.params.date);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'No journal entry for this date' });
    }
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a journal entry by ID
// @route   GET /api/learning-journal/entries/:id
// @access  Private
exports.getEntry = async (req, res, next) => {
  try {
    const entry = await learningJournalService.getEntryById(req.user.id, req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a reflection to a journal entry
// @route   PUT /api/learning-journal/entries/:id/reflection
// @access  Private
exports.addReflection = async (req, res, next) => {
  try {
    const { reflection } = req.body;
    if (!reflection) {
      return res.status(400).json({ success: false, error: 'Reflection text is required' });
    }

    const entry = await learningJournalService.addReflection(req.user.id, req.params.id, reflection);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Update mood and energy level for a journal entry
// @route   PUT /api/learning-journal/entries/:id/mood
// @access  Private
exports.updateMood = async (req, res, next) => {
  try {
    const { mood, energyLevel } = req.body;

    const entry = await learningJournalService.updateMoodAndEnergy(
      req.user.id, req.params.id, mood, energyLevel,
    );
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a journal entry
// @route   DELETE /api/learning-journal/entries/:id
// @access  Private
exports.deleteEntry = async (req, res, next) => {
  try {
    const deleted = await learningJournalService.deleteEntry(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Get journal analytics
// @route   GET /api/learning-journal/analytics
// @access  Private
exports.getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await learningJournalService.getJournalAnalytics(req.user.id, {
      startDate, endDate,
    });
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the learning timeline (active days only)
// @route   GET /api/learning-journal/timeline
// @access  Private
exports.getTimeline = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await learningJournalService.getTimeline(req.user.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });
    res.status(200).json({
      success: true,
      count: result.timeline.length,
      ...result.pagination,
      data: result.timeline,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get journal dashboard
// @route   GET /api/learning-journal/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await learningJournalService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate journal entries for a date range
// @route   POST /api/learning-journal/generate-range
// @access  Private
exports.generateRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const entries = await learningJournalService.generateJournalRange(
      req.user.id, startDate, endDate,
    );

    res.status(201).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};
