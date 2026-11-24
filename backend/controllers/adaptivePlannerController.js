const adaptivePlannerService = require('../services/adaptivePlannerService');
const StudyPlan = require('../models/StudyPlan');

exports.getAdaptiveAdjustments = async (req, res) => {
  try {
    const { planId } = req.params;
    const data = await adaptivePlannerService.computeAdaptiveAdjustments(req.user.id, planId || null);
    if (!data.plan) return res.status(404).json({ success: false, message: 'No active study plan found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error computing adaptive adjustments:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to compute adjustments' });
  }
};

exports.applyAdaptiveAdjustments = async (req, res) => {
  try {
    const data = await adaptivePlannerService.applyAdaptiveAdjustments(
      req.user.id, req.params.planId, req.body.expectedUpdatedAt
    );
    if (!data.plan) return res.status(404).json({ success: false, message: 'No active study plan found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.code === 'STALE_PLAN' || error.code === 'CAPACITY_EXCEEDED') {
      return res.status(409).json({ success: false, message: error.message, details: error.details });
    }
    console.error('Error applying adaptive adjustments:', error);
    res.status(500).json({ success: false, message: 'Failed to apply adjustments' });
  }
};

exports.generateAdaptivePlan = async (req, res) => {
  try {
    const { examDate, dailyHours, subjectIds } = req.body;
    if (!Number.isFinite(Number(dailyHours)) || Number(dailyHours) < 1 || Number(dailyHours) > 12 ||
        !Number.isFinite(Date.parse(examDate)) || Date.parse(examDate) <= Date.now()) {
      return res.status(400).json({ success: false, message: 'A future examDate and dailyHours between 1 and 12 are required' });
    }
    const planData = await adaptivePlannerService.generateAdaptivePlan(req.user.id, examDate, dailyHours, subjectIds || []);
    const dailyGoals = planData.dailyGoals.map((goal) => ({
      ...goal,
      dailyCapacityMinutes: Math.round(Number(dailyHours) * 60),
      tasks: (goal.tasks || []).map((task) => ({ ...task, baseDuration: Number(task.duration) || 60 })),
    }));

    // Create or update study plan
    let plan = await StudyPlan.findOne({ where: { user: req.user.id, status: 'active' } });
    if (plan) {
      plan.dailyGoals = dailyGoals;
      plan.endDate = new Date(examDate);
      await plan.save();
    } else {
      plan = await StudyPlan.create({
        exam: subjectIds?.[0] || '00000000-0000-0000-0000-000000000000',
        user: req.user.id,
        startDate: new Date(),
        endDate: new Date(examDate),
        dailyGoals,
        status: 'active',
      });
    }

    res.status(201).json({
      success: true,
      data: { planId: plan.id, totalDays: planData.totalDays, strategy: planData.strategy, dailyGoals },
    });
  } catch (error) {
    console.error('Error generating adaptive plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate plan' });
  }
};

exports.getTodayTasks = async (req, res) => {
  try {
    const data = await adaptivePlannerService.getTodayTasks(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching today tasks:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch today tasks' });
  }
};

exports.getPlanStats = async (req, res) => {
  try {
    const data = await adaptivePlannerService.getPlanStats(req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'No active study plan found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch plan stats' });
  }
};
