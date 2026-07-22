const rateLimit = require('express-rate-limit');

// Skip rate limiting in test environment
const shouldSkip = () => process.env.NODE_ENV === 'test';

/**
 * AI Endpoint Rate Limiter
 * Limits AI-powered requests to prevent abuse and control Gemini API costs.
 * - 10 requests per minute per IP
 * - Provides clear error message on exhaustion
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skip: shouldSkip,
  message: {
    success: false,
    error: 'Too many AI requests. Please wait a moment before generating more content.',
  },
  standardHeaders: true,
  legacyHeaders: true,
});

/**
 * Strict AI Endpoint Rate Limiter for upload+analyze endpoints
 * These endpoints do both file upload and AI analysis (more resource-intensive).
 * - 5 requests per minute per IP
 */
const strictAiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: shouldSkip,
  message: {
    success: false,
    error: 'Too many AI analysis requests. Please wait a moment before uploading more files.',
  },
  standardHeaders: true,
  legacyHeaders: true,
});

module.exports = { aiLimiter, strictAiLimiter };
