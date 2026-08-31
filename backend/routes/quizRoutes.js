const express = require('express');
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 15 * 1024 * 1024 }
});
const { getEnhancedExplanation } = require('../controllers/solutionExplainerController');

const {
  generateAIQuiz,
  getQuizzes,
  getQuizDetails,
  submitQuizAttempt,
  getAttemptHistory,
  generateRevisionSheet,
  generateRemediationPlan,
  getCalibrationReport,
  submitTelemetryBatch,
  getQuizBookmarks,
  toggleQuizBookmark,
  getQuizAttemptReportPDF,
  generateCustomQuiz,
  evaluateSubjectiveAnswer,
  generateRemediationQuiz,
  getNextAdaptiveQuestionEndpoint,
  evaluateDistractors,
  generateDistractors,
} = require('../controllers/quizController');
const { generateQuizFromPdf } = require('../controllers/pdfQuizController');
const { protect } = require('../middleware/auth');
const telemetryAuth = require('../middleware/telemetryAuth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { aiSanitizer } = require('../middleware/aiSanitizer');
const { checkAiQuota } = require('../middleware/aiQuotaMiddleware');
const {
  validateGenerateAIQuiz,
  validateEvaluateSubjective,
  validateSubmitQuizAttempt,
  validateGenerateRevisionSheet,
  validateGenerateRemediationPlan,
  validateGenerateRemediationQuiz,
} = require('../middleware/validators');
const { validateRequest, submitQuizSchema } = require('../middleware/validate');
const checkOwnership = require('../middleware/checkOwnership');

const router = express.Router();
const { getNextAdaptiveQuestion } = require('../controllers/adaptiveQuizController');

// Register solution explainer route
router.get('/questions/:questionId/explanation', protect, aiLimiter, checkAiQuota, getEnhancedExplanation);

// Register distractor quality evaluation & auto-enhancer route
router.post('/evaluate-distractors', protect, aiLimiter, checkAiQuota, evaluateDistractors);
router.post('/generate-distractors', protect, aiLimiter, checkAiQuota, aiSanitizer, generateDistractors);

// Register adaptive routes
router.get('/next', getNextAdaptiveQuestionEndpoint);
router.get('/adaptive/next', getNextAdaptiveQuestionEndpoint);
router.post('/adaptive/next-question', protect, aiLimiter, checkAiQuota, getNextAdaptiveQuestion);

/**
 * @swagger
 * /api/quizzes/evaluate-subjective:
 *   post:
 *     summary: Evaluate student's written response for a subjective question against a rubric using Gemini 1.5 API
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userAnswerText
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: uuid
 *               quizId:
 *                 type: string
 *                 format: uuid
 *               userAnswerText:
 *                 type: string
 *                 example: "The core principle of this algorithm..."
 *     responses:
 *       200:
 *         description: Subjective answer evaluation completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/evaluate-subjective', protect, aiLimiter, checkAiQuota, validateEvaluateSubjective, evaluateSubjectiveAnswer);
/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz generation, retrieval, and attempt submission
 */

/**
 * @swagger
 * /api/quizzes/generate-ai:
 *   post:
 *     summary: Generate an AI-powered quiz
 *     tags: [Quizzes]
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
 *                 default: 5
 *                 example: 10
 *     responses:
 *       201:
 *         description: Quiz generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quiz'
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

router.post('/generate-ai', protect, aiLimiter, checkAiQuota, aiSanitizer, validateGenerateAIQuiz, generateAIQuiz);
router.post('/generate-custom', protect, aiLimiter, checkAiQuota, aiSanitizer, generateCustomQuiz);

/**
 * @swagger
 * /api/quizzes/generate-remediation:
 *   post:
 *     summary: Generate a targeted AI diagnostic quiz from forgotten flashcards
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deckId
 *               - failedCardIds
 *             properties:
 *               deckId:
 *                 type: string
 *                 format: uuid
 *                 description: Subject/deck ID the failed cards belong to
 *               failedCardIds:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: string
 *                   format: uuid
 *               count:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 10
 *                 default: 5
 *     responses:
 *       201:
 *         description: Remediation quiz generated successfully
 *       400:
 *         description: Fewer than 2 failed cards provided
 *       404:
 *         description: Deck not found or access denied
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/generate-remediation', protect, aiLimiter, checkAiQuota, validateGenerateRemediationQuiz, generateRemediationQuiz);

/**
 * @swagger
 * /api/quizzes/generate-from-pdf:
 *   post:
 *     summary: Generate a practice quiz from an uploaded textbook PDF chapter
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - pdf
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: Textbook chapter PDF file (max 15MB)
 *     responses:
 *       200:
 *         description: Quiz generated successfully from PDF content
 *       400:
 *         description: Invalid file or missing PDF
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/generate-from-pdf', protect, aiLimiter, checkAiQuota, upload.single('pdf'), generateQuizFromPdf);

/**
 * @swagger
 * /api/quiz/telemetry/batch:
 *   post:
 *     summary: Submit a batch of buffered quiz telemetry events (question views, option selections, flag toggles)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Telemetry batch accepted
 *       400:
 *         description: Missing or invalid events array
 *       401:
 *         description: Not authenticated
 */
router.post('/telemetry/batch', telemetryAuth, submitTelemetryBatch);
router.get('/admin/calibration-report', protect, getCalibrationReport);

/**
 * @swagger
 * /api/quizzes/generate-revision-sheet:
 *   post:
 *     summary: Generate AI Revision Sheet for weak concepts from quiz history
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizAttemptId:
 *                 type: string
 *                 format: uuid
 *               mistookQuestions:
 *                 type: array
 *               saveToNotes:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Revision sheet generated successfully
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/generate-revision-sheet',
  protect,
  aiLimiter,
  checkAiQuota,
  validateGenerateRevisionSheet,
  generateRevisionSheet
);

/**
 * @swagger
 * /api/quizzes/generate-remediation-plan:
 *   post:
 *     summary: Generate a 3-day AI remediation plan for weak concepts from failed quiz questions
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizAttemptId:
 *                 type: string
 *                 format: uuid
 *               mistookQuestions:
 *                 type: array
 *               weakTopics:
 *                 type: array
 *                 items:
 *                   type: string
 *               saveToNotes:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Remediation plan generated successfully
 *       400:
 *         description: No failed questions found
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/generate-remediation-plan',
  protect,
  aiLimiter,
  checkAiQuota,
  validateGenerateRemediationPlan,
  generateRemediationPlan
);

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get all quizzes for the authenticated user
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter quizzes by subject
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: List of quizzes
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
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quiz'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/', protect, getQuizzes);

/**
 * @swagger
 * /api/quizzes/attempts/history:
 *   get:
 *     summary: Get quiz attempt history for the authenticated user
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: List of quiz attempts
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
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QuizAttempt'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/attempts/history', protect, getAttemptHistory);
router.get('/attempts/:attemptId/pdf', protect, getQuizAttemptReportPDF);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get quiz details including questions
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quiz'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/:id', protect, checkOwnership('Quiz'), getQuizDetails);

/**
 * @swagger
 * /api/quizzes/{id}/submit:
 *   post:
 *     summary: Submit a quiz attempt
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - selectedAnswer
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       format: uuid
 *                     selectedAnswer:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 3
 *               timeSpent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 86400
 *                 description: Time spent in seconds (optional)
 *               submissionId:
 *                 type: string
 *                 format: uuid
 *                 description: Unique client-generated idempotency key for this submission (optional)
 *     responses:
 *       201:
 *         description: Quiz attempt submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QuizAttempt'
 *       200:
 *         description: Duplicate submission detected — returns the original attempt without creating a new one
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 duplicate:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QuizAttempt'
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
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post('/:id/submit', protect, validateRequest(submitQuizSchema), submitQuizAttempt);

/**
 * @swagger
 * /api/quizzes/{id}/bookmarks:
 *   get:
 *     summary: Get the current user's bookmarked question IDs for a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookmarked question IDs
 *       404:
 *         description: Quiz not found
 */
router.get('/:id/bookmarks', protect, checkOwnership('Quiz'), getQuizBookmarks);

/**
 * @swagger
 * /api/quizzes/{id}/bookmarks/toggle:
 *   post:
 *     summary: Toggle bookmark on a single quiz question
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookmark removed
 *       201:
 *         description: Bookmark added
 *       400:
 *         description: Question not found in this quiz
 *       404:
 *         description: Quiz not found
 */
router.post('/:id/bookmarks/toggle', protect, checkOwnership('Quiz'), toggleQuizBookmark);

const { getOmrSheetPdf, getAnswerKeyPdf } = require('../controllers/omrController');
router.get('/:id/omr-sheet.pdf', getOmrSheetPdf);
router.get('/:id/answer-key.pdf', getAnswerKeyPdf);

module.exports = router;

