/**
 * @fileoverview API routes for Exam Readiness Analytics and Predictions.
 */
const express = require('express');
const { protect } = require('../middleware/auth');
const readinessController = require('../controllers/readinessController');

const router = express.Router();

// Existing Readiness Summary & Recalculation Routes
router.get('/summary', protect, readinessController.getSubjectReadiness);
router.post('/recalculate', protect, readinessController.recalculateReadiness);

// Keep root endpoint for backward compatibility with basic ReadinessWidget
router.get('/', protect, readinessController.getSubjectReadiness);

// New Readiness Analysis Route
/**
 * @route   GET /api/readiness/analysis
 * @desc    Get personalized exam readiness and confidence scoring analysis
 * @access  Private (Note: Currently unprotected in controller logic, but protected here for consistency)
 */
router.get('/analysis', protect, readinessController.getReadinessAnalysis);

module.exports = router;
