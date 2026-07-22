const { Op, Sequelize } = require('sequelize');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

// @desc    Submit Bug Report or Feature Request
// @route   POST /api/community/feedback
// @access  Private
exports.submitFeedback = async (req, res, next) => {
  try {
    const { title, description, type } = req.body;

    const feedback = await Feedback.create({
      title,
      description,
      type,
      user: req.user.id,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback items (Bug Reports / Feature Requests)
// @route   GET /api/community/feedback
// @access  Private
exports.getFeedbackList = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Count total matching items (efficient COUNT query, not affected by pagination)
    const total = await Feedback.count({ where: filter });

    // Fetch only the requested page, sorted by upvote count at the database level
    const items = await Feedback.findAll({
      where: filter,
      include: [{ model: User, as: 'userRef', attributes: ['id', 'name', 'email'] }],
      order: [
        [Sequelize.literal('COALESCE(array_length("upvotes", 1), 0)'), 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
    });

    const paginatedItems = items.map((item) => {
      const json = item.toJSON();
      json.user = json.userRef;
      return json;
    });

    res.status(200).json({
      success: true,
      count: paginatedItems.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: paginatedItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote Feedback item
// @route   PUT /api/community/feedback/:id/upvote
// @access  Private
exports.upvoteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback item not found' });
    }

    // Toggle upvote in PostgreSQL array
    const upvotes = [...(feedback.upvotes || [])];
    const upvoteIndex = upvotes.indexOf(req.user.id);

    if (upvoteIndex > -1) {
      upvotes.splice(upvoteIndex, 1);
    } else {
      upvotes.push(req.user.id);
    }

    feedback.upvotes = upvotes;
    await feedback.save();

    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Public Roadmap Milestones
// @route   GET /api/community/roadmap
// @access  Private
exports.getPublicRoadmap = async (req, res, next) => {
  try {
    // Dynamic roadmap showing planned features, what is in development, etc.
    const feedbackRoadmap = await Feedback.findAll({
      where: {
        status: {
          [Op.in]: ['under_review', 'planned', 'in_development', 'completed'],
        },
      },
      order: [['status', 'ASC']],
    });

    // Mock static milestone targets combined with dynamic submissions
    const milestones = [
      {
        id: 'v1',
        title: 'Release Version 1.0 (Core Engine)',
        description:
          'Vite app skeleton, JWT protected APIs, Multer uploading, and Gemini quiz builder.',
        status: 'completed',
      },
      {
        id: 'v2',
        title: 'Release Version 2.0 (Study Planner & Spaced Repetition)',
        description:
          'Auto Study calendars, SuperMemo SM-2 adaptation flashcards, and graph analytics.',
        status: 'in_development',
      },
      {
        id: 'v3',
        title: 'Release Version 3.0 (Social Collaborations & Gamification)',
        description:
          'Study Battles, shared public notes repository downloads, and leaderboard ranking.',
        status: 'planned',
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        milestones,
        communityFeatures: feedbackRoadmap,
      },
    });
  } catch (error) {
    next(error);
  }
};
