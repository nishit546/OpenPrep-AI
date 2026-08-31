const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const StudyPlan = require('../models/StudyPlan');
const cacheService = require('../services/cacheService');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { toDateOnlyString, toLocalDateString } = require('../utils/dateUtils');
const { generateMilestones } = require('../services/milestoneGeneratorService');
const calendarService = require('../services/calendarService');
const schedulePredictorService = require('../services/schedulePredictorService');
const studyPlanService = require('../services/studyPlanService');

const triggerBackgroundCalendarSync = (plan, user) => {
  if (user && user.syncGoogleCalendar && user.googleCalendarRefreshToken) {
    calendarService.syncToGoogleCalendar(plan, user).catch((err) => {
      console.error('[Calendar Sync] Background calendar sync failed:', err.message);
    });
  }
};

// @desc    Generate AI Study Plan
// @route   POST /api/study-plans/generate-ai
// @access  Private
exports.generateAIPlan = async (req, res, next) => {
  try {
    const { examId, startDate, endDate, studyHoursPerDay } = req.body;

    const exam = await Exam.findOne({ where: { id: examId, user: req.user.id } });
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
        let matchedTopic;
        try {
          matchedTopic = await Topic.findOne({
            where: {
              name: { [Op.iLike]: t.topicName.trim() },
              user: req.user.id,
            },
          });
        } catch (dbErr) {
          const userTopics = await Topic.findAll({ where: { user: req.user.id } });
          matchedTopic = userTopics.find((tp) => tp.name.trim().toLowerCase() === t.topicName.trim().toLowerCase());
        }

        tasks.push({
          _id: uuidv4(), // Assign a stable UUID virtual _id to mimic Mongoose subdocument id
          title: t.title,
          duration: t.duration || 60,
          completed: false,
          topic: matchedTopic ? matchedTopic.id : null,
        });
      }
      formattedGoals.push({
        // Store plain YYYY-MM-DD date strings (local day) instead of UTC
        // timestamps so schedule items never shift by a day across timezones.
        date: toDateOnlyString(day.date),
        tasks,
      });
    }

    // Archive previous active plans
    await StudyPlan.update(
      { status: 'archived' },
      { where: { user: req.user.id, exam: examId, status: 'active' } }
    );

    const milestones = generateMilestones({
      startDate: toDateOnlyString(startDate),
      endDate: toDateOnlyString(endDate),
      dailyGoals: formattedGoals,
      examName: exam.name,
    });

    const studyPlan = await StudyPlan.create({
      exam: examId,
      user: req.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyGoals: formattedGoals,
      milestones,
      status: 'active',
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'study_plan_create',
      description: `Generated AI Study Plan for exam: ${exam.name}`,
    });

    await cacheService.del(`study_plan:active:${req.user.id}`);

    triggerBackgroundCalendarSync(studyPlan, req.user);

    res.status(201).json({
      success: true,
      data: studyPlan,
    });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Get Active Study Plan
// @route   GET /api/study-plans/active
// @access  Private
exports.getActivePlan = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const cacheKey = `study_plan:active:${req.user.id}`;

    // Read cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!examId || (parsed && parsed.exam && parsed.exam.id === examId)) {
          return res.status(200).json({ success: true, data: parsed });
        }
      } catch (err) {
        console.warn('Failed to parse cached study plan:', err.message);
      }
    }

    const filter = { user: req.user.id, status: 'active' };
    if (examId) filter.exam = examId;

    const plan = await StudyPlan.findOne({
      where: filter,
      include: [{ model: Exam, as: 'examRef' }],
    });

    if (!plan) {
      return res.status(200).json({ success: true, data: null });
    }

    // Extract topic IDs referenced in dailyGoals
    const topicIds = new Set();
    plan.dailyGoals.forEach((goal) => {
      goal.tasks.forEach((task) => {
        if (task.topic) topicIds.add(task.topic);
      });
    });

    // Fetch only the referenced topics for the in-memory join
    const topics = await Topic.findAll({
      where: {
        id: { [Op.in]: Array.from(topicIds) },
        user: req.user.id,
      },
    });

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
    planJson.completionForecast = schedulePredictorService.getCompletionForecast({
      dailyGoals: plan.dailyGoals,
      referenceDateStr: toLocalDateString(new Date()),
      examDateStr: plan.examRef ? plan.examRef.date : null,
    });

    // Store in cache for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, JSON.stringify(planJson), 300);

    res.status(200).json({ success: true, data: planJson });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Task Completion Status or Update Task Duration
