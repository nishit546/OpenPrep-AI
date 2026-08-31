const express = require('express');
const {
  uploadNote,
  getNotes,
  downloadNote,
  deleteNote,
  summarizeNote,
  uploadVoiceNote,
  updateNote,
  uploadOcrNote,
  exportNotes,
  verifyNotePdfSignature,
  importNotes,
  shareCollaboration,
  getNote,
  getNotesGraph,
  syncNotes,
} = require('../controllers/noteController');
const { transcribeAndSummarize } = require('../controllers/audioNoteController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadMarkdown } = require('../middleware/upload');
const audioNoteUpload = require('../middleware/audioNoteUpload');
const { validateUploadNote, validateImportNotes } = require('../middleware/validators');
const cacheMiddleware = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');
const { aiLimiter } = require('../middleware/rateLimiter');
const { checkAiQuota } = require('../middleware/aiQuotaMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Note upload, retrieval, and summarization
 */

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Upload a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - subjectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "My Lecture Notes"
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               content:
 *                 type: string
 *                 example: "Optional text content"
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *     responses:
 *       201:
 *         description: Note uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Note'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Subject not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post(
  '/',
  protect,
  upload.single('file'),
  validateUploadNote,
  clearCache('notes:*'),
  uploadNote
);

/**
 * @swagger
 * /api/notes/ocr-upload:
 *   post:
 *     summary: Upload an image for OCR text extraction
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (.png, .jpg, .jpeg, .webp)
 *     responses:
 *       200:
 *         description: Text extracted successfully
 *       400:
 *         description: Validation error or unsupported format
 */
router.post(
  '/ocr-upload',
  protect,
  upload.single('file'),
  uploadOcrNote
);

/**
 * @swagger
 * /api/notes/voice:
 *   post:
 *     summary: Upload and process voice note audio file with AI transcription & summary
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - subjectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (.mp3, .wav, .m4a, etc.)
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Physics Lecture Audio Recording"
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               topicId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *     responses:
 *       201:
 *         description: Voice note processed and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Note'
 *       400:
 *         description: Missing file or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Subject not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: AI transcription service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/voice',
  protect,
  audioNoteUpload.single('file'),
  validateUploadNote,
  clearCache('notes:*'),
  uploadVoiceNote
);

router.post(
  '/transcribe-and-summarize',
  protect,
  aiLimiter,
  checkAiQuota,
  upload.single('file'),
  transcribeAndSummarize
);

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes for the authenticated user (with filtering, search, pagination)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subject ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['Lecture Notes', 'Study Guide', 'Cheat Sheet', 'Summary', 'Other']
 *         description: Filter by note category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword in title or content
 *       - in: query
 *         name: publicOnly
 *         schema:
 *           type: boolean
 *         description: Retrieve public community notes only
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of notes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get(
  '/',
  protect,
  cacheMiddleware((req) => `notes:${req.user.id}:${req.originalUrl}`),
  getNotes
);

router.get('/export', protect, exportNotes);
router.post('/verify-signature', verifyNotePdfSignature);

router.post(
  '/import',
  protect,
  uploadMarkdown.array('files', 20),
  validateImportNotes,
  clearCache('notes:*'),
  importNotes
);
/**
 * @swagger
 * /api/notes/{id}/download:
 *   put:
 *     summary: Download a note file
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Note ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to access this file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.put('/:id/download', protect, downloadNote); // downloading doesn't change state

/**
 * @swagger
 * /api/notes/{id}/summarize:
 *   post:
 *     summary: Generate AI summary of a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note summarized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: string
 *                       example: "This note covers the fundamentals of calculus..."
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post('/:id/summarize', protect, aiLimiter, checkAiQuota, summarizeNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Note deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update an existing note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
router.get('/graph', protect, getNotesGraph);
router.post('/sync', protect, clearCache('notes:*'), syncNotes);

router.get('/:id', protect, getNote);

router.put('/:id', protect, clearCache('notes:*'), updateNote);

router.post('/:id/share', protect, clearCache('notes:*'), shareCollaboration);

router.delete('/:id', protect, clearCache('notes:*'), deleteNote);

module.exports = router;
