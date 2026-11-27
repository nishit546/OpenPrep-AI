const { v4: uuidv4 } = require('uuid');

const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);

function normalizeGeneratedPlan(generated, { examDate, dailyHours, now = new Date() }) {
  if (!generated || !Array.isArray(generated.schedule) || generated.schedule.length === 0) {
    throw new Error('The planner returned an empty schedule. No plan was saved.');
  }

  const today = dateOnly(now);
  const deadline = dateOnly(examDate);
  const seen = new Set();
  const dailyGoals = generated.schedule.map((day) => {
    const dayDate = typeof day?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date)
      ? day.date : null;
    const hours = Number(day?.estimatedHours);
    if (!dayDate || !Number.isFinite(new Date(`${dayDate}T00:00:00Z`).getTime()) ||
        dateOnly(`${dayDate}T00:00:00Z`) !== dayDate ||
        dayDate < today || dayDate > deadline || seen.has(dayDate) ||
        !Array.isArray(day.topics) || day.topics.length === 0 ||
        !Number.isFinite(hours) || hours <= 0 || hours > dailyHours) {
      throw new Error('The planner returned an invalid schedule. No plan was saved.');
    }
    const topics = day.topics.map((topic) => typeof topic === 'string' ? topic.trim() : '');
    if (topics.some((topic) => !topic || topic.length > 200)) {
      throw new Error('The planner returned an invalid topic. No plan was saved.');
    }
    seen.add(dayDate);
    const minutes = Math.round((hours * 60) / topics.length);
    return {
      date: dayDate,
      focusArea: typeof day.focusArea === 'string' ? day.focusArea : '',
      notes: typeof day.notes === 'string' ? day.notes : '',
      tasks: topics.map((title) => ({
        _id: uuidv4(), title, duration: minutes, completed: false, topic: null,
      })),
    };
  });

  dailyGoals.sort((a, b) => a.date.localeCompare(b.date));
  return dailyGoals;
}

function serializeRootPlan(plan) {
  if (!plan) return null;
  const goals = Array.isArray(plan.dailyGoals) ? plan.dailyGoals : [];
  return {
    id: plan.id,
    examId: plan.exam,
    startDate: plan.startDate,
    endDate: plan.endDate,
    status: plan.status,
    totalDays: goals.length,
    schedule: goals.map((goal) => ({
      date: dateOnly(goal.date),
      topics: (goal.tasks || []).map((task) => task.title),
      estimatedHours: Math.round((goal.tasks || []).reduce((sum, task) => sum + (Number(task.duration) || 0), 0) / 60 * 100) / 100,
      focusArea: goal.focusArea || '',
      notes: goal.notes || '',
    })),
    overallStrategy: plan.overallStrategy || '',
  };
}

module.exports = { normalizeGeneratedPlan, serializeRootPlan };
