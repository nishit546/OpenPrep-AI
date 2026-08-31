const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createAttempt,
  analyze,
  getConceptAttempts,
  getBestAttempt,
  getProgress,
  getUserConcepts,
  getStats,
  addAIEnrichment,
  deleteAttempt,
  extractKeyPoints,
} = require('../controllers/explainBackController');

// All routes require authentication
router.use(protect);

// Analysis routes
router.post('/analyze', analyze);
router.post('/extract-points', extractKeyPoints);

// Attempt routes
router.post('/attempt', createAttempt);
router.delete('/:attemptId', deleteAttempt);
router.post('/:attemptId/enrich', addAIEnrichment);

// Concept routes
router.get('/concept/:conceptId', getConceptAttempts);
router.get('/concept/:conceptId/best', getBestAttempt);
router.get('/concept/:conceptId/progress', getProgress);

// User routes
router.get('/concepts', getUserConcepts);
router.get('/stats', getStats);

module.exports = router;