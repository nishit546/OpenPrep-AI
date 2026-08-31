/**
 * @fileoverview API routes for proctored mock exam simulator sessions.
 */
const express = require('express');
const router = express.Router();
const mockExamController = require('../controllers/mockExamController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/mock-exams/:id/start
 * @desc    Start secure proctored mock exam session
 * @access  Private
 */
router.post('/mock-exams/:id/start', protect, mockExamController.startMockExam);

/**
 * @route   POST /api/mock-exams/:sessionId/heartbeat
 * @desc    Periodic sync heartbeat for current state updates
 * @access  Private
 */
router.post('/mock-exams/:sessionId/heartbeat', protect, mockExamController.submitHeartbeat);

/**
 * @route   POST /api/mock-exams/:sessionId/submit
 * @desc    Submit, grade mock attempt, and retrieve scorecard
 * @access  Private
 */
router.post('/mock-exams/:sessionId/submit', protect, mockExamController.submitMockExam);

module.exports = router;
