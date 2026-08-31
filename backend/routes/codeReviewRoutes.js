/**
 * @fileoverview API routes for Real-Time Collaborative Code Review.
 */
const express = require('express');
const router = express.Router();
const codeReviewController = require('../controllers/codeReviewController');

/**
 * @route   POST /api/code-reviews
 * @desc    Create a new code review request
 * @access  Private
 */
router.post('/', codeReviewController.createReview);

/**
 * @route   GET /api/code-reviews/:id
 * @desc    Fetch a specific code review by ID
 * @access  Private
 */
router.get('/:id', codeReviewController.getReview);

/**
 * @route   POST /api/code-reviews/:id/ai-review
 * @desc    Request an automated AI review of the code
 * @access  Private
 */
router.post('/:id/ai-review', codeReviewController.requestAiReview);

module.exports = router;
