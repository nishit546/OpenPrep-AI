/**
 * @fileoverview Token rotation, family management, and verification service.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'test_secret';

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict', // Strictly SameSite=Strict as requested!
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, jwtSecret, {
    expiresIn: '15m',
  });
};

const generateTokenFamily = () => crypto.randomBytes(16).toString('hex');

/**
 * Issues a new refresh token under a specific family, appending it to the user's tokens list.
 */
const issueRefreshToken = async (user, family = null, metadata = {}) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenFamily = family || generateTokenFamily();

  const userTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];

  userTokens.push({
    token: hashedToken,
    family: tokenFamily,
    createdAt: new Date(),
    used: false,
    userAgent: metadata.userAgent || 'unknown',
    ip: metadata.ip || '127.0.0.1',
    fingerprint: metadata.fingerprint || 'unknown',
    location: metadata.location || 'Unknown Location',
  });

  user.refreshTokens = userTokens;
  user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
  await user.save();

  return { rawToken, tokenFamily };
};

/**
 * Rotates an old refresh token to issue a new one. Detects reuse and invalidates the entire family.
 */
const rotateRefreshToken = async (user, oldRawToken, metadata = {}) => {
  const oldHashedToken = crypto.createHash('sha256').update(oldRawToken).digest('hex');
  const userTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];

  const foundToken = userTokens.find((t) => t.token === oldHashedToken);

  // If old token not found in the list, or old token was already marked as used, compromise is detected
  if (!foundToken || foundToken.used) {
    // Revoke the entire family (or all tokens to be safe)
    user.refreshTokens = [];
    user.refreshTokenExpire = null;
    await user.save();
    throw new Error('Compromised refresh token reuse detected! Revoking all sessions.');
  }

  // Mark current token as used
  foundToken.used = true;

  // Issue next token in the same family
  const { rawToken } = await issueRefreshToken(user, foundToken.family, metadata);
  return rawToken;
};

module.exports = {
  generateAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  getAuthCookieOptions,
  getAccessTokenCookieOptions,
};
