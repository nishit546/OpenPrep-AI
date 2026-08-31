const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let speakeasy = null;
let QRCode = null;
try {
  speakeasy = require('speakeasy');
  QRCode = require('qrcode');
} catch (e) {
  // Graceful fallback for test environments without optional dependencies
}
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const sendEmail = require('../services/emailService');

const MAX_ACTIVE_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS, 10) || 10;
const jwtSecret = process.env.JWT_SECRET;

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

/**
 * Short-lived token binding a provider identity we have already authenticated.
 *
 * Used when a provider gives us no usable email and the user has to supply one.
 * Signing it means the follow-up request proves it came from a real OAuth
 * round trip rather than simply naming an identity.
 */
const PENDING_OAUTH_TTL = '15m';

const generatePendingOAuthToken = (payload) =>
  jwt.sign(
    { ...payload, type: 'oauth_pending' },
    jwtSecret,
    { expiresIn: PENDING_OAUTH_TTL }
  );

const verifyPendingOAuthToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.type !== 'oauth_pending' || !decoded.githubId) return null;
    return decoded;
  } catch {
    return null;
  }
};

const generateTokenFamily = () => crypto.randomBytes(16).toString('hex');

const generateRefreshToken = async (user, family = null) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenFamily = family || generateTokenFamily();

  const userTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
  userTokens.push({
    token: hashedToken,
    family: tokenFamily,
    createdAt: new Date(),
  });

  user.refreshTokens = userTokens;
  user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await user.save();

  return { rawToken, tokenFamily };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, getAuthCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', getAuthCookieOptions());
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

const getClientBaseUrl = () =>
  process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Issue a single-use token, store only its SHA-256 hash, and hand back the raw
 * value for the email body.
 *
 * Storing the hash rather than the token itself means a leaked database dump
 * can't be replayed to verify accounts or reset passwords — the same approach
 * `generateRefreshToken` already takes for refresh tokens.
 */
const createSingleUseToken = (ttlMs) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken, expiresAt: new Date(Date.now() + ttlMs) };
};

/**
 * Generate a fresh email-verification token for `user`, persist its hash, and
 * send the verification link.
 */
const sendVerificationEmail = async (user) => {
  const { rawToken, hashedToken, expiresAt } = createSingleUseToken(EMAIL_VERIFICATION_TTL_MS);

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = expiresAt;
  await user.save();

  const verifyUrl = `${getClientBaseUrl()}/verify-email/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your OpenPrep AI email address',
    text: `Hi ${user.name || 'there'},\n\nConfirm your email address to activate your OpenPrep AI account:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create an account, you can ignore this message.`,
    html: `<p>Hi ${user.name || 'there'},</p><p>Confirm your email address to activate your OpenPrep AI account:</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours. If you didn't create an account, you can ignore this message.</p>`,
  });
};

/**
 * Generate a password-reset token for `user`, persist its hash, and send the
 * reset link.
 */
const sendPasswordResetEmail = async (user) => {
  const { rawToken, hashedToken, expiresAt } = createSingleUseToken(PASSWORD_RESET_TTL_MS);

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = expiresAt;
  await user.save();

  const resetUrl = `${getClientBaseUrl()}/reset-password/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your OpenPrep AI password',
    text: `Hi ${user.name || 'there'},\n\nUse the link below to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a reset, no action is needed.`,
    html: `<p>Hi ${user.name || 'there'},</p><p>Use the link below to choose a new password:</p><p><a href="${resetUrl}">Reset my password</a></p><p>This link expires in 1 hour. If you didn't request a reset, no action is needed.</p>`,
  });
};

/**
 * Generate a 6-digit OTP for `user`, persist only its bcrypt hash, and email
 * the raw code. The OTP is single-use and expires after 15 minutes; the hash
 * is cleared after successful verification or reset.
 */
