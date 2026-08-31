const express = require('express');
const {
  generateAIFlashcards,
  generateFlashcardsFromNote,
  generateFlashcardsFromText,
  generateFlashcardsFromAudio,
  generateFlashcardsFromYouTube,
  autoTagFlashcard,  
  createFlashcard,
  getFlashcards,
  reviewFlashcard,
  deleteFlashcard,
  exportFlashcards,
  importFlashcards,
  getReviewForecast,
  shareFlashcardDeck,
  getCommunityDecks,
  cloneCommunityDeck,
  rateCommunityDeck,
  starCommunityDeck,
  batchSyncOfflineReviews,
  generateClozeFlashcards,
  generateDeckPodcast,
  getPodcastEpisodeById,
} = require('../controllers/flashcardController');
const {
  getLeitnerDistribution,
  getDueForecast,
} = require('../controllers/flashcardAnalyticsController');
const { protect } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { checkQuota } = require('../middleware/quotaMiddleware');
const flashcardUpload = require('../middleware/flashcardUpload');
const audioFlashcardUpload = require('../middleware/audioFlashcardUpload');
const {
validateGenerateAIFlashcards,
  validateGenerateFlashcardsFromNote,
  validateGenerateFlashcardsFromYouTube,  validateAutoTagFlashcard,
  validateCreateFlashcard,
  validateReviewFlashcard,
  validateExportFlashcards,
  validateImportFlashcards,
} = require('../middleware/validators');const router = express.Router();

// Spaced Repetition Analytics Routes
router.get('/analytics/leitner-distribution', protect, getLeitnerDistribution);
router.get('/analytics/due-forecast', protect, getDueForecast);


/**
 * @swagger
 * tags:
 *   name: Flashcards
 *   description: Flashcard generation, CRUD, and review
 */

/**
 * @swagger
 * /api/flashcards/generate-ai:
 *   post:
 *     summary: Generate AI-powered flashcards
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *             properties:
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               topicId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *                 example: 20
 *     responses:
 *       201:
 *         description: Flashcards generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
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
 *         description: Subject or topic not found
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
 */

// Static routes first (must come before /:id to avoid route shadowing)
router.post(
  '/generate-ai',
  protect,
  aiLimiter,
  checkQuota,
  validateGenerateAIFlashcards,
  generateAIFlashcards
);

router.post(
  '/generate-cloze',
  protect,
  aiLimiter,
  checkQuota,
  generateClozeFlashcards
);

/**
 * @swagger
 * /api/flashcards/generate-from-note:
 *   post:
 *     summary: Generate AI flashcard preview directly from note text content
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteId
 *             properties:
 *               noteId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 5
 *                 example: 5
 *     responses:
 *       200:
 *         description: Flashcards generated successfully (preview mode, not saved)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       front:
 *                         type: string
 *                         example: "What is a derivative?"
 *                       back:
 *                         type: string
 *                         example: "Rate of change of a function"
 *       400:
 *         description: Validation error or empty note content
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
 *         description: Note not found
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
 *         description: AI service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/generate-from-note',
  protect,
  aiLimiter,
  checkQuota,
  validateGenerateFlashcardsFromNote,
  generateFlashcardsFromNote
);

/**
 * @swagger
 * /api/flashcards/generate-from-text:
 *   post:
 *     summary: Generate AI flashcard preview directly from text content
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *               - text
 *             properties:
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               text:
 *                 type: string
 *                 example: "The mitochondria is the powerhouse of the cell."
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 6
 *                 example: 6
 *     responses:
 *       200:
 *         description: Flashcards generated successfully (preview mode, not saved)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 6
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       front:
 *                         type: string
 *                         example: "What is the mitochondria?"
 *                       back:
 *                         type: string
 *                         example: "The powerhouse of the cell"
 *       400:
 *         description: Validation error or empty text content
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
 *         description: AI service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/generate-from-text',
  protect,
  aiLimiter,
  checkQuota,
  generateFlashcardsFromText
);

/**
 * @swagger
 * /api/flashcards/from-youtube:
 *   post:
 *     summary: Extract a YouTube video transcript and preview AI-generated flashcards
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - youtubeUrl
 *             properties:
 *               youtubeUrl:
 *                 type: string
 *                 example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               topicId:
 *                 type: string
 *                 format: uuid
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 6
 *     responses:
 *       200:
 *         description: Flashcards generated successfully (preview mode, not saved)
 *       400:
 *         description: Invalid or missing YouTube URL
 *       422:
 *         description: Transcript unavailable or video not educational
 *       429:
 *         description: Rate limit exceeded
 *       503:
 *         description: AI service unavailable
 */
