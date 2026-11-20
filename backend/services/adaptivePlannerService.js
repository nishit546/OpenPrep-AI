const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const StudyPlan = require('../models/StudyPlan');
const Topic = require('../models/Topic');
const Subject = require('../models/Subject');
const geminiService = require('./geminiService');

/**
 * Adaptive Study Planner Engine
 * Dynamically reschedules study tasks based on weakness detection results,
 * exam proximity, topic weightage, and improvement velocity.
 */

/**
 * Analyze the current plan and weakness data to compute adaptive adjustments.
 */
exports.computeAdaptiveAdjustments = async (userId, planId, lockedPlan = null) => {
  const plan = lockedPlan || (planId
    ? await StudyPlan.findOne({ where: { id: planId, user: userId, status: 'active' } })
    : await StudyPlan.findOne({ where: { user: userId, status: 'active' } }));

  if (!plan) return { plan: null, adjustments: [], summary: null };

  // Get weakness profile for the user
  const topics = await Topic.findAll({ where: { user: userId }, attributes: ['id', 'name', 'subject', 'status', 'weightage'] });
  // Compute topic scores
  const topicScores = {};
  for (const topic of topics) {
    topicScores[topic.id] = { name: topic.name, status: topic.status, weightage: topic.weightage || 0, score: 0, attempts: 0 };
  }

  // Classify and compute
  const now = new Date();
  const dailyGoals = JSON.parse(JSON.stringify(plan.dailyGoals || []));
  const adjustments = [];
  let totalBoosted = 0;
  let totalReduced = 0;
  const infeasibleDays = [];
  const today = now.toISOString().slice(0, 10);

  for (const goal of dailyGoals) {
    if (!Array.isArray(goal.tasks)) continue;

    const baseline = goal.tasks.map((task) => {
      const previousMultiplier = Number(task.adaptiveMultiplier);
      const inferred = previousMultiplier > 0 ? Math.round(Number(task.duration) / previousMultiplier) : Number(task.duration);
      return Math.max(1, Number(task.baseDuration) || inferred || 60);
    });
    const capacity = Number(goal.dailyCapacityMinutes) > 0
      ? Number(goal.dailyCapacityMinutes) : baseline.reduce((sum, minutes) => sum + minutes, 0);

    for (const [index, task] of goal.tasks.entries()) {
      if (task.completed || goal.date < today) continue;
      const topicId = task.topic;
      const topicData = topicScores[topicId];

      if (!topicData) continue;

      // Check days until this task's date
      const taskDate = new Date(goal.date);
      const daysUntilTask = Math.ceil((taskDate - now) / (1000 * 60 * 60 * 24));

      // Adaptive logic
      const isWeak = topicData.status === 'Weak';
      const isStrong = topicData.status === 'Strong';
      const isHighWeight = topicData.weightage > 5;
      const isUrgent = daysUntilTask <= 3;

      let multiplier = 1;
      let reason = '';

      if (isWeak && isHighWeight) {
        multiplier = 1.75; // 75% boost for weak + high weight
        reason = 'Weak topic with high exam weightage — significant time boost';
        totalBoosted++;
      } else if (isWeak) {
        multiplier = 1.5; // 50% boost for weak
        reason = 'Weak topic — increased study time';
        totalBoosted++;
      } else if (isStrong && !isHighWeight) {
        multiplier = 0.6; // 40% reduction for strong + low weight
        reason = 'Strong topic with low weightage — reduced time to focus elsewhere';
        totalReduced++;
      } else if (isStrong) {
        multiplier = 0.75; // 25% reduction for strong
        reason = 'Strong topic — slight time reduction';
        totalReduced++;
      }

      if (isUrgent && isWeak) {
        multiplier = Math.max(multiplier, 2.0); // Double time for urgent weak topics
        reason = 'URGENT: Weak topic near deadline — maximum time allocation';
      }

      if (multiplier !== 1) {
        const originalDuration = baseline[index];
        const newDuration = Math.round(originalDuration * multiplier);

        task.baseDuration = originalDuration;
        task.duration = newDuration;
        task.adaptiveMultiplier = multiplier;
        task.adaptiveReason = reason;
        task.isWeaknessBoosted = multiplier > 1;

        adjustments.push({
          topicName: topicData.name,
          originalDuration,
          newDuration,
          multiplier,
          reason,
          status: topicData.status,
          weightage: topicData.weightage,
          daysUntilTask,
          date: goal.date,
          taskIndex: index,
        });
      } else if (task.adaptiveMultiplier) {
        task.baseDuration = baseline[index];
        task.duration = baseline[index];
        delete task.adaptiveMultiplier;
        delete task.adaptiveReason;
        task.isWeaknessBoosted = false;
      }
    }
    if (goal.date >= today) {
      const fixed = goal.tasks.reduce((sum, task) => sum + (task.completed ? Number(task.duration) || 0 : 0), 0);
      const mutable = goal.tasks.filter((task) => !task.completed);
      if (fixed + mutable.length > capacity) {
        infeasibleDays.push({ date: goal.date, capacity, requiredMinimum: fixed + mutable.length });
      } else {
        const desired = mutable.reduce((sum, task) => sum + (Number(task.duration) || 0), 0);
        if (desired + fixed > capacity) {
          const budget = capacity - fixed;
          let remaining = budget;
          mutable.forEach((task, index) => {
            const allocated = index === mutable.length - 1
              ? remaining : Math.max(1, Math.floor((Number(task.duration) || 0) * budget / desired));
            task.duration = allocated;
            remaining -= allocated;
          });
        }
      }
    }
  }

  for (const adjustment of adjustments) {
    const task = dailyGoals.find((goal) => goal.date === adjustment.date)
      .tasks[adjustment.taskIndex];
    adjustment.newDuration = task.duration;
    adjustment.multiplier = task.duration / adjustment.originalDuration;
    task.adaptiveMultiplier = adjustment.multiplier;
    task.isWeaknessBoosted = adjustment.multiplier > 1;
  }

  // Compute plan summary
  const totalDays = dailyGoals.length;
  const totalTasks = dailyGoals.reduce((sum, g) => sum + (g.tasks?.length || 0), 0);
  const boostedTasks = dailyGoals.reduce((sum, g) => sum + (g.tasks?.filter((t) => t.isWeaknessBoosted).length || 0), 0);

  // Calculate days remaining
  const endDate = new Date(plan.endDate);
  const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

  // Weak topic coverage: how many days have weak topics scheduled
  const weakTopicIds = new Set(topics.filter((t) => t.status === 'Weak').map((t) => t.id));
  const daysWithWeakTopics = dailyGoals.filter((g) =>
    g.tasks?.some((t) => weakTopicIds.has(t.topic))
  ).length;

  const summary = {
    planId: plan.id,
    totalDays,
    totalTasks,
    daysRemaining,
    adjustmentsCount: adjustments.length,
    boostedTasks,
    reducedTasks: totalReduced,
    daysWithWeakTopics,
    weakTopicCount: topics.filter((t) => t.status === 'Weak').length,
    strongTopicCount: topics.filter((t) => t.status === 'Strong').length,
    startDate: plan.startDate,
    endDate: plan.endDate,
  };

  return { plan: { ...(plan.toJSON ? plan.toJSON() : plan), dailyGoals }, adjustments, summary, infeasibleDays };
};

