/**
 * @fileoverview Controller for handling exam readiness analytics, predictions, and projections.
 */

const { Subject, QuizAttempt, ReadinessSnapshot, StudyPlan } = require('../models');
const { calculateSubjectReadiness } = require('../services/readinessCalculator');
const readinessPredictorService = require('../services/readinessPredictorService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('../config/prompts');

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'your_gemini_api_key_here') ? new GoogleGenerativeAI(apiKey) : null;

// Cache utility helper (redis fallback to local memory cache if redis client is not active)
const cache = {};
const getCached = async (key) => cache[key];
const setCached = async (key, val, ttl = 3600) => {
  cache[key] = val;
  setTimeout(() => {
    delete cache[key];
  }, ttl * 1000);
};

const compileReadinessSummary = async (userId) => {
  // Check if user has taken any quizzes to prevent empty state crashes
  const totalQuizAttempts = await QuizAttempt.count({ where: { user: userId } });
  if (totalQuizAttempts === 0) {
    return { insufficientData: true };
  }

  const subjects = await Subject.findAll({ where: { user: userId } });
  const readinessData = [];
  let totalScoreSum = 0;

  for (const sub of subjects) {
    const metrics = await calculateSubjectReadiness(userId, sub.id);

    // Save/Update snapshot in DB
    let snapshot = await ReadinessSnapshot.findOne({ where: { userId, subjectId: sub.id } });
    if (snapshot) {
      snapshot.readinessScore = metrics.readinessScore;
      snapshot.syllabusCoverage = metrics.syllabusCoverage;
      snapshot.quizAccuracy = metrics.quizAccuracy;
      snapshot.memoryRetention = metrics.memoryRetention;
      snapshot.studyVelocity = metrics.studyVelocity;
      await snapshot.save();
    } else {
      snapshot = await ReadinessSnapshot.create({
        userId,
        subjectId: sub.id,
        readinessScore: metrics.readinessScore,
        syllabusCoverage: metrics.syllabusCoverage,
        quizAccuracy: metrics.quizAccuracy,
        memoryRetention: metrics.memoryRetention,
        studyVelocity: metrics.studyVelocity,
      });
    }

    totalScoreSum += metrics.readinessScore;
    readinessData.push({
      subjectId: sub.id,
      subjectName: sub.name,
      overallScore: metrics.readinessScore,
      breakdown: {
        syllabusCoverage: metrics.syllabusCoverage,
        quizAccuracy: metrics.quizAccuracy,
        memoryRetention: metrics.memoryRetention,
        studyVelocity: metrics.studyVelocity,
      },
    });
  }

  const overallReadiness = subjects.length > 0 ? Math.round(totalScoreSum / subjects.length) : 0;

  // AI recommendations
  let aiRecommendation = 'Focus on expanding your quiz practice sessions to build exam confidence.';
  if (genAI && readinessData.length > 0) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = prompts.readiness.compileReadinessSummary(readinessData);
      const result = await model.generateContent(prompt);
      aiRecommendation = result.response.text().trim();
    } catch (err) {
      console.error('Failed to generate AI readiness diagnosis:', err);
    }
  }

  // Trajectory forecast (plot points up to exam date)
  const activePlan = await StudyPlan.findOne({ where: { user: userId, status: 'active' } });
  const daysToExam = activePlan ? Math.max(1, Math.ceil((new Date(activePlan.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 14;
  const trajectory = [];

  for (let i = 0; i <= daysToExam; i += Math.max(1, Math.ceil(daysToExam / 6))) {
    const dayOffset = i;
    const projected = Math.min(100, Math.round(overallReadiness + ((100 - overallReadiness) * (dayOffset / daysToExam))));
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    trajectory.push({
      day: `Day ${dayOffset}`,
      date: date.toLocaleDateString(),
      score: projected,
    });
  }

  return {
    insufficientData: false,
    overallReadiness,
    subjects: readinessData,
    aiRecommendation,
    trajectory,
  };
};

exports.getSubjectReadiness = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `user_readiness_${userId}`;

    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, source: 'cache', data: cached });
    }

    const payload = await compileReadinessSummary(userId);

    // Cache for 1 hour
    if (!payload.insufficientData) {
      await setCached(cacheKey, payload, 3600);
    }

    res.status(200).json({
      success: true,
      source: 'database',
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

exports.recalculateReadiness = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `user_readiness_${userId}`;

    // Clear cache first
    delete cache[cacheKey];

    const payload = await compileReadinessSummary(userId);

    if (!payload.insufficientData) {
      await setCached(cacheKey, payload, 3600);
    }

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/analytics/readiness-projection:
 *   get:
 *     summary: Retrieve predictive exam readiness trajectory and daily hours simulation data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetExamDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dailyHours
 *         schema:
 *           type: integer
 *           default: 2
 *       - in: query
 *         name: targetScore
 *         schema:
 *           type: integer
 *           default: 85
 *     responses:
 *       200:
 *         description: Predictive readiness trajectory and recommendations
 */
exports.getReadinessProjection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetExamDate, dailyHours, targetScore } = req.query;
    const readinessEngine = require('../services/readinessEngine');

    const payload = await readinessEngine.calculateReadinessProjection({
      userId,
      targetExamDate,
      dailyHours: dailyHours !== undefined ? Number(dailyHours) : 2,
      targetScore: targetScore !== undefined ? Number(targetScore) : 85,
    });

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches exam readiness analysis based on quiz history, retention rates, and topic performance.
 * Currently uses mock data pending full database integration.
 */
exports.getReadinessAnalysis = async (req, res, next) => {
  try {
    const { targetScore } = req.query;
    const target = targetScore ? parseInt(targetScore, 10) : 80;

    if (isNaN(target) || target < 0 || target > 100) {
      return res.status(400).json({
        success: false,
        message: 'Target score must be a number between 0 and 100.'
      });
    }

    // Mock user data retrieval from database
    // TODO: Replace with actual DB queries using req.user.id
    const mockUserData = {
      quizScores: [
        { date: '2023-10-01', percentage: 65 },
        { date: '2023-10-15', percentage: 72 },
        { date: '2023-10-28', percentage: 78 }
      ],
      flashcardRetention: [
        { topic: 'Algorithms', retentionRate: 60 },
        { topic: 'Data Structures', retentionRate: 85 },
        { topic: 'Databases', retentionRate: 70 }
      ],
      topicData: [
        { name: 'Algorithms', avgQuizScore: 65, retentionRate: 60, timeSpentMinutes: 120 },
        { name: 'Data Structures', avgQuizScore: 85, retentionRate: 85, timeSpentMinutes: 300 },
        { name: 'Databases', avgQuizScore: 70, retentionRate: 70, timeSpentMinutes: 180 },
        { name: 'Operating Systems', avgQuizScore: 55, retentionRate: 50, timeSpentMinutes: 60 }
      ]
    };

    const analysis = readinessPredictorService.calculateReadiness(mockUserData, target);

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error calculating readiness analysis:', error);
    next(error);
  }
};
