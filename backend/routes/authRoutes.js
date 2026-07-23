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

// Skip rate limiting in the test environment
const shouldSkip = () => process.env.NODE_ENV === 'test';

// Shared helper for consistent rate limit responses
const createRateLimitResponse = (errorMessage) => ({
  success: false,
  error: errorMessage,
});

// Login rate limiter: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMIT.MAX_REQUESTS.LOGIN,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many login attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Limit registration attempts to 5 requests per 15 minutes per IP
const registerLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMIT.MAX_REQUESTS.REGISTER,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many registration attempts. Please try again after 15 minutes.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Limit password reset requests to 5 per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOWS.ONE_HOUR,
  max: RATE_LIMIT.MAX_REQUESTS.FORGOT_PASSWORD,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many password reset requests. Please try again after an hour.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

// Limit refresh token requests to 10 per 15 minutes per IP
const refreshTokenLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMIT.MAX_REQUESTS.REFRESH_TOKEN,
  skip: shouldSkip,
  message: createRateLimitResponse(
    'Too many refresh requests. Please try again later.'
  ),
  standardHeaders: true,
  legacyHeaders: true,
});

/* -------------------------------------------------------------------------- */
/*                         Public Authentication Routes                       */
/* -------------------------------------------------------------------------- */

// Register a new user account
router.post('/register', registerLimiter, validateRegister, register);

// Authenticate a user and issue access/refresh tokens
router.post('/login', loginLimiter, validateLogin, login);

// Request a password reset email
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateForgotPassword,
  forgotPassword
);

// Reset password using a valid reset token
router.post('/reset-password/:token', validateResetPassword, resetPassword);

// Verify a user's email address using the verification token
router.post('/verify-email/:token', verifyEmail);

// Refresh an expired access token
router.post(
  '/refresh-token',
  refreshTokenLimiter,
  validateRefreshToken,
  refreshToken
);

// Log out the current user
router.post('/logout', logout);

/* -------------------------------------------------------------------------- */
/*                        Protected Authentication Routes                     */
/* -------------------------------------------------------------------------- */

// Retrieve the authenticated user's profile
// Requires authentication
router.get('/me', protect, getMe);

module.exports = router;