const sendPasswordResetOtp = async (user) => {
  const otp = String(crypto.randomInt(100000, 1000000)); // 6-digit code
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

  user.resetPasswordOtpHash = hashedOtp;
  user.resetPasswordOtpExpires = expiresAt;
  user.resetPasswordAttempts = 0;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Your OpenPrep AI password reset code',
    text: `Hi ${user.name || 'there'},\n\nYour password reset code is:\n\n${otp}\n\nThis code expires in 15 minutes. If you didn't request a reset, no action is needed.`,
    html: `<p>Hi ${user.name || 'there'},</p><p>Your password reset code is:</p><p><strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>This code expires in 15 minutes. If you didn't request a reset, no action is needed.</p>`,
  });

  return otp;
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               password:
 *                 type: string
 *                 example: "SecretPass123!"
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin]
 *                 default: student
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Wrap multi-step creation in an ACID transaction
    user = await sequelize.transaction(async (t) => {
      const newUser = await User.create({
        name,
        email,
        password,
        role: 'student',
      }, { transaction: t });

      // Mocking Profile creation to fix the corrupted state issue
      // await Profile.create({ userId: newUser.id, avatar: null }, { transaction: t });
      
      // Mocking Settings creation
      // await Settings.create({ userId: newUser.id, theme: 'dark' }, { transaction: t });

      return newUser;
    });

    const accessToken = generateAccessToken(user.id);
    res.cookie('token', accessToken, getAccessTokenCookieOptions());

    res.status(201).json({
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
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user and issue access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               password:
 *                 type: string
 *                 example: "SecretPass123!"
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

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
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Setup 2FA (Generate secret and backup codes)
// @route   POST /api/auth/2fa/setup
// @access  Private
// ---------------------------------------------------------------------------
exports.setup2FA = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({ name: `OpenPrep-AI (${user.email})` });
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

    user.twoFactorAuth = {
      enabled: false,
      secret: secret.base32,
      backupCodes,
    };
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Verify and Enable 2FA
// @route   POST /api/auth/2fa/verify-setup
// @access  Private
// ---------------------------------------------------------------------------
exports.verifyAndEnable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.secret) {
      return res.status(400).json({ success: false, error: '2FA setup has not been initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    user.twoFactorAuth = {
      ...user.twoFactorAuth,
      enabled: true,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication successfully enabled',
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Verify TOTP or Backup Code during Login
// @route   POST /api/auth/2fa/verify-login
// @access  Public
// ---------------------------------------------------------------------------
exports.verifyLogin2FA = async (req, res, next) => {
  try {
    const { email, token } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({ success: false, error: 'Invalid request or 2FA not enabled' });
    }

    let verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    // Check backup codes if TOTP fails
    if (!verified && user.twoFactorAuth.backupCodes?.includes(token)) {
      verified = true;
      // Remove used backup code
      user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(code => code !== token);
      await user.save();
    }

    if (!verified) {
      return res.status(401).json({ success: false, error: 'Invalid 2FA code or backup code' });
    }

    // Issue tokens upon successful 2FA verification
    const tokenFamily = generateTokenFamily();
    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user, tokenFamily);
    const refreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, refreshToken);
    res.cookie('token', accessToken, getAccessTokenCookieOptions());

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retrieve currently authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Achievement, as: 'achievements' }],
    });
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        leaderboardVisible: user.leaderboardVisible,
        receiveWeeklyDigest: user.receiveWeeklyDigest,
        sm2EasyFactorModifier: user.sm2EasyFactorModifier,
        sm2IntervalModifier: user.sm2IntervalModifier,
        sm2Step1Interval: user.sm2Step1Interval,
        sm2Step2Interval: user.sm2Step2Interval,
        streak: {
          count: user.streakCount,
          lastActive: user.streakLastActive,
          freezes: user.streakFreezes || 0,
        },
        studyHours: user.studyHours,
        isEmailVerified: user.isEmailVerified,
        achievements: user.achievements || [],
        xp: user.xp || 0,
        level: user.level || 1,
        badges: user.badges || [],
        skillPoints: user.skillPoints || 0,
        unlockedNodes: user.unlockedNodes || ['root'],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/settings:
 *   patch:
 *     summary: Update user settings and preferences
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leaderboardVisible:
 *                 type: boolean
 *               hideActivityFromSquad:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { leaderboardVisible, hideActivityFromSquad, locale } = req.body;

    if (typeof leaderboardVisible === 'boolean') {
      req.user.leaderboardVisible = leaderboardVisible;
    }
    if (typeof hideActivityFromSquad === 'boolean') {
      req.user.hideActivityFromSquad = hideActivityFromSquad;
    }
    if (locale && typeof locale === 'string') {
      req.user.locale = locale;
    }
    await req.user.save();

    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        locale: req.user.locale || 'en',
        streak: {
          count: req.user.streakCount,
          lastActive: req.user.streakLastActive,
          freezes: req.user.streakFreezes || 0,
        },
        studyHours: req.user.studyHours,
        isEmailVerified: req.user.isEmailVerified,
        leaderboardVisible: req.user.leaderboardVisible,
        hideActivityFromSquad: req.user.hideActivityFromSquad,
        syncGoogleCalendar: req.user.syncGoogleCalendar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a 6-digit password reset code via email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *     responses:
 *       200:
 *         description: Password reset code request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If the email exists, a reset code has been sent"
 *       429:
 *         description: Resend cooldown active - wait 60 seconds
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always return the same response to prevent email enumeration
    if (user) {
      // Enforce a 60-second cooldown between resend requests
      if (user.resetPasswordOtpExpires) {
        const otpIssuedAt = new Date(
          user.resetPasswordOtpExpires.getTime() - PASSWORD_RESET_OTP_TTL_MS
        );
        if (
          user.resetPasswordOtpHash &&
          Date.now() - otpIssuedAt.getTime() < PASSWORD_RESET_OTP_RESEND_COOLDOWN_MS
        ) {
          return res.status(429).json({
            success: false,
            error: 'Please wait 60 seconds before requesting a new code.',
          });
        }
      }

      await sendPasswordResetOtp(user);
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset code has been sent',
    });
  } catch (error) {
    // If email sending failed, clear the OTP from DB
    const user = await User.findOne({ where: { email: req.body.email } });
    if (user) {
      user.resetPasswordOtpHash = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordAttempts = 0;
      await user.save();
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Reset user password using reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "NewSecurePassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    // Invalidate all existing refresh tokens on password reset
    user.refreshTokens = [];

    // Generate new token family for fresh session after password reset
    const tokenFamily = generateTokenFamily();
    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user, tokenFamily);
    const refreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
      token: accessToken,
      refreshToken, // Also return in body for backward compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Support both cookie and body for refresh token
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }

    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find user who has this hashed refresh token (supports PostgreSQL Op.contains with DB-agnostic fallback)
    let user;
    try {
      user = await User.findOne({
        where: {
          refreshTokens: {
            [Op.contains]: [{ token: hashed }],
          },
          refreshTokenExpire: { [Op.gt]: new Date() },
        },
      });
    } catch (dbErr) {
      const users = await User.findAll({
        where: {
          refreshTokenExpire: { [Op.gt]: new Date() },
        },
      });
      user = users.find(
        (u) => Array.isArray(u.refreshTokens) && u.refreshTokens.some((t) => t.token === hashed)
      );
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Find the specific token entry to get its family
    const tokenEntry = user.refreshTokens.find((t) => t.token === hashed);
    if (!tokenEntry) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    const tokenFamily = tokenEntry.family;

    // RTR: Check if this token family has been invalidated (reuse detection)
    const familyStillValid = user.refreshTokens.some((t) => t.family === tokenFamily);
    if (!familyStillValid) {
      // Token family was invalidated - this is a reuse attack!
      // Invalidate ALL tokens for this user as a security measure
      user.refreshTokens = [];
      await user.save();
      clearRefreshTokenCookie(res);
      return res
        .status(401)
        .json({ success: false, error: 'Token reuse detected. All sessions invalidated.' });
    }

    // Remove old token (rotation)
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== hashed);

    // Prune any tokens beyond the active session limit
    if (user.refreshTokens.length > MAX_ACTIVE_SESSIONS) {
      user.refreshTokens = user.refreshTokens.slice(-MAX_ACTIVE_SESSIONS);
    }

    // Generate new pair with same token family (rotation)
    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user, tokenFamily);
    const newRefreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken, // Also return in body for backward compatibility
    });
  } catch (error) {
    next(error);
  }
};

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------------------------------------------------------------------------
// @desc    Google OAuth Login / Register via credential token
// @route   POST /api/auth/google
// @access  Public
// ---------------------------------------------------------------------------
exports.googleLogin = async (req, res, next) => {
  try {
    const { credential, access_token } = req.body;

    let email, name, googleId, picture;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        googleId = payload.sub;
        picture = payload.picture;
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Google credential - token verification failed',
        });
      }
    } else if (access_token) {
      // Access token flow via Google UserInfo API
      const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
      if (!userInfoRes.ok) {
        return res.status(400).json({ success: false, error: 'Failed to fetch Google user info' });
      }
      const userInfo = await userInfoRes.json();
      email = userInfo.email;
      name = userInfo.name;
      googleId = userInfo.sub;
      picture = userInfo.picture;
    } else {
      return res.status(400).json({ success: false, error: 'Google credential token or access_token is required' });
    }

    if (!email) {
      return res.status(400).json({ success: false, error: 'Unable to retrieve email from Google account' });
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        socialId: googleId,
        provider: 'google',
        avatar: picture || '',
        isEmailVerified: true,
        password: null,
      });
    } else {
      if (!user.socialId) {
        user.socialId = googleId;
        user.provider = 'google';
      }
      user.isEmailVerified = true;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user);
    const refreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, refreshToken);
    res.cookie('token', accessToken, getAccessTokenCookieOptions());

    return res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SM-2 parameters
