const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticates the quiz telemetry batch endpoint.
 *
 * Periodic 10-second flushes go through the normal axios instance and
 * send a standard "Authorization: Bearer <token>" header, same as every
 * other protected route.
 *
 * The final flush on tab-close/navigation uses navigator.sendBeacon(),
 * which cannot set custom headers, so for that call the client includes
 * the access token inside the JSON body instead (`{ token, events }`).
 * This middleware accepts either.
 */
const telemetryAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.body && typeof req.body.token === 'string') {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

module.exports = telemetryAuth;