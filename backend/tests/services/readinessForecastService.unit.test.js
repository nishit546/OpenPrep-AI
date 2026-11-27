const { buildReadinessForecast } = require('../../services/readinessForecastService');

const now = new Date('2026-11-27T12:00:00.000Z');
const examDate = '2026-12-03T12:00:00.000Z';
const attempts = (scores) => scores.map((score, index) => ({
  score,
  totalQuestions: 10,
  createdAt: new Date(now.getTime() - (scores.length - index) * 2 * 24 * 60 * 60 * 1000),
}));

describe('readiness forecast', () => {
  it('never reaches 100 simply because the exam date arrives', () => {
    const forecast = buildReadinessForecast({
      currentReadiness: 42, attempts: attempts([50, 50, 50]), examDate, now,
    });
    expect(forecast.trajectory.at(-1)).toMatchObject({ day: 'Day 6', score: 42 });
    expect(forecast.trajectory.at(-1).date).toBe('2026-12-03');
  });

  it('responds to observed rising and declining quiz performance', () => {
    const rising = buildReadinessForecast({
      currentReadiness: 55, attempts: attempts([40, 55, 70]), examDate, now,
    });
    const falling = buildReadinessForecast({
      currentReadiness: 55, attempts: attempts([70, 55, 40]), examDate, now,
    });
    expect(rising.trajectory.at(-1).score).toBeGreaterThan(55);
    expect(rising.trajectory.at(-1).score).toBeLessThan(100);
    expect(falling.trajectory.at(-1).score).toBeLessThan(55);
  });

  it('does not fabricate a projection for sparse history or a missing plan', () => {
    expect(buildReadinessForecast({
      currentReadiness: 55, attempts: attempts([55, 60]), examDate, now,
    })).toMatchObject({ mode: 'insufficient-data', trajectory: [] });
    expect(buildReadinessForecast({
      currentReadiness: 55, attempts: attempts([40, 55, 70]), now,
    })).toMatchObject({ mode: 'insufficient-data', trajectory: [] });
  });

  it('uses percent scores as stored and includes the exact exam endpoint', () => {
    const forecast = buildReadinessForecast({
      currentReadiness: 60,
      attempts: attempts([35, 55, 70, 80, 85]),
      examDate: '2026-12-30T00:00:00.000Z', now,
    });
    expect(forecast.confidence).toBe('moderate');
    expect(forecast.trajectory[0].score).toBe(60);
    expect(forecast.trajectory.at(-1).date).toBe('2026-12-30');
    expect(forecast.trajectory.at(-1).score).toBeGreaterThan(60);
  });
});
