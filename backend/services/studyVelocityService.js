/**
 * Computes study metrics, velocity vectors, milestone target balances and a
 * burnout risk score. All day maths is done in whole UTC days so results do
 * not shift around midnight in the server's local timezone.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VELOCITY_WINDOW_DAYS = 14;
const HEAVY_DAY_HOURS = 8.5;

/** Whole UTC day index (days since epoch) for a date-like value. */
function utcDayIndex(value) {
  return Math.floor(new Date(value).getTime() / MS_PER_DAY);
}

/** Whole days from `now` to `examDate` in UTC, never less than 1. */
function getDaysRemaining(examDate, now = new Date()) {
  if (!examDate || Number.isNaN(new Date(examDate).getTime())) return 1;
  return Math.max(1, utcDayIndex(examDate) - utcDayIndex(now));
}

/** Hours for a session; accepts durationHours or the model's durationMinutes. */
function sessionHours(session) {
  if (Number.isFinite(session.durationHours)) return session.durationHours;
  if (Number.isFinite(session.durationMinutes)) return session.durationMinutes / 60;
  return 0;
}

function sessionTime(session) {
  return session.timestamp || session.createdAt;
}

/** Total study hours per UTC day index for the given sessions. */
function groupHoursByDay(sessions) {
  const byDay = new Map();
  for (const s of sessions) {
    const t = sessionTime(s);
    if (!t || Number.isNaN(new Date(t).getTime())) continue;
    const day = utcDayIndex(t);
    byDay.set(day, (byDay.get(day) || 0) + sessionHours(s));
  }
  return byDay;
}

/**
 * Computes study metrics, velocity vectors, and milestone target balances.
 */
function calculateVelocitySummary(loggedSessions, incompleteTopics, daysRemaining, now = new Date()) {
  // 1. Calculate historical 14-day study velocity
  const windowStart = (utcDayIndex(now) - (VELOCITY_WINDOW_DAYS - 1)) * MS_PER_DAY;

  const relevantSessions = (loggedSessions || []).filter((session) => {
    const t = sessionTime(session);
    return t && new Date(t).getTime() >= windowStart;
  });
  const totalHoursLogged = relevantSessions.reduce((sum, s) => sum + sessionHours(s), 0);
  const currentVelocity = parseFloat((totalHoursLogged / VELOCITY_WINDOW_DAYS).toFixed(2));

  // 2. Aggregate remaining work bounds based on estimated topic durations and weights
  const totalRemainingSyllabusHours = (incompleteTopics || []).reduce((sum, topic) => {
    const baseDuration = Number.isFinite(topic.estimatedBaseHours) ? topic.estimatedBaseHours : 10;
    const difficultyMultiplier = topic.difficultyRating >= 4 ? 1.5 : 1.0;
    return sum + baseDuration * difficultyMultiplier;
  }, 0);

  // 3. Compute target execution rate needed to finish before the milestone date
  const days = Math.max(Math.floor(daysRemaining) || 1, 1);
  const rawRequired = totalRemainingSyllabusHours / days;
  const requiredVelocity =
    totalRemainingSyllabusHours === 0 ? 0 : parseFloat(Math.max(rawRequired, 0.5).toFixed(2));

  return {
    currentVelocity,
    requiredVelocity,
    remainingSyllabusHours: totalRemainingSyllabusHours,
    daysRemaining: days,
  };
}

/** Consecutive most recent days above the heavy-day threshold with no rest day. */
function countHeavyStreak(loggedSessions, now = new Date()) {
  const byDay = groupHoursByDay(loggedSessions || []);
  let day = utcDayIndex(now);
  // A day that has not started yet (no hours) should not break the streak.
  if (!byDay.get(day)) day -= 1;
  let streak = 0;
  while ((byDay.get(day) || 0) > HEAVY_DAY_HOURS) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

/**
 * Drop in average quiz accuracy (percentage points) between the previous 7 days
 * and the latest 7 days. Returns 0 when either window has no attempts.
 */
function calculateAccuracyDrop(quizAttempts, now = new Date()) {
  const today = utcDayIndex(now);
  const pct = (a) => (a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0);
  const recent = [];
  const previous = [];
  for (const a of quizAttempts || []) {
    const age = today - utcDayIndex(a.createdAt);
    if (age >= 0 && age < 7) recent.push(pct(a));
    else if (age >= 7 && age < 14) previous.push(pct(a));
  }
  if (!recent.length || !previous.length) return 0;
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.max(0, avg(previous) - avg(recent));
}

/**
 * Burnout risk 0-100 from three signals:
 *  - workload pressure: required hours/day (0 at 4h or less, 40 at 12h or more)
 *  - heavy streak: days in a row above 8.5h with no rest day (40 at 5 days)
 *  - falling quiz accuracy: week over week drop (20 at 20 points or more)
 */
function calculateBurnoutRisk({ requiredVelocity = 0, heavyStreakDays = 0, accuracyDrop = 0 }) {
  const load = Math.min(Math.max((requiredVelocity - 4) / 8, 0), 1) * 40;
  const streak = (Math.min(heavyStreakDays, 5) / 5) * 40;
  const accuracy = (Math.min(Math.max(accuracyDrop, 0), 20) / 20) * 20;
  const score = Math.round(Math.min(100, Math.max(0, load + streak + accuracy)));

  const level = score >= 65 ? 'high' : score >= 35 ? 'moderate' : 'low';
  const tips = [];
  if (heavyStreakDays >= 3) {
    tips.push('Take a full rest day: you have studied more than 8.5 hours several days in a row.');
  }
  if (heavyStreakDays >= 1 || requiredVelocity > HEAVY_DAY_HOURS) {
    tips.push('Add a buffer day every 6 days to absorb slips without extending study hours.');
  }
  if (requiredVelocity > HEAVY_DAY_HOURS) {
    tips.push('The required pace is above 8.5 hours a day. Cut low-priority topics or move the target date.');
  }
  if (accuracyDrop >= 5) {
    tips.push('Quiz accuracy fell this week. Shorten sessions and add sleep before adding more hours.');
  }
  if (!tips.length) tips.push('Your pace is sustainable. Keep a rest day each week.');

  return { burnoutRisk: score, burnoutLevel: level, tips };
}

/** Full payload for the velocity endpoint. */
function buildVelocityMetrics({ sessions, tasks, quizAttempts, examDate, now = new Date() }) {
  const daysRemaining = getDaysRemaining(examDate, now);
  const topics = (tasks || []).map((t) => ({ estimatedBaseHours: t.estimatedHours, difficultyRating: 0 }));
  const summary = calculateVelocitySummary(sessions, topics, daysRemaining, now);
  const heavyStreakDays = countHeavyStreak(sessions, now);
  const accuracyDrop = calculateAccuracyDrop(quizAttempts, now);
  const risk = calculateBurnoutRisk({
    requiredVelocity: summary.requiredVelocity,
    heavyStreakDays,
    accuracyDrop,
  });
  return { ...summary, heavyStreakDays, accuracyDrop: parseFloat(accuracyDrop.toFixed(1)), ...risk };
}

module.exports = {
  calculateVelocitySummary,
  calculateBurnoutRisk,
  countHeavyStreak,
  calculateAccuracyDrop,
  getDaysRemaining,
  buildVelocityMetrics,
  HEAVY_DAY_HOURS,
};
