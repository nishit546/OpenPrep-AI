const express = require('express');
const {
  getDashboardStats,
  getSubjectBreakdown,
  getMasteryLevels,
  updateSubjectGoal,
  getCompositeBundleOverview,  getStudyHours,
  trackStudyTime,
  updateTopicProgress,
  getActivityFeed,
  exportCSV,
  exportPDF,
  logFocusSession,
  getWeeklyFocusEfficiency,
  getInteractiveAnalytics,
  reconcileMyAnalytics,
} = require('../controllers/progressController');const { getXPStatus, awardXP, unlockSkillNode, equipStreakFreeze } = require('../controllers/xpController');
const { protect } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const {
  validateTrackStudyTime,
  validateUpdateTopicProgress,
  validateFocusSession,
} = require('../middleware/validators');
const router = express.Router();

router.get('/composite-overview', protect, getCompositeBundleOverview);


/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: Dashboard stats, study tracking, and progress analytics
 */

/**
 * @swagger
 * /api/progress/stats:
 *   get:
 *     summary: Get dashboard statistics for the authenticated user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
 *                     totalStudyHours:
 *                       type: number
 *                     totalQuizzes:
 *                       type: integer
 *                     averageScore:
 *                       type: number
 *                     weakTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topic:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           score:
 *                             type: number
 *                     strongTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topic:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           score:
 *                             type: number
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/stats', protect, cacheMiddleware(900), getDashboardStats);

/**
 * @swagger
 * /api/progress/dashboard:
 *   get:
 *     summary: Get dashboard statistics (alias for /stats)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
 *                     totalStudyHours:
 *                       type: number
 *                     totalQuizzes:
 *                       type: integer
 *                     averageScore:
 *                       type: number
 *                     weakTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topic:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           score:
 *                             type: number
 *                     strongTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topic:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           score:
 *                             type: number
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/dashboard', protect, cacheMiddleware(900), getDashboardStats);

/**
 * @swagger
 * /api/progress/subjects:
 *   get:
 *     summary: Get subject-wise progress breakdown
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subject breakdown
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
 *                       subject:
 *                         type: string
 *                       totalHours:
 *                         type: number
 *                       completionPercentage:
 *                         type: number
 *                       weakTopics:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             topic:
 *                               type: string
 *                             score:
 *                               type: number
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/subjects', protect, cacheMiddleware(900), getSubjectBreakdown);

/**
 * @swagger
 * /api/progress/mastery:
 *   get:
 *     summary: Get subject & chapter mastery levels computed from quiz accuracy and flashcard retention
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mastery levels with tier badges
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
 *                     overallMastery:
 *                       type: number
 *                       example: 72
 *                     overallTier:
 *                       type: string
 *                       enum: [Beginner, Intermediate, Master]
 *                       example: Intermediate
 *                     subjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           masteryPercentage:
 *                             type: number
 *                           tier:
 *                             type: string
 *                             enum: [Beginner, Intermediate, Master]
 *                           chapters:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 name:
 *                                   type: string
 *                                 masteryPercentage:
 *                                   type: number
 *                                 tier:
 *                                   type: string
 *                                   enum: [Beginner, Intermediate, Master]
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/mastery', protect, cacheMiddleware(900), getMasteryLevels);
router.put('/subject-goals/:subjectId', protect, updateSubjectGoal);
/**
 * @swagger
 * /api/progress/study-hours:
 *   get:
 *     summary: Get study hours for the authenticated user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Study hours data
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
 *                     totalHours:
 *                       type: number
 *                     weeklyHours:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           week:
 *                             type: string
 *                           hours:
 *                             type: number
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/study-hours', protect, getStudyHours);

/**
 * @swagger
 * /api/progress/export/csv:
 *   get:
 *     summary: Export progress data as CSV
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file downloaded
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/export/csv', protect, exportCSV);

/**
 * @swagger
 * /api/progress/export/pdf:
 *   get:
 *     summary: Export progress data as PDF
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PDF file downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/export/pdf', protect, exportPDF);

/**
 * @swagger
 * /api/progress/track:
 *   post:
 *     summary: Track study time for a subject/topic
 *     tags: [Progress]
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
 *               - hours
 *             properties:
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               topicId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               hours:
 *                 type: number
 *                 minimum: 0.25
 *                 maximum: 24
 *                 example: 1.5
 *     responses:
 *       200:
 *         description: Study time tracked successfully
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
 *                     totalStudyHours:
 *                       type: number
 *                     hoursLogged:
 *                       type: number
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

router.post('/track', protect, validateTrackStudyTime, trackStudyTime);

/**
 * @swagger
 * /api/progress/topic/{id}:
 *   put:
 *     summary: Update topic progress (completion, flashcards, quiz scores)
 *     tags: [Progress]
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
 *               completionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 75
 *               studyHours:
 *                 type: number
 *                 minimum: 0
 *                 example: 2.5
 *               flashcardsMastered:
 *                 type: integer
 *                 minimum: 0
 *                 example: 10
 *               quizScores:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     attempt:
 *                       type: string
 *                       format: uuid
 *                     score:
 *                       type: number
 *                     date:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Topic progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Progress'
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

router.put('/topic/:id', protect, validateUpdateTopicProgress, updateTopicProgress);

/**
 * @swagger
 * /api/progress/activity:
 *   get:
 *     summary: Get activity feed for the authenticated user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity feed
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
 *                       id:
 *                         type: string
 *                       activityType:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/activity', protect, cacheMiddleware(300), getActivityFeed);

router.post('/focus-session', protect, validateFocusSession, logFocusSession);
router.get('/focus-session/weekly', protect, getWeeklyFocusEfficiency);

router.get('/xp/status', protect, getXPStatus);
router.post('/xp/award', protect, awardXP);
router.post('/xp/unlock', protect, unlockSkillNode);
router.post('/streak-freeze/equip', protect, equipStreakFreeze);

router.get('/analytics', protect, cacheMiddleware(900), getInteractiveAnalytics);

router.post('/reconcile', protect, reconcileMyAnalytics);

module.exports = router;