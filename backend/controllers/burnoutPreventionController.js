const burnoutPreventionService = require('../services/burnoutPreventionService');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Submit a new burnout assessment
 * @route   POST /api/burnout/assess
 * @access  Private
 */
exports.submitAssessment = async (req, res, next) => {
  try {
    const {
      stressLevel,
      studyHoursLast24h,
      sleepQuality,
      motivationLevel,
      fatigueLevel,
      socialIsolationDays,
      notes,
    } = req.body;

    if (!stressLevel || stressLevel < 1 || stressLevel > 10) {
      return res.status(400).json({
        success: false,
        error: 'stressLevel is required and must be between 1 and 10',
      });
    }

    const assessment = await burnoutPreventionService.performAssessment(req.user.id, {
      stressLevel,
      studyHoursLast24h: studyHoursLast24h || 0,
      sleepQuality: sleepQuality || 5,
      motivationLevel: motivationLevel || 5,
      fatigueLevel: fatigueLevel || 5,
      socialIsolationDays: socialIsolationDays || 0,
      notes,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'burnout_assessment',
      description: `Burnout risk assessed at ${assessment.riskCategory} (${assessment.riskScore}/100)`,
    });

    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current burnout risk summary
 * @route   GET /api/burnout/summary
 * @access  Private
 */
exports.getRiskSummary = async (req, res, next) => {
  try {
    const summary = await burnoutPreventionService.getRiskSummary(req.user.id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get assessment history with pagination
 * @route   GET /api/burnout/history
 * @access  Private
 */
exports.getAssessmentHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await burnoutPreventionService.getAssessmentHistory(req.user.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      count: result.assessments.length,
      ...result.pagination,
      data: result.assessments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recommendations based on latest assessment
 * @route   GET /api/burnout/recommendations
 * @access  Private
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const summary = await burnoutPreventionService.getRiskSummary(req.user.id);

    if (!summary.currentRisk) {
      return res.status(200).json({
        success: true,
        data: {
          hasAssessment: false,
          message: 'Submit your first assessment to receive personalised recommendations.',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hasAssessment: true,
        riskCategory: summary.currentRisk.category,
        riskScore: summary.currentRisk.score,
        recommendations: summary.currentRisk.recommendations,
        riskFactors: summary.currentRisk.riskFactors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get burnout risk trend data for charting
 * @route   GET /api/burnout/trend
 * @access  Private
 */
exports.getRiskTrend = async (req, res, next) => {
  try {
    const { days } = req.query;
    const numDays = parseInt(days, 10) || 30;

    const { Op } = require('sequelize');
    const { BurnoutAssessment } = require('../models');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    const assessments = await BurnoutAssessment.findAll({
      where: {
        user: req.user.id,
        createdAt: { [Op.gte]: startDate },
      },
      attributes: ['riskScore', 'riskCategory', 'stressLevel', 'motivationLevel', 'fatigueLevel', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    const trendData = assessments.map((a) => ({
      date: a.createdAt.toISOString().split('T')[0],
      riskScore: a.riskScore,
      riskCategory: a.riskCategory,
      stressLevel: a.stressLevel,
      motivationLevel: a.motivationLevel,
      fatigueLevel: a.fatigueLevel,
    }));

    res.status(200).json({ success: true, data: trendData });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a quick daily check-in prompt with pre-computed context
 * @route   GET /api/burnout/daily-checkin
 * @access  Private
 */
exports.getDailyCheckin = async (req, res, next) => {
  try {
    const summary = await burnoutPreventionService.getRiskSummary(req.user.id);
    const { BurnoutAssessment } = require('../models');

    // Check if user has already assessed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAssessment = await BurnoutAssessment.findOne({
      where: {
        user: req.user.id,
        createdAt: { [Op.gte]: today },
      },
    });

    const consecutiveDays = await burnoutPreventionService.calculateConsecutiveStudyDays(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        alreadyAssessedToday: !!todayAssessment,
        previousAssessment: todayAssessment
          ? {
              riskScore: todayAssessment.riskScore,
              riskCategory: todayAssessment.riskCategory,
              assessedAt: todayAssessment.createdAt,
            }
          : null,
        consecutiveStudyDays: consecutiveDays,
        currentTrend: summary.trend,
        riskLevelDescription: summary.riskLevelDescription,
        prompt: todayAssessment
          ? 'You have already completed today\'s check-in. Re-assess later if your state changes.'
          : 'How are you feeling today? Rate your current state to get personalised guidance.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the burnout prevention dashboard overview
 * @route   GET /api/burnout/dashboard
 * @access  Private
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const summary = await burnoutPreventionService.getRiskSummary(req.user.id);

    // Get the last 7 days of trend data for sparkline
    const { Op } = require('sequelize');
    const { BurnoutAssessment } = require('../models');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAssessments = await BurnoutAssessment.findAll({
      where: {
        user: req.user.id,
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      attributes: ['riskScore', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    const weeklyRiskScores = recentAssessments.map((a) => a.riskScore);

    // Compute overall wellness score (inverse of risk, 0-100)
    const wellnessScore = summary.currentRisk
      ? Math.round((100 - summary.currentRisk.score) * 10) / 10
      : null;

    // Compute study-life balance indicator
    let balanceIndicator = 'unknown';
    if (summary.currentRisk) {
      const { riskCategory } = summary.currentRisk;
      if (riskCategory === 'low') balanceIndicator = 'well_balanced';
      else if (riskCategory === 'moderate') balanceIndicator = 'slightly_imbalanced';
      else if (riskCategory === 'elevated') balanceIndicator = 'imbalanced';
      else balanceIndicator = 'severely_imbalanced';
    }

    res.status(200).json({
      success: true,
      data: {
        currentRisk: summary.currentRisk,
        trend: summary.trend,
        categoryDistribution: summary.categoryDistribution,
        riskLevelDescription: summary.riskLevelDescription,
        wellnessScore,
        balanceIndicator,
        weeklyRiskScores,
        totalAssessments: summary.trend.assessmentCount30d,
      },
    });
  } catch (error) {
    next(error);
  }
};
