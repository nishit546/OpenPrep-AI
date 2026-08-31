/**
 * @fileoverview API routes for Interactive Code Snippet Explainer and Debugger.
 */
const express = require('express');
const router = express.Router();
const codeDebuggerController = require('../controllers/codeDebuggerController');

/**
 * @route   POST /api/code-debugger/analyze
 * @desc    Analyze a code snippet for line-by-line explanations, bugs, and optimizations
 * @access  Private
 */
router.post('/analyze', codeDebuggerController.analyzeCode);

module.exports = router;
