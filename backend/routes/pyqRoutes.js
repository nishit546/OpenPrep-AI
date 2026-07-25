const express = require('express');
const { uploadAndAnalyzePYQ, getPYQs, getPYQDetails, getPYQAnalysis, deletePYQ } = require('../controllers/pyqController');
const { protect } = require('../middleware/auth');
const { strictAiLimiter } = require('../middleware/rateLimiter');
const { checkQuota } = require('../middleware/quotaMiddleware');
const upload = require('../middleware/upload');
const { validateUploadPYQ } = require('../middleware/validators');

const cacheMiddleware = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');

const router = express.Router();

router.post('/upload', protect, strictAiLimiter, checkQuota, upload.single('file'), validateUploadPYQ, clearCache('pyqs:*'), uploadAndAnalyzePYQ);
router.get('/', protect, cacheMiddleware(req => `pyqs:${req.user.id}:${req.originalUrl}`), getPYQs);
router.get('/:id', protect, cacheMiddleware(req => `pyqs:${req.user.id}:${req.originalUrl}`), getPYQDetails);
router.post('/:id/analyze', protect, strictAiLimiter, checkQuota, clearCache('pyqs:*'), getPYQAnalysis);
router.delete('/:id', protect, clearCache('pyqs:*'), deletePYQ);

module.exports = router;
