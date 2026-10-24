const express = require('express');
const {
  uploadAndAnalyzePYQ,
  getPYQs,
  searchPYQs,
  getPYQDetails,
  getPYQAnalysis,
  analyzePYQStream,
  deletePYQ,
  getPYQTrends,
  getUpcomingForecast,
  getPYQClusters,
  analyzePYQBatch,
  getSubjectAnalyses,
  exportPYQAnalysisPDF,
  getPYQMetadata,
  exportWorksheetPDF,
} = require('../controllers/pyqController');

const multer = require('multer');
const { protect } = require('../middleware/auth');
const { parsePyqPdf } = require('../controllers/pyqParserController');
const { strictAiLimiter } = require('../middleware/rateLimiter');
const { checkQuota } = require('../middleware/quotaMiddleware');
const upload = require('../middleware/upload');
const { validateUploadPYQ, validateGetPYQClusters } = require('../middleware/validators');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const clearCache = require('../middleware/clearCache');

const router = express.Router();

const parsePdfUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for large multi-page papers
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
});

router.post('/parse-pyq-pdf', protect, parsePdfUpload.single('pdf'), parsePyqPdf);

/**
 * @swagger
 * /api/pyqs/forecast:
 *   get:
 *     summary: Get AI predicted difficulty and topic trends forecast for upcoming exams
 *     tags: [PYQ Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject ID to generate forecast for
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force refresh AI prediction cache
 *     responses:
 *       200:
 *         description: Upcoming forecast generated successfully
 */
router.get('/forecast', protect, cacheMiddleware((req) => `openprep:cache:exam:${req.query.examId || req.query.subjectId || 'global'}:forecast:${req.originalUrl}`, 3600), getUpcomingForecast);

router.get('/trends', protect, cacheMiddleware((req) => `openprep:cache:exam:${req.query.examId || req.query.subjectId || 'global'}:trends:${req.originalUrl}`, 900), getPYQTrends);
/**
 * @swagger
 * tags:
 *   name: PYQs
 *   description: Previous Year Question papers upload and analysis
 */

/**
 * @swagger
 * /api/pyqs/upload:
 *   post:
 *     summary: Upload and analyze a PYQ paper
 *     tags: [PYQs]
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
 *               - subjectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *               year:
 *                 type: integer
 *                 minimum: 1900
 *                 maximum: 2100
 *                 example: 2023
 *     responses:
 *       201:
 *         description: PYQ uploaded and analyzed successfully
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
 *                     pyq:
 *                       $ref: '#/components/schemas/PYQ'
 *                     analysis:
 *                       $ref: '#/components/schemas/PYQAnalysis'
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
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post(
  '/upload',
  protect,
  strictAiLimiter,
  checkQuota,
  upload.single('file'),
  validateUploadPYQ,
  clearCache('pyqs:*'),
  clearCache((req) => `pyqs:${req.user.id}:/api/pyqs/metadata`),
  uploadAndAnalyzePYQ
);

/**
 * @swagger
 * /api/pyqs:
 *   get:
 *     summary: Get all PYQs for the authenticated user
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of PYQs
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
 *                     $ref: '#/components/schemas/PYQ'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/pyqs/search:
 *   get:
 *     summary: Full-text search for PYQ question papers and topics using tsvector/tsquery
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query terms
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Alternative query param for search terms
 *     responses:
 *       200:
 *         description: Ranked full-text search results
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/search',
  protect,
  cacheMiddleware((req) => `pyqs:${req.user.id}:${req.originalUrl}`),
  searchPYQs
);

router.get(
  '/',
  protect,
  cacheMiddleware((req) => `pyqs:${req.user.id}:${req.originalUrl}`),
  getPYQs
);

/**
 * @swagger
 * /api/pyqs/clusters/{subjectId}:
 *   get:
 *     summary: Detect near-duplicate PYQ questions across exam years via embedding similarity
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject ID to cluster PYQ questions for
 *     responses:
 *       200:
 *         description: Clustered duplicate question sets retrieved successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Subject not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/clusters/:subjectId',
  protect,
  strictAiLimiter,
  validateGetPYQClusters,
  getPYQClusters
);

/**
 * @swagger
 * /api/pyqs/{id}:
 *   get:
 *     summary: Get PYQ details
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: PYQ ID
 *     responses:
 *       200:
 *         description: PYQ details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PYQ'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: PYQ not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get(
  '/:id',
  protect,
  cacheMiddleware((req) => `pyqs:${req.user.id}:${req.originalUrl}`),
  getPYQDetails
);

/**
 * @swagger
 * /api/pyqs/{id}/analyze:
 *   post:
 *     summary: Analyze a PYQ paper
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: PYQ ID
 *     responses:
 *       200:
 *         description: PYQ analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PYQAnalysis'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: PYQ not found
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

router.post(
  '/:id/analyze',
  protect,
  strictAiLimiter,
  checkQuota,
  clearCache('pyqs:*'),
  clearCache((req) => `pyqs:${req.user.id}:/api/pyqs/metadata`),
  getPYQAnalysis
);

/**
 * @swagger
 * /api/pyqs/{id}/analyze-stream:
 *   get:
 *     summary: Stream Gemini PYQ analysis via Server-Sent Events (SSE)
 *     tags: [PYQ Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PYQ ID
 *     responses:
 *       200:
 *         description: SSE stream of analysis tokens
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/:id/analyze-stream', protect, analyzePYQStream);

/**
 * @swagger
 * /api/pyqs/{id}:
 *   delete:
 *     summary: Delete a PYQ
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: PYQ ID
 *     responses:
 *       200:
 *         description: PYQ deleted successfully
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
 *                       example: "PYQ deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: PYQ not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.delete('/:id', protect, clearCache('pyqs:*'), clearCache((req) => `pyqs:${req.user.id}:/api/pyqs/metadata`), deletePYQ);

router.post('/analyze', protect, upload.array('files', 10), analyzePYQBatch);
router.get('/subject/:subjectId', protect, getSubjectAnalyses);
router.get('/analysis/:analysisId/export', protect, exportPYQAnalysisPDF);
router.get('/export/worksheet/:id', protect, exportWorksheetPDF);

/**
 * @swagger
 * /api/pyqs/metadata:
 *   get:
 *     summary: Get aggregated PYQ metadata (statistics)
 *     tags: [PYQs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PYQ metadata retrieved successfully
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
 *                     totalPYQs:
 *                       type: integer
 *                       example: 25
 *                     analyzedCount:
 *                       type: integer
 *                       example: 20
 *                     uniqueSubjects:
 *                       type: integer
 *                       example: 5
 *                     yearRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: integer
 *                           example: 2020
 *                         max:
 *                           type: integer
 *                           example: 2024
 *                     difficultyDistribution:
 *                       type: object
 *                       properties:
 *                         Easy:
 *                           type: integer
 *                           example: 5
 *                         Medium:
 *                           type: integer
 *                           example: 15
 *                         Hard:
 *                           type: integer
 *                           example: 5
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/metadata',
  protect,
  cacheMiddleware(86400), // 24-hour TTL
  getPYQMetadata
);

module.exports = router;
