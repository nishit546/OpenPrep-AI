const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value) => Math.max(0, Math.min(100, value));

/**
 * Forecast only the quiz component of the readiness index. The other measured
 * components remain at their current values until new evidence is available.
 */
function buildReadinessForecast({ currentReadiness, attempts = [], examDate, now = new Date() }) {
  const today = new Date(now);
  const exam = examDate ? new Date(examDate) : null;
  const baseline = clamp(Number(currentReadiness) || 0);
  const empty = (reason) => ({
    mode: 'insufficient-data',
    reason,
    confidence: 'unavailable',
    trajectory: [],
  });

  if (!exam || !Number.isFinite(exam.getTime()) || exam <= today) {
    return empty('A future exam date is required for a forecast.');
  }

  const observations = attempts
    .filter((attempt) => Number(attempt.totalQuestions) > 0)
    .map((attempt) => ({
      time: new Date(attempt.createdAt).getTime(),
      accuracy: Number(attempt.score), // QuizAttempt.score is already a percentage.
    }))
    .filter(({ time, accuracy }) =>
      Number.isFinite(time) && time <= today.getTime() &&
      Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100
    )
    .sort((a, b) => a.time - b.time);

  if (observations.length < 3 || observations.at(-1).time - observations[0].time < DAY_MS) {
    return empty('Complete at least three quizzes across two days to estimate a trend.');
  }

  // Use recent evidence so an old practice streak cannot dominate a new plan.
  const recent = observations.filter(({ time }) => time >= today.getTime() - 30 * DAY_MS);
  if (recent.length < 3 || recent.at(-1).time - recent[0].time < DAY_MS) {
    return empty('Complete at least three recent quizzes across two days to estimate a trend.');
  }

  const origin = recent[0].time;
  const points = recent.map(({ time, accuracy }) => ({ x: (time - origin) / DAY_MS, y: accuracy }));
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const covariance = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const variance = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const quizSlope = variance ? covariance / variance : 0;
  // Quiz accuracy has a 30% weight in the readiness index. Bound extrapolation
  // further because measured practice improvement is not a daily guarantee.
  const readinessSlope = Math.max(-1.5, Math.min(1.5, quizSlope)) * 0.3;
  const daysToExam = Math.ceil((exam.getTime() - today.getTime()) / DAY_MS);
  const offsets = new Set([0, daysToExam]);
  for (let i = 1; i < 6; i++) offsets.add(Math.round((daysToExam * i) / 6));

  const trajectory = [...offsets].sort((a, b) => a - b).map((dayOffset) => {
    const date = dayOffset === daysToExam ? exam : new Date(today.getTime() + dayOffset * DAY_MS);
    const remainingRoom = readinessSlope >= 0 ? (100 - baseline) / 100 : baseline / 100;
    return {
      day: `Day ${dayOffset}`,
      date: date.toISOString().slice(0, 10),
      score: Math.round(clamp(baseline + readinessSlope * dayOffset * remainingRoom)),
    };
  });

  return {
    mode: 'observed-trend',
    confidence: recent.length >= 5 && recent.at(-1).time - origin >= 7 * DAY_MS ? 'moderate' : 'low',
    basis: 'Recent quiz accuracy trend; other readiness components held constant.',
    observationCount: recent.length,
    trajectory,
  };
}

module.exports = { buildReadinessForecast };