exports.applyAdaptiveAdjustments = async (userId, planId, expectedUpdatedAt) => {
  if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
    const error = new Error('Refresh the adjustment preview before applying it');
    error.code = 'STALE_PLAN';
    throw error;
  }
  return sequelize.transaction(async (transaction) => {
    const plan = await StudyPlan.findOne({
      where: { id: planId, user: userId, status: 'active' }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!plan) return { plan: null };
    if (new Date(plan.updatedAt).toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
      const error = new Error('The study plan changed. Refresh the preview and try again');
      error.code = 'STALE_PLAN';
      throw error;
    }
    const preview = await exports.computeAdaptiveAdjustments(userId, planId, plan);
    if (preview.infeasibleDays.length) {
      const error = new Error('The adjusted schedule exceeds available study time');
      error.code = 'CAPACITY_EXCEEDED';
      error.details = preview.infeasibleDays;
      throw error;
    }
    plan.dailyGoals = preview.plan.dailyGoals;
    plan.currentVersionNumber = (plan.currentVersionNumber || 1) + 1;
    await plan.save({ transaction });
    return { ...preview, plan };
  });
};

/**
 * Generate a new adaptive plan using AI, incorporating weakness data.
 */
exports.generateAdaptivePlan = async (userId, examDate, dailyHours, subjectIds = []) => {
  // Gather weakness data
  const topics = await Topic.findAll({
    where: { user: userId, ...(subjectIds.length > 0 ? { subject: { [Op.in]: subjectIds } } : {}) },
    attributes: ['id', 'name', 'subject', 'status', 'weightage'],
  });

  const subjects = await Subject.findAll({
    where: { user: userId, ...(subjectIds.length > 0 ? { id: { [Op.in]: subjectIds } } : {}) },
    attributes: ['id', 'name'],
  });

  // Build weakness profile for AI
  const weaknessProfile = topics.map((t) => ({
    name: t.name,
    subject: subjects.find((s) => s.id === t.subject)?.name || 'General',
    status: t.status,
    weightage: t.weightage,
  }));

  const weakTopics = weaknessProfile.filter((t) => t.status === 'Weak');
  const strongTopics = weaknessProfile.filter((t) => t.status === 'Strong');

  const now = new Date();
  const daysUntilExam = Math.max(1, Math.ceil((new Date(examDate) - now) / (1000 * 60 * 60 * 24)));

  try {
    const prompt = `You are an expert adaptive study planner. Create a day-by-day study plan that PRIORITIZES weak topics.

EXAM DATE: ${examDate}
DAILY HOURS: ${dailyHours}
DAYS UNTIL EXAM: ${daysUntilExam}

WEAK TOPICS (MUST GET MORE TIME):
${weakTopics.length > 0 ? weakTopics.map((t) => `- ${t.name} (${t.subject}, weightage: ${t.weightage}%)`).join('\n') : 'None identified yet'}

STRONG TOPICS (can reduce time):
${strongTopics.length > 0 ? strongTopics.map((t) => `- ${t.name} (${t.subject}, weightage: ${t.weightage}%)`).join('\n') : 'None identified yet'}

ALL TOPICS:
${weaknessProfile.map((t) => `- ${t.name} (${t.subject}, status: ${t.status}, weightage: ${t.weightage}%)`).join('\n')}

RULES:
1. Weak topics get 50-100% MORE time than normal
2. Strong topics get 25-40% LESS time
3. High-weightage weak topics get DOUBLE time
4. Schedule weak topics earlier in the plan for maximum impact
5. Include review days for previously weak topics
6. Total daily hours must not exceed ${dailyHours}

Return STRICT JSON:
{
  "totalDays": number,
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "tasks": [
        {
          "topic": "topic name",
          "subject": "subject name",
          "duration": number (minutes),
          "type": "learn" | "practice" | "review" | "quiz",
          "priority": "high" | "medium" | "low",
          "isWeaknessBoosted": boolean,
          "notes": "string"
        }
      ],
      "dailyFocus": "string"
    }
  ],
  "strategy": "string"
}`;

    const result = await geminiService.generateContent(prompt);
    let parsed;
    if (typeof result === 'string') {
      parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
    } else {
      parsed = result;
    }

    // Map topic names to IDs
    const topicNameToId = {};
    topics.forEach((t) => { topicNameToId[t.name.toLowerCase()] = t.id; });

    // Transform to match StudyPlan dailyGoals format
    const dailyGoals = (parsed.schedule || []).map((day) => ({
      date: day.date,
      tasks: (day.tasks || []).map((task) => ({
        title: task.topic,
        topic: topicNameToId[task.topic?.toLowerCase()] || null,
        subject: task.subject,
        duration: task.duration,
        type: task.type,
        priority: task.priority,
        isWeaknessBoosted: task.isWeaknessBoosted || false,
        notes: task.notes,
      })),
      dailyFocus: day.dailyFocus,
    }));

    return {
      dailyGoals,
      totalDays: parsed.totalDays,
      strategy: parsed.strategy,
    };
  } catch (error) {
    console.error('Error generating adaptive plan:', error);
    // Fallback: simple distribution
    return generateFallbackPlan(weaknessProfile, daysUntilExam, dailyHours);
  }
};

