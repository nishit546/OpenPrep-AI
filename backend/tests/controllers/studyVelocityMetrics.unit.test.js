import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { createGetVelocityMetrics } = require('../../controllers/studyPlanController');

const NOW = new Date('2026-10-24T10:00:00Z');

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const buildModels = ({ plan, version = null, taskRows = [], sessions = [], attempts = [] }) => ({
  StudyPlan: { findOne: vi.fn().mockResolvedValue(plan) },
  StudyPlanVersion: { findOne: vi.fn().mockResolvedValue(version) },
  StudyTask: { findAll: vi.fn().mockResolvedValue(taskRows) },
  StudySession: { findAll: vi.fn().mockResolvedValue(sessions) },
  QuizAttempt: { findAll: vi.fn().mockResolvedValue(attempts) },
});

const run = async (models, req = { user: { id: 'u1' } }) => {
  const handler = createGetVelocityMetrics({ models, now: () => NOW });
  const res = mockRes();
  const next = vi.fn();
  await handler(req, res, next);
  return { res, next };
};

describe('getVelocityMetrics controller', () => {
  it('returns null data when the user has no active plan', async () => {
    const models = buildModels({ plan: null });
    const { res } = await run(models);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    expect(models.StudySession.findAll).not.toHaveBeenCalled();
  });

  it('converts session minutes to hours and uses StudyTask hours', async () => {
    const models = buildModels({
      plan: { id: 'p1', currentVersionNumber: 2, endDate: new Date('2026-11-03T00:00:00Z'), dailyGoals: [] },
      version: { id: 'v1' },
      taskRows: [{ estimatedHours: 30 }, { estimatedHours: 30 }],
      sessions: [{ durationMinutes: 840, createdAt: new Date('2026-10-23T09:00:00Z') }],
    });
    const { res } = await run(models);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.planId).toBe('p1');
    expect(body.data.daysRemaining).toBe(10);
    expect(body.data.requiredVelocity).toBe(6);
    expect(body.data.currentVelocity).toBe(1);
    expect(models.StudyTask.findAll.mock.calls[0][0].where.versionId).toBe('v1');
    expect(models.StudyPlan.findOne.mock.calls[0][0].where).toEqual({ user: 'u1', status: 'active' });
  });

  it('falls back to dailyGoals tasks when there are no StudyTask rows', async () => {
    const models = buildModels({
      plan: {
        id: 'p1',
        currentVersionNumber: 1,
        endDate: new Date('2026-10-30T00:00:00Z'),
        dailyGoals: [
          { tasks: [{ completed: false, duration: 120 }, { completed: true, duration: 600 }, { completed: false }] },
        ],
      },
    });
    const { res } = await run(models);
    // 2h + 1h unfinished
    expect(res.json.mock.calls[0][0].data.remainingSyllabusHours).toBe(3);
  });

  it('handles zero tasks, a past exam date and no sessions', async () => {
    const models = buildModels({
      plan: { id: 'p1', currentVersionNumber: 1, endDate: new Date('2026-09-01T00:00:00Z'), dailyGoals: [] },
    });
    const { res } = await run(models);
    const data = res.json.mock.calls[0][0].data;
    expect(data.daysRemaining).toBe(1);
    expect(data.requiredVelocity).toBe(0);
    expect(data.currentVelocity).toBe(0);
    expect(data.burnoutRisk).toBe(0);
  });

  it('passes errors to next', async () => {
    const models = buildModels({ plan: null });
    models.StudyPlan.findOne.mockRejectedValue(new Error('db down'));
    const { res, next } = await run(models);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});
