const crypto = require('crypto');
const { Op } = require('sequelize');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../services/emailService');

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

// Generate access token (15 min expiry)
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

// Generate refresh token (7 day expiry) — stores hashed version in DB
const generateRefreshToken = async (userId) => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const tokens = [...(user.refreshTokens || [])];
  tokens.push(hashed);
  user.refreshTokens = tokens;
  user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await user.save();

  return rawToken;
};

// ---------------------------------------------------------------------------
// Send verification email
// ---------------------------------------------------------------------------
const sendVerificationEmail = async (user, req) => {
  const verificationToken = user.generateToken('emailVerification');
  await user.save();

  const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Email Verification — OpenPrep AI',
    text: `Please verify your email by clicking the link: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

// ---------------------------------------------------------------------------
// Send password reset email
// ---------------------------------------------------------------------------
const sendPasswordResetEmail = async (user, req) => {
  const resetToken = user.generateToken('resetPassword');
  await user.save();

  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset — OpenPrep AI',
    text: `Reset your password by clicking the link: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`,
  });
};

// ---------------------------------------------------------------------------
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// ---------------------------------------------------------------------------
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role: 'student' });

    // Send verification email (logs to console if SMTP not configured)
    await sendVerificationEmail(user, req);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email to activate your account.',
      isEmailVerified: false,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Verify email
// @route   POST /api/auth/verify-email/:token
// @access  Public
// ---------------------------------------------------------------------------
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save();

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ---------------------------------------------------------------------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error:
          'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update daily streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(user.streakLastActive);
    lastActive.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.streakCount += 1;
    } else if (diffDays > 1) {
      user.streakCount = 1;
    }
    user.streakLastActive = new Date();
    await user.save();

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

// ---------------------------------------------------------------------------
// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
// ---------------------------------------------------------------------------
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

// ---------------------------------------------------------------------------
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
// ---------------------------------------------------------------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found with this email' });
    }

    await sendPasswordResetEmail(user, req);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email. It expires in 1 hour.',
    });
  } catch (error) {
    // If email sending failed, clear the token from DB
    const user = await User.findOne({ where: { email: req.body.email } });
    if (user) {
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;
      await user.save();
    }
    next(error);
  }
};

// ---------------------------------------------------------------------------
// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
// ---------------------------------------------------------------------------
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
    await user.save();

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

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
// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
// ---------------------------------------------------------------------------
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: rawToken } = req.body;
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find user who has this hashed refresh token
    const user = await User.findOne({
      where: {
        refreshTokens: {
          [Op.contains]: [hashed],
        },
        refreshTokenExpire: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Remove old token (rotation)
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hashed);

    // Generate new pair
    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = await generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};
