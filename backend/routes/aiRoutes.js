const express = require('express');
const { explainQuestion } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { checkQuota } = require('../middleware/quotaMiddleware');
const { validateExplainQuestion } = require('../middleware/validators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered study assistant endpoints
 */

/**
 * @swagger
 * /api/ai/explain-question:
 *   post:
 *     summary: Generate an AI hint or step-by-step solution for a quiz question
 *     description: >
 *       Returns GitHub-Flavored Markdown explaining a quiz question.
 *       Use `mode: "hint"` for a nudge that avoids revealing the answer, or
 *       `mode: "full"` for a detailed step-by-step solution.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - options
 *               - correctAnswer
 *             properties:
 *               question:
 *                 type: string
 *                 description: The question text
 *                 example: "What is 2 + 2?"
 *               options:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 6
 *                 items:
 *                   type: string
 *                 description: The list of answer choices
 *                 example: ["1", "2", "3", "4"]
 *               correctAnswer:
 *                 oneOf:
 *                   - type: integer
 *                     description: Index of the correct option
 *                   - type: string
 *                     description: The correct option text
 *                 description: Index (0-based) of the correct option, or the option text itself
 *                 example: 3
 *               userAnswer:
 *                 oneOf:
 *                   - type: integer
 *                     nullable: true
 *                   - type: string
 *                     nullable: true
 *                 description: Index or text of the student's answer, or null if unanswered
 *                 example: 1
 *               explanation:
 *                 type: string
 *                 description: Optional explanation already stored with the question
 *               mode:
 *                 type: string
 *                 enum: [hint, full]
 *                 default: full
 *                 description: Whether to return a hint or a full step-by-step solution
 *               subjectName:
 *                 type: string
 *                 description: Optional subject name for context
 *               topicName:
 *                 type: string
 *                 description: Optional topic name for context
 *     responses:
 *       200:
 *         description: Explanation generated successfully
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
 *                     mode:
 *                       type: string
 *                       enum: [hint, full]
 *                     markdown:
 *                       type: string
 *                       description: GitHub-Flavored Markdown explanation
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
 *         description: Rate limit or daily quota exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Gemini API server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/explain-question',
  protect,
  aiLimiter,
  checkQuota,
  validateExplainQuestion,
  explainQuestion
);

module.exports = router;