/**
 * Fallback plan when AI is unavailable — distributes topics evenly
 * with weight-based time allocation.
 */
function generateFallbackPlan(topics, days, dailyHours) {
  const dailyMinutes = dailyHours * 60;
  const tasksPerDay = Math.ceil(topics.length / days);
  const dailyGoals = [];

  for (let i = 0; i < days; i++) {
    const startIdx = i * tasksPerDay;
    const dayTopics = topics.slice(startIdx, startIdx + tasksPerDay);

    dailyGoals.push({
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
      tasks: dayTopics.map((t) => ({
        title: t.name,
        subject: t.subject,
        duration: Math.round(dailyMinutes / dayTopics.length),
        type: t.status === 'Weak' ? 'practice' : 'review',
        priority: t.status === 'Weak' ? 'high' : 'medium',
        isWeaknessBoosted: t.status === 'Weak',
      })),
      dailyFocus: dayTopics.some((t) => t.status === 'Weak') ? 'Weak topic focus' : 'Review & practice',
    });
  }

  return { dailyGoals, totalDays: days, strategy: 'Even distribution with weakness-based time allocation' };
}

/**
 * Get today's adaptive tasks — highlights which tasks need extra focus today.
 */
exports.getTodayTasks = async (userId) => {
  const plan = await StudyPlan.findOne({ where: { user: userId, status: 'active' } });
  if (!plan) return { tasks: [], summary: null };

  const today = new Date().toISOString().split('T')[0];
  const dailyGoals = plan.dailyGoals || [];
  const todayGoal = dailyGoals.find((g) => g.date === today);

  if (!todayGoal) {
    // Find closest future day
    const futureGoals = dailyGoals.filter((g) => g.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return {
      tasks: futureGoals[0]?.tasks || [],
      summary: {
        message: `No tasks scheduled for today. Next study day: ${futureGoals[0]?.date || 'N/A'}`,
        nextDate: futureGoals[0]?.date,
      },
    };
  }

  const boostedCount = todayGoal.tasks.filter((t) => t.isWeaknessBoosted).length;
  const totalTime = todayGoal.tasks.reduce((sum, t) => sum + (t.duration || 0), 0);

  return {
    tasks: todayGoal.tasks,
    summary: {
      date: today,
      totalTasks: todayGoal.tasks.length,
      totalTime,
      boostedCount,
      focus: todayGoal.dailyFocus,
    },
  };
};

/**
 * Get plan adherence stats — how well the user is following the plan.
 */
exports.getPlanStats = async (userId) => {
  const plan = await StudyPlan.findOne({ where: { user: userId, status: 'active' } });
  if (!plan) return null;

  const now = new Date();
  const dailyGoals = plan.dailyGoals || [];
  const totalDays = dailyGoals.length;
  const totalTasks = dailyGoals.reduce((sum, g) => sum + (g.tasks?.length || 0), 0);
  const boostedTasks = dailyGoals.reduce((sum, g) => sum + (g.tasks?.filter((t) => t.isWeaknessBoosted).length || 0), 0);

  const daysRemaining = Math.max(0, Math.ceil((new Date(plan.endDate) - now) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.ceil((now - new Date(plan.startDate)) / (1000 * 60 * 60 * 24)));
  const progress = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;

  return {
    planId: plan.id,
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalDays,
    totalTasks,
    boostedTasks,
    daysRemaining,
    daysElapsed,
    progress,
  };
};
