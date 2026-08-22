const { User, Quiz, Flashcard, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// @desc    Get platform-wide analytics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    
    // DAU: users active today (lastActivityDate is today) or updated in the last 24 hours
    const todayStr = new Date().toISOString().split('T')[0];
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const dau = await User.count({
      where: {
        [Op.or]: [
          { lastActivityDate: todayStr },
          { updatedAt: { [Op.gte]: past24Hours } },
        ],
      },
    });

    const totalQuizzes = await Quiz.count();
    const totalFlashcards = await Flashcard.count();
    const aiRequestsToday = (await User.sum('dailyAiUsageCount')) || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        dau: Math.max(1, dau), // Guarantee at least 1 (the current admin)
        totalQuizzes,
        totalFlashcards,
        aiRequestsToday,
      },
    });
  } catch (error) {
    console.error('[adminController.getStats] Error:', error);
    next(error);
  }
};

// @desc    Get paginated users list with search filter
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search.trim()) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count: total, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt', 'lastActivityDate'],
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.error('[adminController.getUsers] Error:', error);
    next(error);
  }
};

// @desc    Update a user's role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['student', 'contributor', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid user role' });
    }

    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Create audit log entry
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'admin_audit',
      description: `Promoted/Updated user role for ${targetUser.email} from ${oldRole} to ${role}`,
    });

    res.status(200).json({
      success: true,
      message: `User role updated successfully to ${role}`,
      data: {
        id: targetUser.id,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error('[adminController.updateUserRole] Error:', error);
    next(error);
  }
};

// @desc    Delete/ban a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete/ban yourself' });
    }

    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userEmail = targetUser.email;
    await targetUser.destroy();

    // Create audit log entry
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'admin_audit',
      description: `Banned/Deleted user account ${userEmail}`,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[adminController.deleteUser] Error:', error);
    next(error);
  }
};

// @desc    Get background task queue status and DLQ list
// @route   GET /api/admin/queues/status
// @access  Private/Admin
exports.getQueueStatus = async (req, res, next) => {
  try {
    const queueService = require('../services/queueService');
    const stats = await queueService.getQueueStats();
    const recentDlq = await queueService.getDlqJobs(20);

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentDlq,
      },
    });
  } catch (error) {
    console.error('[adminController.getQueueStatus] Error:', error);
    next(error);
  }
};
