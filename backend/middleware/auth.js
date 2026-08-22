const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes middleware
 * Reads JWT token from HttpOnly cookies (req.cookies.token) or Authorization header (Bearer token)
 */
exports.protect = async (req, res, next) => {
  let token;

  // 1. Read token from HttpOnly cookie first
  if (req.cookies && (req.cookies.token || req.cookies.accessToken)) {
    token = req.cookies.token || req.cookies.accessToken;
  }
  // 2. Fall back to Authorization header for backward compatibility / API clients
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    const user = await User.findByPk(decoded.id, {
      attributes: {
        exclude: [
          'password',
          'refreshTokens',
          'refreshTokenExpire',
          'emailVerificationToken',
          'emailVerificationExpire',
          'resetPasswordToken',
          'resetPasswordExpire',
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    const { rlsStorage } = require('./rlsContext');
    rlsStorage.run({ userId: user.id, isAdmin: user.role === 'admin' }, () => {
      next();
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

/**
 * Grant access to specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied: Admin role required',
  });
};
