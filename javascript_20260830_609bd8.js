const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateSet,
  getSet,
  getUserSets,
  updateResults,
  completeSet,
  getBenefit,
  getStats,
  deleteSet,
  getConfusablePairs,
} = require('../controllers/interleavedPracticeController');

// All routes require authentication
router.use(protect);

// Generation
router.post('/generate', generateSet);

// Set CRUD
router.get('/sets', getUserSets);
router.get('/:setId', getSet);
router.delete('/:setId', deleteSet);

// Results
router.post('/:setId/results', updateResults);
router.post('/:setId/complete', completeSet);

// Analytics
router.get('/benefit', getBenefit);
router.get('/stats', getStats);
router.get('/confusable-pairs', getConfusablePairs);

module.exports = router;