const studyBuddyService = require('../services/studyBuddyService');
const ActivityLog = require('../models/ActivityLog');

// ── Request Management ───────────────────────────────────────────────────

// @desc    Create a study buddy request
// @route   POST /api/study-buddies
// @access  Private
exports.createRequest = async (req, res, next) => {
  try {
    const {
      subjects, strengths, studyGoals, preferredStudyStyle,
      availabilityWindows, timezone, maxSessionMinutes,
    } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one subject is required',
      });
    }

    const request = await studyBuddyService.createRequest(req.user.id, {
      subjects, strengths, studyGoals, preferredStudyStyle,
      availabilityWindows, timezone, maxSessionMinutes,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'buddy_request_created',
      description: `Created study buddy request for: ${subjects.join(', ')}`,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    if (error.message && error.message.includes('already have an open')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Get all buddy requests for the current user
// @route   GET /api/study-buddies
// @access  Private
exports.getRequests = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    const result = await studyBuddyService.getUserRequests(req.user.id, {
      status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      count: result.requests.length,
      ...result.pagination,
      data: result.requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single buddy request
// @route   GET /api/study-buddies/:id
// @access  Private
exports.getRequest = async (req, res, next) => {
  try {
    const request = await studyBuddyService.getRequestById(req.user.id, req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an open buddy request
// @route   DELETE /api/study-buddies/:id
// @access  Private
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await studyBuddyService.cancelRequest(req.user.id, req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Open request not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Pause or resume a buddy request
// @route   PATCH /api/study-buddies/:id/toggle-pause
// @access  Private
exports.togglePause = async (req, res, next) => {
  try {
    const request = await studyBuddyService.togglePause(req.user.id, req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ── Matching ─────────────────────────────────────────────────────────────

// @desc    Find the best match for the user
// @route   GET /api/study-buddies/match
// @access  Private
exports.findBestMatch = async (req, res, next) => {
  try {
    const result = await studyBuddyService.findBestMatch(req.user.id);

    if (!result) {
      return res.status(200).json({
        success: true,
        data: { match: null, candidates: [], message: 'No open buddy request found. Create one first.' },
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Find all potential matches ranked by compatibility
// @route   GET /api/study-buddies/matches
// @access  Private
exports.findPotentialMatches = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const matches = await studyBuddyService.findPotentialMatches(req.user.id, {
      limit: parseInt(limit, 10) || 10,
    });

    if (!matches) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No open buddy request found. Create one first.',
      });
    }

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a match with a candidate
// @route   POST /api/study-buddies/accept/:candidateRequestId
// @access  Private
exports.acceptMatch = async (req, res, next) => {
  try {
    const result = await studyBuddyService.acceptMatch(req.user.id, req.params.candidateRequestId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'No open request found for you' });
    }

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'buddy_matched',
      description: `Matched with study buddy (compatibility: ${result.compatibility.score}%)`,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message && error.message.includes('no longer available')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Record a completed study session
// @route   POST /api/study-buddies/:id/session
// @access  Private
exports.recordSession = async (req, res, next) => {
  try {
    const request = await studyBuddyService.recordSession(req.user.id, req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Matched request not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        totalSessions: request.totalSessions,
        lastSessionAt: request.lastSessionAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit feedback for a matched buddy
// @route   POST /api/study-buddies/:id/feedback
// @access  Private
exports.submitFeedback = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const request = await studyBuddyService.submitFeedback(req.user.id, req.params.id, {
      rating,
      feedback,
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Matched request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ── Dashboard ────────────────────────────────────────────────────────────

// @desc    Get study buddy dashboard
// @route   GET /api/study-buddies/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studyBuddyService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};
