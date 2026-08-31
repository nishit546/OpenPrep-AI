/**
 * @fileoverview API routes for Accessibility and Readability Enhancer.
 */
const express = require('express');
const router = express.Router();
const accessibilityController = require('../controllers/accessibilityController');

/**
 * @route   POST /api/accessibility/enhance
 * @desc    Process text and return simplified version, glossary, and audio script
 * @access  Private
 */
router.post('/enhance', accessibilityController.enhanceText);

module.exports = router;
