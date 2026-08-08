const express = require('express');
const {
  createExam,
  getExams,
  deleteExam,
  createSubject,
  getSubjects,
  deleteSubject,
  createTopic,
  getTopics,
  updateTopic,
  deleteTopic,
  createCompositeBundle,
  updateSubjectWeightages,
  importSyllabus,
} = require('../controllers/academicController');
const { protect } = require('../middleware/auth');
const { checkQuota } = require('../middleware/quotaMiddleware');
const {
  validateCreateExam,
  validateCreateSubject,
  validateCreateTopic,
  validateUpdateTopic,
} = require('../middleware/validators');

const cacheMiddleware = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');
const upload = require('../middleware/upload');

const aiLimiter = require('../middleware/rateLimiter').aiLimiter || require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Academic
 *   description: Exam, Subject, and Topic management
 */

// Exams & Bundles
router.post('/exams', protect, validateCreateExam, clearCache(req => `exams:${req.user.id}:*`), createExam);

/**
 * @swagger
 * /api/academic/bundles:
 *   post:
 *     summary: Create a composite bundle (exam + subjects + topics)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *               - subjects
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Composite Exam Bundle"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-01"
 *               description:
 *                 type: string
 *                 example: "A sample composite bundle"
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - topics
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Physics"
 *                     description:
 *                       type: string
 *                       example: "Physics Subject"
 *                     topics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - name
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Thermodynamics"
 *                           description:
 *                             type: string
 *                             example: "Thermodynamics Topic"
 *                           weightage:
 *                             type: number
 *                             example: 10
 *     responses:
 *       201:
 *         description: Composite bundle created successfully
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
router.post('/bundles', protect, clearCache(req => [`exams:${req.user.id}:*`, `subjects:${req.user.id}:*`, `topics:${req.user.id}:*`]), createCompositeBundle);

/**
 * @swagger
 * /api/academic/bundles/{examId}/weightages:
 *   put:
 *     summary: Update subject weightages for a bundle
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exam ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - weightages
 *             properties:
 *               weightages:
 *                 type: object
 *                 additionalProperties:
 *                   type: number
 *                 example:
 *                   "123e4567-e89b-12d3-a456-426614174000": 40
 *                   "123e4567-e89b-12d3-a456-426614174001": 60
 *     responses:
 *       200:
 *         description: Weightages updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Subject weightages updated successfully"
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
router.put('/bundles/:examId/weightages', protect, clearCache(req => [`subjects:${req.user.id}:*`, `exams:${req.user.id}:*`]), updateSubjectWeightages);

/**
 * @swagger
 * /api/academic/import-syllabus:
 *   post:
 *     summary: Import and parse a syllabus PDF using AI
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - syllabusFile
 *             properties:
 *               syllabusFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Syllabus imported and parsed successfully
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
 *                     exam:
 *                       $ref: '#/components/schemas/Exam'
 *       400:
 *         description: File missing or validation failed
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
 *         description: Rate limit or AI quota exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/import-syllabus',
  protect,
  upload.single('syllabusFile'),
  aiLimiter,
  checkQuota,
  clearCache((req) => [`exams:${req.user.id}:*`, `subjects:${req.user.id}:*`, `topics:${req.user.id}:*`]),
  importSyllabus
);

/**
 * @swagger
 * /api/academic/exams:
 *   post:
 *     summary: Create a new exam
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "JEE Advanced 2025"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Joint Entrance Examination Advanced 2025"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-05-18"
 *     responses:
 *       201:
 *         description: Exam created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Exam'
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

/**
 * @swagger
 * /api/academic/exams:
 *   get:
 *     summary: Get all exams for the authenticated user
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exams
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
 *                     $ref: '#/components/schemas/Exam'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/exams', protect, cacheMiddleware(req => `exams:${req.user.id}:${req.originalUrl}`), getExams);

/**
 * @swagger
 * /api/academic/exams/{id}:
 *   delete:
 *     summary: Delete an exam
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam deleted successfully
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
 *                       example: "Exam deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Exam not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.delete('/exams/:id', protect, clearCache(req => `exams:${req.user.id}:*`), deleteExam);

/**
 * @swagger
 * /api/academic/subjects:
 *   post:
 *     summary: Create a new subject
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - exam
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Physics"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Physics for JEE Advanced"
 *               exam:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Subject created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subject'
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
 *         description: Exam not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Subjects
router.post('/subjects', protect, validateCreateSubject, clearCache(req => [`exams:${req.user.id}:*`, `subjects:${req.user.id}:*`, `topics:${req.user.id}:*`]), createSubject);

/**
 * @swagger
 * /api/academic/subjects:
 *   get:
 *     summary: Get all subjects for the authenticated user
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subjects
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
 *                     $ref: '#/components/schemas/Subject'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/subjects', protect, cacheMiddleware(req => `subjects:${req.user.id}:${req.originalUrl}`), getSubjects);

/**
 * @swagger
 * /api/academic/subjects/{id}:
 *   delete:
 *     summary: Delete a subject
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subject ID
 *     responses:
 *       200:
 *         description: Subject deleted successfully
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
 *                       example: "Subject deleted successfully"
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

router.delete('/subjects/:id', protect, clearCache(req => [`exams:${req.user.id}:*`, `subjects:${req.user.id}:*`, `topics:${req.user.id}:*`, `pyqs:${req.user.id}:*`]), deleteSubject);

/**
 * @swagger
 * /api/academic/topics:
 *   post:
 *     summary: Create a new topic
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Mechanics"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Classical mechanics for JEE"
 *               subject:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               weightage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 25
 *     responses:
 *       201:
 *         description: Topic created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
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

// Topics
router.post('/topics', protect, validateCreateTopic, clearCache(req => [`topics:${req.user.id}:*`, `subjects:${req.user.id}:*`]), createTopic);

/**
 * @swagger
 * /api/academic/topics:
 *   get:
 *     summary: Get all topics for the authenticated user
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of topics
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
 *                     $ref: '#/components/schemas/Topic'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/topics', protect, cacheMiddleware(req => `topics:${req.user.id}:${req.originalUrl}`), getTopics);

/**
 * @swagger
 * /api/academic/topics/{id}:
 *   put:
 *     summary: Update a topic
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Mechanics"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Classical mechanics for JEE"
 *               weightage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 30
 *               status:
 *                 type: string
 *                 enum: [Weak, Medium, Strong]
 *                 example: Medium
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
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
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.put('/topics/:id', protect, validateUpdateTopic, clearCache(req => [`topics:${req.user.id}:*`, `subjects:${req.user.id}:*`]), updateTopic);

/**
 * @swagger
 * /api/academic/topics/{id}:
 *   delete:
 *     summary: Delete a topic
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic deleted successfully
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
 *                       example: "Topic deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.delete('/topics/:id', protect, clearCache(req => [`topics:${req.user.id}:*`, `subjects:${req.user.id}:*`]), deleteTopic);

module.exports = router;