/**
 * @swagger
 * /api/flashcards/from-audio:
 *   post:
 *     summary: Transcribe an audio lecture and generate preview flashcards
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/from-audio',
  protect,
  aiLimiter,
  checkQuota,
  audioFlashcardUpload.single('audio'),
  generateFlashcardsFromAudio
);
router.post(
  '/from-youtube',
  protect,
  aiLimiter,
  checkQuota,
  validateGenerateFlashcardsFromYouTube,
  generateFlashcardsFromYouTube
);
router.post(
  '/generate-from-youtube',
  protect,
  aiLimiter,
  checkQuota,
  validateGenerateFlashcardsFromYouTube,
  generateFlashcardsFromYouTube
);
const { saveYoutubeDeck } = require('../controllers/youtubeFlashcardController');
router.post(
  '/save-youtube-deck',
  protect,
  saveYoutubeDeck
);

/**
 * @swagger
 * /api/flashcards/export:
 *   get:
 *     summary: Export flashcards as JSON
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subject
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by topic
 *     responses:
 *       200:
 *         description: Flashcards exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
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
 */

router.get('/export', protect, validateExportFlashcards, exportFlashcards);

/**
 * @swagger
 * /api/flashcards/import:
 *   post:
 *     summary: Import flashcards from JSON file
 *     tags: [Flashcards]
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
 *     responses:
 *       201:
 *         description: Flashcards imported successfully
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
 *                     imported:
 *                       type: integer
 *                       example: 25
 *       400:
 *         description: Validation error or invalid file format
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
 */

router.post(
  '/import',
  protect,
  flashcardUpload.single('file'),
  validateImportFlashcards,
  importFlashcards
);

/**
 * @swagger
 * /api/flashcards/forecast:
 *   get:
 *     summary: Retrieve scheduled card review counts aggregated over next 30 days
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 30-day review workload forecast retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2026-08-05"
 *                       count:
 *                         type: integer
 *                         example: 12
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/forecast', protect, getReviewForecast);

/**
 * @swagger
 * /api/flashcards:
 *   post:
 *     summary: Create a new flashcard
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *               - subject
 *             properties:
 *               front:
 *                 type: string
 *                 example: "What is the capital of France?"
 *               back:
 *                 type: string
 *                 example: "Paris"
 *               subject:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               topic:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *     responses:
 *       201:
 *         description: Flashcard created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Flashcard'
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
 *         description: Subject or topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Collection routes
router.post('/', protect, validateCreateFlashcard, createFlashcard);

/**
 * @swagger
 * /api/flashcards:
 *   get:
 *     summary: Get all flashcards for the authenticated user
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subject
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by topic
 *     responses:
 *       200:
 *         description: List of flashcards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/', protect, cacheMiddleware(900), getFlashcards);

/**
 * @swagger
 * /api/flashcards/{id}/review:
 *   put:
 *     summary: Review a flashcard (update spaced repetition data)
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Flashcard ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quality
 *             properties:
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 4
 *                 description: "Recall quality (0-5): 0=complete blackout, 5=perfect recall"
 *     responses:
 *       200:
 *         description: Flashcard reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Flashcard'
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
 *         description: Flashcard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Parameterised routes
router.put('/:id/review', protect, validateReviewFlashcard, reviewFlashcard);

/**
 * @swagger
 * /api/flashcards/{id}:
 *   delete:
 *     summary: Delete a flashcard
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Flashcard ID
 *     responses:
 *       200:
 *         description: Flashcard deleted successfully
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
 *                       example: "Flashcard deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Flashcard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/flashcards/community:
 *   get:
 *     summary: Get all community published public flashcard decks
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for name, description, or tags
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject category name
 *       - in: query
 *         name: exam
 *         schema:
 *           type: string
 *         description: Filter by exam name
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by minimum rating
 *     responses:
 *       200:
 *         description: Public flashcard decks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/community', protect, getCommunityDecks);

/**
 * @swagger
 * /api/flashcards/decks/{subjectId}/share:
 *   put:
 *     summary: Publish or unpublish a flashcard deck to the community marketplace
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject/Deck ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPublic
 *             properties:
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Share state toggled successfully
 */
router.put('/decks/:subjectId/share', protect, shareFlashcardDeck);

/**
 * @swagger
 * /api/flashcards/decks/{subjectId}/clone:
 *   post:
 *     summary: Clone a community flashcard deck to user's library
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject/Deck ID to clone
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional exam ID to clone the deck under
 *     responses:
 *       201:
 *         description: Deck cloned successfully
 */
router.post('/decks/:subjectId/clone', protect, cloneCommunityDeck);
router.post('/decks/:subjectId/rate', protect, rateCommunityDeck);
router.post('/decks/:subjectId/star', protect, starCommunityDeck);
router.post('/batch-sync', protect, batchSyncOfflineReviews);
router.post('/sync-batch', protect, batchSyncOfflineReviews);
router.get('/podcasts/:id', protect, getPodcastEpisodeById);
router.post('/:deckId/generate-podcast', protect, generateDeckPodcast);

router.delete('/:id', protect, deleteFlashcard);

module.exports = router;