// @route   PUT /api/study-plans/:planId/tasks/:taskId
// @access  Private
exports.toggleTaskCompletion = async (req, res, next) => {
  try {
    const { planId, taskId } = req.params;
    const { completed, studyTimeMinutes, duration } = req.body;

    const plan = await StudyPlan.findOne({ where: { id: planId, user: req.user.id } });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    // Find and update task inside JSONB dailyGoals
    let taskFound = false;
    let wasCompleted = false;
    const dailyGoals = JSON.parse(JSON.stringify(plan.dailyGoals));
    for (const goal of dailyGoals) {
      const task = goal.tasks.find((t) => t._id === taskId || t.id === taskId);
      if (task) {
        wasCompleted = task.completed; // Capture previous state BEFORE modifying
        if (completed !== undefined) {
          task.completed = completed;
        }
        if (duration !== undefined && typeof duration === 'number' && duration >= 0) {
          task.duration = duration;
        }
        taskFound = true;
        break;
      }
    }

    if (!taskFound) {
      return res.status(404).json({ success: false, error: 'Task not found in plan' });
    }

    plan.dailyGoals = dailyGoals;
    await plan.save();

    // Adjust study hours based on task state transition
    //   false -> true : add hours (task was just completed)
    //   true  -> false: subtract hours (task was unmarked)
    //   same state    : no change (prevents double-counting)
    let progression = null;
    if (completed && !wasCompleted) {
      const gamificationService = require('../services/gamificationService');
      progression = await gamificationService.awardXP(req.user.id, 50, 'task_complete');

      const timeZoneParam = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
      await gamificationService.updateStreak(req.user.id, timeZoneParam);

      const user = await User.findByPk(req.user.id);
      const badgeDetails = req.headers['x-timezone']
        ? { timeZone: req.headers['x-timezone'] }
        : { timezoneOffsetMinutes: Number(req.headers['x-timezone-offset']) || 0 };
      const newBadges = await gamificationService.checkAndUnlockBadges(user, 'task_complete', badgeDetails);
      progression.newBadges = newBadges;
    }

    if (studyTimeMinutes) {
      const hours = studyTimeMinutes / 60;

      if (completed && !wasCompleted) {
        // Task transitioned from incomplete -> complete: add hours
        const user = await User.findByPk(req.user.id);
        if (user) {
          user.studyHours = Number((user.studyHours + hours).toFixed(2));
          await user.save();
        }
      } else if (!completed && wasCompleted) {
        // Task transitioned from complete -> incomplete: subtract hours
        const user = await User.findByPk(req.user.id);
        if (user) {
          user.studyHours = Number(Math.max(0, user.studyHours - hours).toFixed(2));
          await user.save();
        }
      }
      // If state unchanged (completed === wasCompleted), do nothing
    }

    const { recalculateReadinessInBackground } = require('./readinessController');
    recalculateReadinessInBackground(req.user.id).catch((err) => console.error('Background readiness recalculation error:', err));

    await cacheService.del(`study_plan:active:${req.user.id}`);

    triggerBackgroundCalendarSync(plan, req.user);

    res.status(200).json({ success: true, data: plan, progression });
  } catch (error) {
    next(error);
  }
};

