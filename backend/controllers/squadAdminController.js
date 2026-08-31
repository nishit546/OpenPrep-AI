const { Op } = require('sequelize');
const { SquadAuditLog, User, SquadMember } = require('../models');
const { DEFAULT_PERMISSIONS } = require('../middleware/squadAuth');
const squadAuditService = require('../services/squadAuditService');

/**
 * GET /api/squads/:id/audit-logs
 * Retrieves paginated and filterable audit logs.
 */
const getAuditLogs = async (req, res) => {
  const squadId = req.params.id;
  const { page = 1, limit = 10, action, search, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;

  // Build filters
  const where = { squadId };
  if (action) {
    where.action = action;
  }
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[Op.gte] = new Date(startDate);
    if (endDate) where.created_at[Op.lte] = new Date(endDate);
  }

  const userInclude = {
    model: User,
    as: 'actor',
    attributes: ['id', 'name', 'email', 'avatarUrl'],
  };

  if (search) {
    userInclude.where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ],
    };
  }

  try {
    const { count, rows } = await SquadAuditLog.findAndCountAll({
      where,
      include: [userInclude],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.json({
      success: true,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      logs: rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/squads/:id/members/:userId/role
 * Updates a squad member's role and adjusts their permissions bitmask.
 */
const updateMemberRole = async (req, res) => {
  const squadId = req.params.id;
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || DEFAULT_PERMISSIONS[role] === undefined) {
    return res.status(400).json({ success: false, error: 'Invalid squad role requested' });
  }

  try {
    const requester = await SquadMember.findOne({
      where: { squadId, userId: req.user.id },
    });

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Only owners and admins can modify roles' });
    }

    const target = await SquadMember.findOne({
      where: { squadId, userId },
    });

    if (!target) {
      return res.status(404).json({ success: false, error: 'Target squad member not found' });
    }

    // Role transfer logic for OWNER
    if (role === 'owner') {
      if (requester.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Forbidden: Only the squad owner can transfer ownership' });
      }

      await target.update({ role: 'owner', permissions: DEFAULT_PERMISSIONS.owner });
      await requester.update({ role: 'admin', permissions: DEFAULT_PERMISSIONS.admin });

      await squadAuditService.logSquadEvent({
        squadId,
        userId: req.user.id,
        action: 'ROLE_CHANGED',
        ipAddress: req.ip,
        metadata: { targetUserId: userId, oldRole: target.role, newRole: 'owner', details: 'Ownership transferred' },
      });

      return res.json({ success: true, message: 'Ownership transferred successfully' });
    }

    // Admins cannot change owner roles, nor can they promote someone to admin
    if (requester.role === 'admin' && (role === 'admin' || target.role === 'admin' || target.role === 'owner')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admins cannot assign admin/owner roles' });
    }

    const oldRole = target.role;
    await target.update({
      role,
      permissions: DEFAULT_PERMISSIONS[role],
    });

    await squadAuditService.logSquadEvent({
      squadId,
      userId: req.user.id,
      action: 'ROLE_CHANGED',
      ipAddress: req.ip,
      metadata: { targetUserId: userId, oldRole, newRole: role },
    });

    return res.json({ success: true, message: `Role updated to ${role} successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/squads/:id/members/:userId
 * Kicks a squad member.
 */
const kickMember = async (req, res) => {
  const squadId = req.params.id;
  const { userId } = req.params;

  try {
    const requester = await SquadMember.findOne({
      where: { squadId, userId: req.user.id },
    });

    const target = await SquadMember.findOne({
      where: { squadId, userId },
    });

    if (!target) {
      return res.status(404).json({ success: false, error: 'Target member not found' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot kick yourself' });
    }

    if (target.role === 'owner') {
      return res.status(403).json({ success: false, error: 'Forbidden: Squad owner cannot be kicked' });
    }

    if (requester.role === 'admin' && target.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admins cannot kick other admins' });
    }

    await target.destroy();

    await squadAuditService.logSquadEvent({
      squadId,
      userId: req.user.id,
      action: 'MEMBER_KICKED',
      ipAddress: req.ip,
      metadata: { targetUserId: userId },
    });

    return res.json({ success: true, message: 'Member kicked from Study Squad successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAuditLogs,
  updateMemberRole,
  kickMember,
};
