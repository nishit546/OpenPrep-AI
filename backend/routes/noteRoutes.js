const express = require('express');
const { uploadNote, getNotes, downloadNote, deleteNote } = require('../controllers/noteController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateUploadNote } = require('../middleware/validators');

const cacheMiddleware = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');

const router = express.Router();

router.post('/', protect, upload.single('file'), validateUploadNote, clearCache('notes:*'), uploadNote);
router.get('/', protect, cacheMiddleware(req => `notes:${req.user.id}:${req.originalUrl}`), getNotes);
router.put('/:id/download', protect, downloadNote); // downloading doesn't change state
router.delete('/:id', protect, clearCache('notes:*'), deleteNote);

module.exports = router;
