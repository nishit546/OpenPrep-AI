const express = require('express');
const { uploadAndAnalyzePYQ, getPYQs, getPYQDetails, deletePYQ } = require('../controllers/pyqController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateUploadPYQ } = require('../middleware/validators');

const router = express.Router();

router.post('/upload', protect, validateUploadPYQ, upload.single('file'), uploadAndAnalyzePYQ);
router.get('/', protect, getPYQs);
router.get('/:id', protect, getPYQDetails);
router.delete('/:id', protect, deletePYQ);

module.exports = router;
