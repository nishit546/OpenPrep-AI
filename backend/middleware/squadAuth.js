const SquadMember = require('../models/SquadMember');

const PERMISSIONS = {
  CAN_EDIT_DECKS: 1 << 0,      // 1
  CAN_DELETE_NOTES: 1 << 1,    // 2
  CAN_INVITE_MEMBERS: 1 << 2,  // 4
  CAN_BAN_MEMBERS: 1 << 3,     // 8
  CAN_VIEW_AUDIT_LOGS: 1 << 4, // 16
};

const DEFAULT_PERMISSIONS = {
  owner: 31,       // 1|2|4|8|16 = 31
  admin: 31,       // 31
  moderator: 23,   // 1|2|4|16 = 23 (no ban)
  contributor: 5,  // 1|4 = 5
  viewer: 0,
};

function hasPermission(userBitmask, permissionKey) {
  const requiredBit = PERMISSIONS[permissionKey];
  if (!requiredBit) return false;
  return (userBitmask & requiredBit) === requiredBit;
}

const requireSquadPermission = (permissionKey) => {
  return async (req, res, next) => {
    const squadId = req.params.squadId || req.params.id || req.body.squadId;
    
    if (!squadId) {
      return res.status(400).json({ success: false, error: 'Squad ID is required for authorization' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    try {
      const membership = await SquadMember.findOne({
        where: {
          squadId,
          userId: req.user.id,
        },
      });

      if (!membership) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied: You are not a member of this Study Squad' 
        });
      }

      if (!hasPermission(membership.permissions, permissionKey)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access denied: Missing required permission ${permissionKey}` 
        });
      }

      req.squadMembership = membership;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
};

module.exports = {
  PERMISSIONS,
  DEFAULT_PERMISSIONS,
  hasPermission,
  requireSquadPermission,
};
