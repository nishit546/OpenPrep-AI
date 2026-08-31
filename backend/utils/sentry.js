const { Sentry, isSentryReady } = require('../config/sentry');
const logger = require('./logger');

/**
 * Custom Sentry request handler middleware.
 * Captures request context (method, URL, IP) and links the authenticated user's ID/email to Sentry's scope.
 */
const requestHandler = (req, res, next) => {
  if (isSentryReady) {
    Sentry.withScope((scope) => {
      if (req.user) {
        scope.setUser({ id: req.user.id, email: req.user.email });
      }
      scope.setContext('request_details', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
      });
      next();
    });
  } else {
    next();
  }
};

/**
 * Global error handler middleware that dispatches unhandled 500 exceptions to Sentry.
 */
const errorHandler = (err, req, res, next) => {
  if (isSentryReady) {
    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) {
      if (req.user) {
        Sentry.setUser({ id: req.user.id, email: req.user.email });
      }
      Sentry.captureException(err);
    }
  }
  next(err);
};

module.exports = {
  requestHandler,
  errorHandler,
  Sentry,
};
