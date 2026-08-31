const passkeyService = require('../services/passkeyAuthService');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

/**
 * @desc    Generate WebAuthn passkey registration options
 * @route   POST /api/auth/passkey/register-challenge
 * @access  Private
 */
exports.getRegisterChallenge = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const options = await passkeyService.generateRegisterChallenge(user);
    res.status(200).json({ success: true, options });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify WebAuthn registration response and save passkey
 * @route   POST /api/auth/passkey/register-verify
 * @access  Private
 */
exports.verifyRegister = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { response, deviceName } = req.body;
    if (!response) {
      return res.status(400).json({ success: false, error: 'Registration response payload is required' });
    }

    const result = await passkeyService.verifyRegister(user, response, deviceName);
    res.status(200).json({
      success: true,
      message: 'Passkey registered successfully',
      passkey: {
        id: result.passkey.id,
        deviceName: result.passkey.deviceName,
        createdAt: result.passkey.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Generate WebAuthn login authentication challenge
 * @route   POST /api/auth/passkey/login-challenge
 * @access  Public
 */
exports.getLoginChallenge = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const { options, challengeId } = await passkeyService.generateLoginChallenge(email);

    res.status(200).json({
      success: true,
      options,
      challengeId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify WebAuthn login response and issue JWT session
 * @route   POST /api/auth/passkey/login-verify
 * @access  Public
 */
exports.verifyLogin = async (req, res, next) => {
  try {
    const { response, challengeId } = req.body;
    if (!response || !challengeId) {
      return res.status(400).json({
        success: false,
        error: 'Passkey response and challengeId are required',
      });
    }

    const result = await passkeyService.verifyLogin(response, challengeId);
    const user = result.user;

    const accessToken = generateAccessToken(user.id);
    res.cookie('token', accessToken, getAccessTokenCookieOptions());

    res.status(200).json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * @desc    List all registered passkeys for the current user
 * @route   GET /api/auth/passkey/list
 * @access  Private
 */
exports.listPasskeys = async (req, res, next) => {
  try {
    const passkeys = await passkeyService.getUserPasskeys(req.user.id);
    res.status(200).json({ success: true, passkeys });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/revoke a registered passkey
 * @route   DELETE /api/auth/passkey/:id
 * @access  Private
 */
exports.deletePasskey = async (req, res, next) => {
  try {
    const { id } = req.params;
    await passkeyService.deleteUserPasskey(req.user.id, id);
    res.status(200).json({ success: true, message: 'Passkey deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
