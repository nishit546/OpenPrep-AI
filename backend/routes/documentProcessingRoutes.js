const express = require('express');
const router = express.Router();
const documentProcessingController = require('../controllers/documentProcessingController');
const auth = require('../middleware/auth');

// Get pipeline status for a document
router.get('/:documentId/status', auth, documentProcessingController.getPipelineStatus);

// Get processing history
router.get('/:documentId/history', auth, documentProcessingController.getProcessingHistory);

// Retry a failed stage
router.post('/:documentId/stages/:stageName/retry', auth, documentProcessingController.retryFailedStage);

// Restart entire pipeline
router.post('/:documentId/restart', auth, documentProcessingController.restartPipeline);

module.exports = router;