// @desc    Move a task to a new date (used by the Gantt/timeline drag view)
// @route   PUT /api/study-plans/:planId/tasks/:taskId/date
// @access  Private
exports.moveTaskDate = async (req, res, next) => {
  try {
    const { planId, taskId } = req.params;
    const { newDate } = req.body;

    const plan = await StudyPlan.findOne({ where: { id: planId, user: req.user.id } });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    const planStart = toDateOnlyString(plan.startDate);
    const planEnd = toDateOnlyString(plan.endDate);
    const targetDate = toDateOnlyString(newDate);

    if (targetDate < planStart || targetDate > planEnd) {
      return res.status(400).json({
        success: false,
        error: `Date must be between ${planStart} and ${planEnd}`,
      });
    }

    const dailyGoals = JSON.parse(JSON.stringify(plan.dailyGoals));
    let movedTask = null;

    for (const goal of dailyGoals) {
      const idx = (goal.tasks || []).findIndex((t) => t._id === taskId || t.id === taskId);
      if (idx !== -1) {
        [movedTask] = goal.tasks.splice(idx, 1);
        break;
      }
    }

    if (!movedTask) {
      return res.status(404).json({ success: false, error: 'Task not found in plan' });
    }

    let targetGoal = dailyGoals.find((g) => toDateOnlyString(g.date) === targetDate);
    if (!targetGoal) {
      targetGoal = { date: newDate, tasks: [] };
      dailyGoals.push(targetGoal);
      dailyGoals.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    targetGoal.tasks.push(movedTask);

    plan.dailyGoals = dailyGoals;
    await plan.save();

    await cacheService.del(`study_plan:active:${req.user.id}`);

    triggerBackgroundCalendarSync(plan, req.user);

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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
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

// @desc    Reschedule Overdue Tasks
// @route   POST /api/study-plans/:id/reschedule
// @access  Private
exports.rescheduleOverdueTasks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { useAIRebalance } = req.body;

    const plan = await StudyPlan.findOne({
      where: { id, user: req.user.id },
      include: [{ model: Exam, as: 'examRef' }]
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    const exam = plan.examRef;
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Associated exam not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Plain local-date string (YYYY-MM-DD) immune to timezone drift
    const todayStr = toLocalDateString(new Date());
    const examDate = new Date(exam.date);
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    // Check if AI re-balance should be used (exam < 7 days away)
    const shouldUseAI = useAIRebalance || daysUntilExam < 7;

    if (shouldUseAI) {
      // Use AI to re-balance the entire plan
      const subjects = await Subject.findAll({ where: { exam: plan.exam, user: req.user.id } });
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
          error: 'No subjects and topics found for AI re-balancing',
        });
      }

      // Generate new plan with AI
      const generatedGoals = await geminiService.generateStudyPlan(
        exam.name,
        syllabus,
        todayStr,
        toDateOnlyString(exam.date),
        3, // Default 3 hours per day
        true // Force refresh
      );

      // Format goals for database
      const formattedGoals = [];
      for (const day of generatedGoals) {
        const tasks = [];
        for (const t of day.tasks) {
          let matchedTopic;
          try {
            matchedTopic = await Topic.findOne({
              where: {
                name: { [Op.iLike]: t.topicName.trim() },
                user: req.user.id,
              },
            });
          } catch (dbErr) {
            const userTopics = await Topic.findAll({ where: { user: req.user.id } });
            matchedTopic = userTopics.find((tp) => tp.name.trim().toLowerCase() === t.topicName.trim().toLowerCase());
          }

          tasks.push({
            _id: uuidv4(),
            title: t.title,
            duration: t.duration || 60,
            completed: false,
            topic: matchedTopic ? matchedTopic.id : null,
          });
        }
        formattedGoals.push({
          date: toDateOnlyString(day.date),
          tasks,
        });
      }

      plan.dailyGoals = formattedGoals;
      await plan.save();

      await ActivityLog.create({
        user: req.user.id,
        activityType: 'study_plan_reschedule',
        description: `AI Re-balanced study plan for exam: ${exam.name}`,
      });

      await cacheService.del(`study_plan:active:${req.user.id}`);

      return res.status(200).json({
        success: true,
        data: plan,
        message: 'Study plan re-balanced using AI',
      });
    }

    // Manual rescheduling logic for overdue tasks
    const dailyGoals = JSON.parse(JSON.stringify(plan.dailyGoals));
    const overdueTasks = [];
    const futureGoals = [];

    // Separate overdue incomplete tasks from future goals.
    // Compare plain YYYY-MM-DD strings so the reschedule never drifts a day
    // based on the server/client timezone.
    for (const goal of dailyGoals) {
      const goalDateStr = toDateOnlyString(goal.date);

      if (goalDateStr < todayStr) {
        // This is a past date - collect incomplete tasks
        for (const task of goal.tasks) {
          if (!task.completed) {
            overdueTasks.push(task);
          }
        }
      } else {
        // This is a future date - keep as is
        futureGoals.push(goal);
      }
    }

    if (overdueTasks.length === 0) {
      return res.status(200).json({
        success: true,
        data: plan,
        message: 'No overdue tasks to reschedule',
      });
    }

    // Calculate daily capacity (assuming 3 hours = 180 minutes per day)
    const dailyCapacityMinutes = 180;
    const rescheduledGoals = [];

    // Distribute overdue tasks across future days with capacity
    let taskIndex = 0;
    for (const goal of futureGoals) {
      const currentTotalDuration = goal.tasks.reduce((sum, t) => sum + (t.duration || 60), 0);
      const remainingCapacity = dailyCapacityMinutes - currentTotalDuration;

      if (remainingCapacity > 0 && taskIndex < overdueTasks.length) {
        const tasksToAdd = [];
        let usedCapacity = 0;

        while (taskIndex < overdueTasks.length && usedCapacity < remainingCapacity) {
          const task = overdueTasks[taskIndex];
          const taskDuration = task.duration || 60;

          if (usedCapacity + taskDuration <= remainingCapacity) {
            tasksToAdd.push({ ...task, _id: uuidv4() });
            usedCapacity += taskDuration;
            taskIndex++;
          } else {
            break;
          }
        }

        if (tasksToAdd.length > 0) {
          goal.tasks = [...goal.tasks, ...tasksToAdd];
        }
      }

      rescheduledGoals.push(goal);
    }

    // If there are still tasks left, add them to the last available day
    if (taskIndex < overdueTasks.length) {
      const lastGoal = rescheduledGoals[rescheduledGoals.length - 1];
      if (lastGoal) {
        const remainingTasks = overdueTasks.slice(taskIndex);
        lastGoal.tasks = [
          ...lastGoal.tasks,
          ...remainingTasks.map(t => ({ ...t, _id: uuidv4() }))
        ];
      }
    }

    // Rebuild dailyGoals with today's date onwards
    const todayGoals = dailyGoals.filter((g) => toDateOnlyString(g.date) >= todayStr);

    plan.dailyGoals = [...todayGoals, ...rescheduledGoals];
    await plan.save();

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'study_plan_reschedule',
      description: `Rescheduled ${overdueTasks.length} overdue tasks for exam: ${exam.name}`,
    });

    await cacheService.del(`study_plan:active:${req.user.id}`);

    res.status(200).json({
      success: true,
      data: plan,
      message: `Successfully rescheduled ${overdueTasks.length} overdue tasks`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI Weakness Detection Analysis
// @route   GET /api/study-plans/weakness-analysis
// @access  Private
exports.getWeaknessAnalysis = async (req, res, next) => {
  try {
    const weaknessAggregatorService = require('../services/weaknessAggregatorService');
    const result = await weaknessAggregatorService.getLLMWeaknessAnalysis(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule active study plan based on AI weakness detection
// @route   POST /api/study-plans/reschedule-adaptive
// @access  Private
exports.rescheduleAdaptivePlan = async (req, res, next) => {
  try {
    const weaknessAggregatorService = require('../services/weaknessAggregatorService');
    const result = await weaknessAggregatorService.rescheduleAdaptivePlanner(req.user.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'No active study plan found to reschedule' });
    }

    await cacheService.del(`study_plan:active:${req.user.id}`);

    triggerBackgroundCalendarSync(result, req.user);

    res.status(200).json({ success: true, data: result, message: 'Adaptive study plan rescheduled successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Study Plan as RFC 5545 .ics calendar file
// @route   GET /api/study-plans/:id/export-ics
// @access  Private
exports.exportStudyPlanIcs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const plan = await StudyPlan.findOne({
      where: { id, user: req.user.id },
      include: [{ model: Exam, as: 'examRef' }],
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Study plan not found',
      });
    }

    const timeZone = req.headers['x-timezone'] || 'UTC';

    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timezone supplied',
      });
    }

    const icsContent = calendarService.generateStudyPlanIcs(
      plan,
      timeZone
    );

    res.setHeader(
      'Content-Type',
      'text/calendar; charset=utf-8'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="study-plan-${id}.ics"`
    );

    return res.status(200).send(icsContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Predict syllabus completion date and evenly rebalance pending tasks
//          across the remaining study days
// @route   POST /api/study-plans/rebalance
// @access  Private
exports.rebalanceStudyPlan = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const filter = { user: req.user.id, status: 'active' };
    if (examId) filter.exam = examId;

    const plan = await StudyPlan.findOne({ where: filter, include: [{ model: Exam, as: 'examRef' }] });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'No active study plan found' });
    }

    const exam = plan.examRef;
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Associated exam not found' });
    }

    const referenceDateStr = toLocalDateString(new Date());
    const examDateStr = toDateOnlyString(exam.date);

    // Fold in recent quiz accuracy (last 14 days) so a slipping quiz score
    // pulls the projected pace down even if tasks are still being checked off.
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - schedulePredictorService.DEFAULT_VELOCITY_WINDOW_DAYS);
    const recentAttempts = await QuizAttempt.findAll({
      where: { user: req.user.id, createdAt: { [Op.gte]: windowStart } },
    });
    const quizAccuracy = recentAttempts.length
      ? recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / recentAttempts.length / 100
      : null;

    const forecast = schedulePredictorService.getCompletionForecast({
      dailyGoals: plan.dailyGoals,
      referenceDateStr,
      examDateStr,
      quizAccuracy,
    });

    const { dailyGoals, remainingDays, pendingTaskCount, rebalanced, reason } =
      schedulePredictorService.rebalanceScheduleEvenly({
        dailyGoals: plan.dailyGoals,
        referenceDateStr,
        examDateStr,
      });

    if (rebalanced) {
      plan.dailyGoals = dailyGoals;
      await plan.save();

      await ActivityLog.create({
        user: req.user.id,
        activityType: 'study_plan_reschedule',
        description: `Rebalanced ${pendingTaskCount} pending task(s) across ${remainingDays} remaining day(s) for exam: ${exam.name}`,
      });
    }

    let message = 'No pending tasks to rebalance';
    if (rebalanced) {
      message = `Rebalanced ${pendingTaskCount} pending task(s) across ${remainingDays} remaining day(s)`;
    } else if (reason === 'NO_DAYS_REMAINING') {
      message = 'No study days remain before the exam date';
    }

    await cacheService.del(`study_plan:active:${req.user.id}`);

    triggerBackgroundCalendarSync(plan, req.user);

    res.status(200).json({ success: true, data: plan, forecast, rebalanced, reason, message });
  } catch (error) {
    next(error);
  }
};

// @desc    Export active study plan as a downloadable PDF
// @route   GET /api/study-plans/:id/export-pdf
// @access  Private
exports.exportStudyPlanPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Load plan and verify ownership in one query — prevents cross-user leaks
    const plan = await StudyPlan.findOne({
      where: { id, user: req.user.id },
      include: [{ model: Exam, as: 'examRef' }],
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }

    // Resolve topic names for tasks that reference a topic ID
    const topicIds = new Set();
    (plan.dailyGoals || []).forEach((goal) => {
      (goal.tasks || []).forEach((task) => {
        if (task.topic && typeof task.topic === 'string') topicIds.add(task.topic);
      });
    });

    const topicMap = {};
    if (topicIds.size > 0) {
      const topics = await Topic.findAll({
        where: { id: { [Op.in]: Array.from(topicIds) }, user: req.user.id },
      });
      topics.forEach((t) => { topicMap[t.id] = t.name; });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `openprep-studyplan-${dateStr}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fillColor('#1a365d').fontSize(22).text('OpenPrep AI — Study Plan', { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor('#4a5568').fontSize(11)
      .text(`Student: ${req.user.name || 'Scholar'}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.moveDown(0.8);

    // ── Exam Info ────────────────────────────────────────────────────────────
    doc.fillColor('#2b6cb0').fontSize(14).text('Exam Details', { underline: true });
    doc.moveDown(0.3);
    doc.fillColor('#2d3748').fontSize(10);
    const exam = plan.examRef;
    doc.text(`• Exam: ${exam ? exam.name : 'N/A'}`);
    doc.text(`• Plan Start: ${plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'N/A'}`);
    doc.text(`• Exam Date: ${exam?.date ? new Date(exam.date).toLocaleDateString() : 'N/A'}`);
    doc.text(`• Status: ${plan.status}`);
    doc.moveDown(1);

    // ── Progress Summary ─────────────────────────────────────────────────────
    const allTasks = (plan.dailyGoals || []).flatMap((g) => g.tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    doc.fillColor('#2b6cb0').fontSize(14).text('Progress Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fillColor('#2d3748').fontSize(10);
    doc.text(`• Total Tasks: ${totalTasks}`);
    doc.text(`• Completed: ${completedTasks}`);
    doc.text(`• Pending: ${totalTasks - completedTasks}`);
    doc.text(`• Completion: ${progressPct}%`);
    doc.moveDown(1);

    // ── Daily Task Sections ──────────────────────────────────────────────────
    doc.fillColor('#2b6cb0').fontSize(14).text('Daily Study Schedule', { underline: true });
    doc.moveDown(0.5);

    const sortedGoals = [...(plan.dailyGoals || [])].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    for (const goal of sortedGoals) {
      const dayTasks = goal.tasks || [];
      if (dayTasks.length === 0) continue;

      if (doc.y > 700) doc.addPage();

      const dayLabel = goal.date
        ? new Date(goal.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown Date';

      doc.fillColor('#1a202c').fontSize(11).font('Helvetica-Bold').text(dayLabel);
      doc.font('Helvetica').fontSize(9).fillColor('#4a5568');

      for (const task of dayTasks) {
        if (doc.y > 720) doc.addPage();
        const status = task.completed ? '✓' : '○';
        const topicName = task.topic
          ? (typeof task.topic === 'object' ? task.topic.name : (topicMap[task.topic] || task.topic))
          : null;
        const durationLabel = task.duration ? ` (${task.duration} min)` : '';
        const topicLabel = topicName ? ` — ${topicName}` : '';
        doc.fillColor(task.completed ? '#276749' : '#4a5568');
        doc.text(`  ${status} ${task.title}${topicLabel}${durationLabel}`);
      }
      doc.moveDown(0.6);
    }

    doc.moveDown(1.5);
    doc.fillColor('#718096').fontSize(8).text('Generated by OpenPrep AI Learning Platform', { align: 'center' });
    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Generates a new study plan based on user constraints using the studyPlanService.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.createStudyPlan = async (req, res, next) => {
  try {
    const { examDate, topics, dailyHours } = req.body;

    if (!examDate || !Array.isArray(topics) || topics.length === 0 || !dailyHours) {
      return res.status(400).json({
        success: false,
        message: 'examDate, topics (array), and dailyHours are required.'
      });
    }

    if (new Date(examDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Exam date must be in the future.'
      });
    }

    const plan = await studyPlanService.generateStudyPlan(examDate, topics, dailyHours);

    // Save plan to database associated with req.user.id
    // TODO: Implement actual save logic when StudyPlan model integration is ready

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error creating study plan:', error);
    next(error);
  }
};

/**
 * Retrieves a user's saved study plan.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.getStudyPlan = async (req, res, next) => {
  try {
    // TODO: Implement actual retrieval logic when StudyPlan model integration is ready
    // For now, return mock response for demonstration
    res.status(200).json({
      success: true,
      data: {
        totalDays: 0,
        schedule: [],
        overallStrategy: "No plan found. Please generate a new one."
      }
    });
  } catch (error) {
    console.error('Error fetching study plan:', error);
    next(error);
  }
};

// @desc    Get daily burndown chart datapoints and projected completion
// @route   GET /api/study-plans/:id/burndown
// @access  Private
exports.getBurndown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { calculateBurndownData } = require('../services/readinessScoreService');
    const data = await calculateBurndownData(id, req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Get AI Exam Readiness Score & actionable recovery recommendations
// @route   GET /api/study-plans/:id/readiness-score
// @access  Private
exports.getReadinessScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { calculateReadinessScore } = require('../services/readinessScoreService');
    const data = await calculateReadinessScore(id, req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

