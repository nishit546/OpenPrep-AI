/**
 * @fileoverview API routes for the Oral Viva Simulator.
 */
const express = require('express');
const { protect } = require('../middleware/auth');
const { startSession, respondSession, evaluateSession } = require('../controllers/vivaController');

const router = express.Router();

/**
 * @route   POST /api/viva/start
 * @desc    Initialize a new viva session with an AI-generated question
 * @access  Private
 */
router.post('/start', protect, startSession);

/**
 * @route   POST /api/viva/respond
 * @desc    Submit a user's answer for AI evaluation and get the next question
 * @access  Private
 */
router.post('/respond', protect, respondSession);

/**
 * @route   POST /api/viva/evaluate
 * @desc    Evaluate the entire viva session and generate a final scorecard
 * @access  Private
 */
router.post('/evaluate', protect, evaluateSession);
router.post('/finish', protect, evaluateSession);

module.exports = router;
