const { GoogleGenAI } = require('@google/genai');
const StudyPlan = require('../models/StudyPlan');
const User = require('../models/User');
const { Op } = require('sequelize');
const prompts = require('../config/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.rescheduleOverdueTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();

    // 1. Fetch overdue tasks and active user settings
    const overdueTasks = await StudyTask.findAll({
      where: {
        userId,
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: today },
      },
    });

    if (overdueTasks.length === 0) {
      return res.status(200).json({ success: true, message: 'No overdue tasks found.', rescheduledTasks: [] });
    }

    const settings = await UserSettings.findOne({ where: { userId } }) || { maxDailyHours: 4, examDate: new Date(today.getTime() + 7 * 86400000) };
    const maxDailyHours = settings.maxDailyHours || 4;
    const examDate = new Date(settings.examDate);

    // Calculate days remaining until exam
    const diffTime = examDate - today;
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Query Gemini AI or compute mathematical redistribution respecting maxDailyHours
    const prompt = prompts.studyPlanner.rescheduleOverdueTasks(overdueTasks, daysRemaining, maxDailyHours);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    try {
      require('../services/metricsService').recordTokensConsumed(
        'gemini-2.5-flash',
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
      );
    } catch (e) {}

    const rescheduledPlan = JSON.parse(response.text);

    res.status(200).json({
      success: true,
      daysRemaining,
      maxDailyHours,
      rescheduledTasks: rescheduledPlan,
    });
  } catch (error) {
    next(error);
  }
};
