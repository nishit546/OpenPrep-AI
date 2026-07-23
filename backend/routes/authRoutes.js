const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  forgotPassword,
  verifyEmail,
  resetPassword,
  refreshToken,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
} = require('../middleware/validators');

const router = express.Router();

// Skip rate limiting in test environment
const shouldSkip = () => process.env.NODE_ENV === 'test';

// Shared helper for consistent rate limit responses
const createRateLimitResponse = (errorMessage) => ({
  success: false,
  error: errorMessage,
});

// Login rate limiter: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many login attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Register rate limiter: 5 attempts per 15 minutes per IP
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many registration attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Forgot password rate limiter: 5 attempts per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many password reset requests. Please try again after an hour.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Refresh token rate limiter: 10 attempts per 15 minutes per IP
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many refresh requests. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);
router.post('/verify-email/:token', verifyEmail);
router.post('/refresh-token', refreshTokenLimiter, validateRefreshToken, refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;