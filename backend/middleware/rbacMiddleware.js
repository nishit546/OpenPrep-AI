/**
 * @fileoverview Granular hierarchical Role-Based Access Control (RBAC) middleware.
 */

// Hierarchy levels mapping roles to integer ranks
const ROLE_HIERARCHY = {
  STUDENT: 1,
  STUDY_LEADER: 2,
  MENTOR: 3,
  INSTITUTION_ADMIN: 4,
  SUPERADMIN: 5,
};

/**
 * Enforces hierarchical role checks. User's role rank must be >= requiredRole rank.
 * @param {string} requiredRole - Role required to access route
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication context missing' });
    }

    const userRole = req.user.role.toUpperCase();
    const targetRole = requiredRole.toUpperCase();

    const userRank = ROLE_HIERARCHY[userRole] || 1;
    const requiredRank = ROLE_HIERARCHY[targetRole] || 1;

    if (userRank >= requiredRank) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Insufficient privileges. Required role: ${requiredRole}`,
    });
  };
};

module.exports = {
  requireRole,
  ROLE_HIERARCHY,
};
