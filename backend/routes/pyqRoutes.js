const express = require('express');
const { uploadAndAnalyzePYQ, getPYQs, getPYQDetails, getPYQAnalysis, deletePYQ } = require('../controllers/pyqController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateUploadPYQ } = require('../middleware/validators');

const router = express.Router();

router.post('/upload', protect, upload.single('file'), validateUploadPYQ, uploadAndAnalyzePYQ);
router.get('/', protect, getPYQs);
router.get('/:id', protect, getPYQDetails);
router.post('/:id/analyze', protect, getPYQAnalysis);
router.delete('/:id', protect, deletePYQ);

module.exports = router;
