const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const StudyPlan = require('../models/StudyPlan');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

// @desc    Generate AI Study Plan
// @route   POST /api/study-plans/generate-ai
// @access  Private
exports.generateAIPlan = async (req, res, next) => {
  try {
    const { examId, startDate, endDate, studyHoursPerDay } = req.body;

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Retrieve subjects and topics to construct syllabus payload
    const subjects = await Subject.findAll({ where: { exam: examId, user: req.user.id } });
    const syllabus = [];

    for (const sub of subjects) {
      const topics = await Topic.findAll({ where: { subject: sub.id, user: req.user.id } });
      syllabus.push({
        subjectName: sub.name,
        topics: topics.map((t) => t.name),
      });
    }

    if (syllabus.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please add subjects and topics to your syllabus before generating a plan.',
      });
    }

    // Call Gemini API to structure plan
    const generatedGoals = await geminiService.generateStudyPlan(
      exam.name,
      syllabus,
      startDate,
      endDate,
      studyHoursPerDay || 3,
      req.query.refresh === 'true'
    );

    // Format goals for database insertion (resolve Topic UUIDs if names match)
    const formattedGoals = [];
    for (const day of generatedGoals) {
      const tasks = [];
      for (const t of day.tasks) {
        // Try finding matching Topic using case-insensitive PostgreSQL iLike matching
        const matchedTopic = await Topic.findOne({
          where: {
            name: { [Op.iLike]: t.topicName.trim() },
            user: req.user.id,
          },
        });

        tasks.push({
          _id: uuidv4(), // Assign a stable UUID virtual _id to mimic Mongoose subdocument id
          title: t.title,
          duration: t.duration || 60,
          completed: false,
          topic: matchedTopic ? matchedTopic.id : null,
        });
      }
      formattedGoals.push({
        date: new Date(day.date),
        tasks,
      });
    }

    // Archive previous active plans
    await StudyPlan.update(
      { status: 'archived' },
      { where: { user: req.user.id, exam: examId, status: 'active' } }
    );

    const studyPlan = await StudyPlan.create({
      exam: examId,
      user: req.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyGoals: formattedGoals,
      status: 'active',
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'study_plan_create',
      description: `Generated AI Study Plan for exam: ${exam.name}`,
    });

    res.status(201).json({
      success: true,
      data: studyPlan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Study Plan
// @route   GET /api/study-plans/active
// @access  Private
exports.getActivePlan = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const filter = { user: req.user.id, status: 'active' };
    if (examId) filter.exam = examId;

    const plan = await StudyPlan.findOne({
      where: filter,
      include: [{ model: Exam, as: 'examRef' }],
    });

    if (!plan) {
      return res.status(200).json({ success: true, data: null });
    }

    // Perform in-memory join for topic references inside JSONB dailyGoals
    const topics = await Topic.findAll({ where: { user: req.user.id } });
    const topicMap = {};
    topics.forEach((t) => {
      topicMap[t.id] = t;
    });

    const resolvedGoals = plan.dailyGoals.map((goal) => ({
      ...goal,
      tasks: goal.tasks.map((task) => ({
        ...task,
        topic: task.topic ? topicMap[task.topic] || null : null,
      })),
    }));

    const planJson = plan.toJSON();
    planJson.exam = planJson.examRef; // populate parity
    planJson.dailyGoals = resolvedGoals;

    res.status(200).json({ success: true, data: planJson });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Task Completion Status
// @route   PUT /api/study-plans/:planId/tasks/:taskId
// @access  Private
exports.toggleTaskCompletion = async (req, res, next) => {
  try {
    const { planId, taskId } = req.params;
    const { completed, studyTimeMinutes } = req.body;

    const plan = await StudyPlan.findOne({ where: { id: planId, user: req.user.id } });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    // Find and update task inside JSONB dailyGoals
    let taskFound = false;
    const dailyGoals = JSON.parse(JSON.stringify(plan.dailyGoals));
    for (const goal of dailyGoals) {
      const task = goal.tasks.find((t) => t._id === taskId || t.id === taskId);
      if (task) {
        task.completed = completed;
        taskFound = true;
        break;
      }
    }

    if (!taskFound) {
      return res.status(404).json({ success: false, error: 'Task not found in plan' });
    }

    plan.dailyGoals = dailyGoals;
    await plan.save();

    // If task was completed, add study hours to User profile
    if (completed && studyTimeMinutes) {
      const hours = studyTimeMinutes / 60;
      const user = await User.findByPk(req.user.id);
      if (user) {
        user.studyHours = Number((user.studyHours + hours).toFixed(2));
        await user.save();
      }
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Study Plans
// @route   GET /api/study-plans/plans
// @access  Private
exports.getPlans = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count: totalItems, rows: plans } = await StudyPlan.findAndCountAll({
      where: { user: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: Exam, as: 'examRef' }],
      offset,
      limit,
    });

    res.status(200).json({
      success: true,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};
