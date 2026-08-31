const habitCorrelationService = require('../services/habitCorrelationService');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Record a study habit observation
 * @route   POST /api/habit-correlations/record
 * @access  Private
 */
exports.recordObservation = async (req, res, next) => {
  try {
    const {
      studyHourOfDay,
      studyDayOfWeek,
      sessionDurationMinutes,
      flashcardsReviewed,
      quizzesAttempted,
      notesStudied,
      tookBreak,
      gapSinceLastSessionHours,
      avgQuizScore,
      flashcardRetentionRate,
      productivityScore,
      observationDate,
    } = req.body;

    if (studyHourOfDay == null || studyDayOfWeek == null) {
      return res.status(400).json({
        success: false,
        error: 'studyHourOfDay and studyDayOfWeek are required',
      });
    }

    const observation = await habitCorrelationService.recordObservation(req.user.id, {
      studyHourOfDay,
      studyDayOfWeek,
      sessionDurationMinutes,
      flashcardsReviewed,
      quizzesAttempted,
      notesStudied,
      tookBreak,
      gapSinceLastSessionHours,
      avgQuizScore,
      flashcardRetentionRate,
      productivityScore,
      observationDate,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'habit_observation_recorded',
      description: `Recorded study habit observation for ${observation.observationDate}`,
    });

    res.status(201).json({ success: true, data: observation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full correlation summary with insights
 * @route   GET /api/habit-correlations/summary
 * @access  Private
 */
exports.getCorrelationSummary = async (req, res, next) => {
  try {
    const summary = await habitCorrelationService.getCorrelationSummary(req.user.id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance breakdown by hour of day
 * @route   GET /api/habit-correlations/by-hour
 * @access  Private
 */
exports.getPerformanceByHour = async (req, res, next) => {
  try {
    const data = await habitCorrelationService.getPerformanceByHour(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance breakdown by day of week
 * @route   GET /api/habit-correlations/by-day
 * @access  Private
 */
exports.getPerformanceByDay = async (req, res, next) => {
  try {
    const data = await habitCorrelationService.getPerformanceByDay(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get optimal study schedule recommendation
 * @route   GET /api/habit-correlations/optimal-schedule
 * @access  Private
 */
exports.getOptimalSchedule = async (req, res, next) => {
  try {
    const data = await habitCorrelationService.getOptimalSchedule(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