// @route   PUT /api/auth/sm2-settings
// @access  Private
exports.updateSM2Settings = async (req, res, next) => {
  try {
    const { sm2EasyFactorModifier, sm2IntervalModifier, sm2Step1Interval, sm2Step2Interval } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (sm2EasyFactorModifier !== undefined) {
      user.sm2EasyFactorModifier = sm2EasyFactorModifier;
    }
    if (sm2IntervalModifier !== undefined) {
      user.sm2IntervalModifier = sm2IntervalModifier;
    }
    if (sm2Step1Interval !== undefined) {
      user.sm2Step1Interval = sm2Step1Interval;
    }
    if (sm2Step2Interval !== undefined) {
      user.sm2Step2Interval = sm2Step2Interval;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        leaderboardVisible: user.leaderboardVisible,
        receiveWeeklyDigest: user.receiveWeeklyDigest,
        sm2EasyFactorModifier: user.sm2EasyFactorModifier,
        sm2IntervalModifier: user.sm2IntervalModifier,
        sm2Step1Interval: user.sm2Step1Interval,
        sm2Step2Interval: user.sm2Step2Interval,
        streak: {
          count: user.streakCount,
          lastActive: user.streakLastActive,
        },
        studyHours: user.studyHours,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset SM-2 parameters
// @route   POST /api/auth/sm2-settings/reset
// @access  Private
exports.resetSM2Settings = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.sm2EasyFactorModifier = 1.0;
    user.sm2IntervalModifier = 1.0;
    user.sm2Step1Interval = 1;
    user.sm2Step2Interval = 6;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Reset to default parameters successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        leaderboardVisible: user.leaderboardVisible,
        receiveWeeklyDigest: user.receiveWeeklyDigest,
        sm2EasyFactorModifier: user.sm2EasyFactorModifier,
        sm2IntervalModifier: user.sm2IntervalModifier,
        sm2Step1Interval: user.sm2Step1Interval,
        sm2Step2Interval: user.sm2Step2Interval,
        streak: {
          count: user.streakCount,
          lastActive: user.streakLastActive,
        },
        studyHours: user.studyHours,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.oauthSuccessCallback = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?error=oauth_failed`);
    }

    if (user.isTemp) {
      const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
      // The provider id goes back to the browser inside a short-lived signed
      // token, not as a query parameter. registerOAuthEmail used to accept a
      // raw githubId from the request body, which let anyone claim any identity
      // without going through the provider at all.
      const pendingToken = generatePendingOAuthToken({
        provider: user.provider || 'github',
        githubId: user.githubId,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
      return res.redirect(
        `${frontendBase.replace(/\/$/, '')}/oauth-callback?prompt_email=true&pendingToken=${encodeURIComponent(pendingToken)}`
      );
    }

    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user);
    const refreshToken = refreshResult.rawToken;
    setRefreshTokenCookie(res, refreshToken);

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendBase.replace(/\/$/, '')}/oauth-callback?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};

exports.registerOAuthEmail = async (req, res, next) => {
  try {
    const { email, pendingToken } = req.body;
    if (!email || !pendingToken) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and a valid sign-in token are required.' });
    }

    const pending = verifyPendingOAuthToken(pendingToken);
    if (!pending) {
      return res
        .status(401)
        .json({ success: false, error: 'This sign-in link has expired. Start again.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { githubId, name, avatarUrl } = pending;

    let user = await User.findOne({ where: { githubId } });
    if (!user) {
      const existingByEmail = await User.findOne({ where: { email: normalizedEmail } });
      if (existingByEmail) {
        // The address came from the user, not from GitHub — nothing has
        // verified that they own it. Attaching the provider id to somebody
        // else's account on that basis is the takeover this flow used to allow.
        return res.status(409).json({
          success: false,
          error:
            'An account already uses this email. Sign in with your password and connect GitHub from Settings.',
        });
      }

      user = await User.create({
        name: name || 'GitHub User',
        email: normalizedEmail,
        githubId,
        authProvider: 'github',
        avatarUrl,
        // GitHub did not give us this address, so it is unconfirmed until the
        // usual verification email is completed.
        isEmailVerified: false,
        password: null,
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user);
    const refreshToken = refreshResult.rawToken;
    setRefreshTokenCookie(res, refreshToken);
    res.cookie('token', accessToken, getAccessTokenCookieOptions());

    res.status(200).json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ---------------------------------------------------------------------------
// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
// ---------------------------------------------------------------------------
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.resetPasswordOtpHash) {
      return res.status(400).json({ success: false, error: 'Invalid email or code.' });
    }

    // Check expiration
    if (new Date() > user.resetPasswordOtpExpires) {
      return res.status(400).json({ success: false, error: 'Reset code has expired.' });
    }

    // Check attempts limit (max 5 incorrect attempts)
    if (user.resetPasswordAttempts >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    // Match OTP
    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtpHash);
    if (!isMatch) {
      user.resetPasswordAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        error: `Incorrect code. Remaining attempts: ${5 - user.resetPasswordAttempts}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Code verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Reset Password (OTP version)
// @route   POST /api/auth/reset-password
// @access  Public
// ---------------------------------------------------------------------------
exports.resetPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.resetPasswordOtpHash) {
      return res.status(400).json({ success: false, error: 'Invalid email or code.' });
    }

    // Check expiration
    if (new Date() > user.resetPasswordOtpExpires) {
      return res.status(400).json({ success: false, error: 'Reset code has expired.' });
    }

    // Check attempts limit
    if (user.resetPasswordAttempts >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    // Match OTP
    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtpHash);
    if (!isMatch) {
      user.resetPasswordAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        error: `Incorrect code. Remaining attempts: ${5 - user.resetPasswordAttempts}`,
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordAttempts = 0;
    // Invalidate all existing refresh tokens
    user.refreshTokens = [];

    // Generate new token family for fresh session
    const tokenFamily = generateTokenFamily();
    const accessToken = generateAccessToken(user.id);
    const refreshResult = await generateRefreshToken(user, tokenFamily);
    const refreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Google OAuth Passport Callback (Redirect flow)
// @route   GET /api/auth/google/callback
// @access  Public
// ---------------------------------------------------------------------------
exports.googlePassportCallback = async (req, res, next) => {
  try {
    const frontendBase = process.env.FRONTEND_URL || 'https://openprep-ai.vercel.app';
    if (!req.user) {
      return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?error=Google%20Authentication%20Failed`);
    }

    const accessToken = generateAccessToken(req.user.id);
    const refreshResult = await generateRefreshToken(req.user);
    const refreshToken = refreshResult.rawToken;

    setRefreshTokenCookie(res, refreshToken);

    return res.redirect(
      `${frontendBase.replace(/\/$/, '')}/login?token=${accessToken}&refreshToken=${refreshToken}`
    );
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/logout
// @access  Public
// ---------------------------------------------------------------------------
exports.logout = async (req, res, next) => {
  try {
    // Blacklist access token if present
    let token = req.cookies?.token || req.cookies?.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded) {
          const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');
          const exp = decoded.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 3600;
          const redisSentinelService = require('../services/redisSentinelService');
          await redisSentinelService.blacklistJwt(jti, exp);
        }
      } catch (decodeErr) {
        logger.warn('Failed to decode token for blacklisting on logout', { error: decodeErr.message });
      }
    }

    // Support both cookie and body for refresh token
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawToken) {
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Find user who has this hashed refresh token
      const user = await User.findOne({
        where: {
          refreshTokens: {
            [Op.contains]: [{ token: hashed }],
          },
        },
      });

      if (user) {
        // Remove the token from the user's refresh tokens array
        user.refreshTokens = user.refreshTokens.filter((t) => t.token !== hashed);
        await user.save();
      }
    }

    clearRefreshTokenCookie(res);
    res.clearCookie('token', getAccessTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Log out user from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out from all devices successfully"
 */
exports.logoutAll = async (req, res, next) => {
  try {
    // Blacklist access token if present
    let token = req.cookies?.token || req.cookies?.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded) {
          const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');
          const exp = decoded.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 3600;
          const redisSentinelService = require('../services/redisSentinelService');
          await redisSentinelService.blacklistJwt(jti, exp);
        }
      } catch (decodeErr) {
        logger.warn('Failed to decode token for blacklisting on logoutAll', { error: decodeErr.message });
      }
    }

    // Remove every refresh token belonging to the authenticated user.
    // This invalidates sessions on all devices immediately because the
    // refresh-token endpoint only accepts tokens stored in this array.
    req.user.refreshTokens = [];
    req.user.refreshTokenExpire = null;
    await req.user.save();

    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *     responses:
 *       200:
 *         description: Verification email request processed
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // To prevent user enumeration, always return 200 success response
    if (user && !user.isEmailVerified) {
      await sendVerificationEmail(user);
    }

    res.status(200).json({
      success: true,
      message: 'If an unverified account with that email exists, a verification link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   post:
 *     summary: Verify email address using verification token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token sent via email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification link
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    // Only the hash is stored, so hash the incoming token to look it up.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'This verification link is invalid or has expired. Request a new one.',
      });
    }

    // Idempotent by construction: the token is cleared here, so replaying the
    // same link finds no user and gets the message above rather than silently
    // re-verifying.
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
      data: {
        id: user.id,
        email: user.email,
        isEmailVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Keepalive session update - refreshes access token and extends session timestamp
// @route   POST /api/session/keepalive or POST /api/auth/session/keepalive
// @access  Private
exports.keepalive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const token = generateAccessToken(user.id);
    res.cookie('token', token, getAccessTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Session expiration extended successfully',
      token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
  } catch (error) {
    next(error);
  }
};

