/**
 * @fileoverview REST Controller for managing active user device sessions and revoking tokens.
 */
const crypto = require('crypto');
const { User } = require('../models');

/**
 * Retrieve a list of active device/browser sessions for the logged in user
 */
const getActiveSessions = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];

    // Filter to active (non-expired and non-used) families
    const activeSessions = tokens
      .filter((t) => !t.used)
      .map((t) => ({
        family: t.family,
        ip: t.ip || 'unknown',
        userAgent: t.userAgent || 'unknown',
        location: t.location || 'Unknown Location',
        createdAt: t.createdAt,
      }));

    res.status(200).json({
      success: true,
      data: activeSessions,
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Revokes a specific session family
 */
const revokeSession = async (req, res) => {
  try {
    const { family } = req.params;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
    // Remove all tokens belonging to this family
    user.refreshTokens = tokens.filter((t) => t.family !== family);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Revokes all active sessions for the user, except for the current session
 */
const revokeAllOtherSessions = async (req, res) => {
  try {
    const currentRawToken = req.cookies.refreshToken;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];

    if (!currentRawToken) {
      // If no current refresh token cookie, clear all
      user.refreshTokens = [];
      await user.save();
      return res.status(200).json({ success: true, message: 'All sessions revoked' });
    }

    const currentHashed = crypto.createHash('sha256').update(currentRawToken).digest('hex');
    const currentTokenObj = tokens.find((t) => t.token === currentHashed);

    if (currentTokenObj) {
      // Invalidate all tokens except those belonging to the current family
      user.refreshTokens = tokens.filter((t) => t.family === currentTokenObj.family);
    } else {
      user.refreshTokens = [];
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'All other sessions revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking other sessions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Endpoint for verifying step-up verification code (OTP)
 */
const verifyStepUpOtp = async (req, res) => {
  try {
    const { otp, userId } = req.body;
    const { otpStore } = require('../middleware/deviceAnomalyMiddleware');

    const storedData = otpStore.get(userId);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'Verification code expired or not found' });
    }

    if (storedData.expires < Date.now()) {
      otpStore.delete(userId);
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    if (storedData.otp === otp) {
      otpStore.delete(userId);
      return res.status(200).json({
        success: true,
        message: 'Step-up authentication successful',
      });
    }

    res.status(400).json({ success: false, message: 'Invalid verification code' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  verifyStepUpOtp,
};
