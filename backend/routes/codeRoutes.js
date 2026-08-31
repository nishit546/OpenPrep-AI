/**
 * @fileoverview Code routes — Issue #2200
 *
 * POST /api/code/execute — Sandboxed code execution with test-case evaluator (new)
 * POST /api/code/run     — Collaborative room execution (existing, now sandbox-backed)
 * POST /api/code/rooms   — Create collaborative room (unchanged)
 * GET  /api/code/rooms/:inviteCode — Get room (unchanged)
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  executeCode,
  runCode,
  createRoom,
  getRoom,
} = require('../controllers/codeSandboxController');
const { protect } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Dedicated rate limiter for code execution: max 10 requests per minute per user.
// This is separate from the generic aiLimiter to allow independent tuning.
const codeExecutionLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Code execution rate limit exceeded. Please wait 1 minute.' },
  skip: () => process.env.NODE_ENV === 'test',  // Skip in unit tests
});

/**
 * @route   POST /api/code/execute
 * @desc    Execute code in isolated Docker sandbox with test-case evaluation (#2200)
 * @access  Private (JWT required)
 */
router.post('/execute', protect, codeExecutionLimiter, executeCode);

/**
 * @route   POST /api/code/run
 * @desc    Run code in collaborative room context (existing, now Docker-backed)
 * @access  Private
 */
router.post('/run', protect, rateLimiter, runCode);

/**
 * @route   POST /api/code/rooms
 * @desc    Create collaborative coding room
 * @access  Private
 */
router.post('/rooms', protect, createRoom);

/**
 * @route   GET /api/code/rooms/:inviteCode
 * @desc    Get code room by invite code
 * @access  Private
 */
router.get('/rooms/:inviteCode', protect, getRoom);

module.exports = router;
