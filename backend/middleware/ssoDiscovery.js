/**
 * @fileoverview Middleware for Institutional SSO Domain Discovery (#2198).
 * Normalizes email input and resolves trusted institution configuration.
 */

const { findInstitutionByEmail } = require('../config/ssoInstitutions');

/**
 * Express middleware to discover SSO availability for an input email.
 */
function discoverSso(req, res, next) {
  const email = req.body?.email || req.query?.email;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email address is required for SSO discovery',
    });
  }

  const institution = findInstitutionByEmail(email);

  if (!institution) {
    return res.status(404).json({
      success: false,
      ssoAvailable: false,
      error: `No institutional SSO configured for domain ${email.split('@')[1] || ''}`,
    });
  }

  req.ssoInstitution = institution;
  next();
}

module.exports = {
  discoverSso,
};
