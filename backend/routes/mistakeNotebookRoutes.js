const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMistakeEntries,
  getMistakeAnalytics,
  classifyMistake,
  generateRedoDrill,
  submitRedoAttempt,
} = require('../controllers/mistakeNotebookController');

// All routes require authentication
router.use(protect);

router.get('/entries', getMistakeEntries);
router.get('/analytics', getMistakeAnalytics);
router.patch('/entries/:id/classify', classifyMistake);
router.post('/redo-drill/generate', generateRedoDrill);
router.post('/entries/:id/redo', submitRedoAttempt);

module.exports = router;
