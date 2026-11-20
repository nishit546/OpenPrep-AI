const StudyPlan = require('../../models/StudyPlan');
const Topic = require('../../models/Topic');
const { sequelize } = require('../../config/db');
const service = require('../../services/adaptivePlannerService');

describe('adaptive adjustment preview', () => {
  let planLookup;
  let topicLookup;
  const future = '2099-01-01';
  const past = '2020-01-01';

  beforeEach(() => {
    planLookup = vi.spyOn(StudyPlan, 'findOne');
    topicLookup = vi.spyOn(Topic, 'findAll');
  });

  afterEach(() => vi.restoreAllMocks());

  function mockPlan(dailyGoals) {
    const plan = {
      id: 'plan-1', user: 'user-1', status: 'active', endDate: future,
      dailyGoals, updatedAt: new Date('2026-01-01T00:00:00Z'),
      save: vi.fn(),
      toJSON() { return { id: this.id, dailyGoals: this.dailyGoals, updatedAt: this.updatedAt }; },
    };
    planLookup.mockResolvedValue(plan);
    return plan;
  }

  it('previews repeatably without saving and recomputes from baseline after topic changes', async () => {
    const plan = mockPlan([{ date: future, dailyCapacityMinutes: 120, tasks: [
      { topic: 'weak', duration: 60 }, { topic: 'strong', duration: 60 },
    ] }]);
    topicLookup.mockResolvedValue([
      { id: 'weak', name: 'Weak', status: 'Weak', weightage: 3 },
      { id: 'strong', name: 'Strong', status: 'Strong', weightage: 3 },
    ]);

    const first = await service.computeAdaptiveAdjustments('user-1', 'plan-1');
    const second = await service.computeAdaptiveAdjustments('user-1', 'plan-1');
    expect(first.plan.dailyGoals).toEqual(second.plan.dailyGoals);
    expect(first.plan.dailyGoals[0].tasks.map((task) => task.duration)).toEqual([85, 35]);
    expect(plan.save).not.toHaveBeenCalled();
    expect(plan.dailyGoals[0].tasks[0].duration).toBe(60);

    plan.dailyGoals = first.plan.dailyGoals;
    topicLookup.mockResolvedValue([
      { id: 'weak', name: 'Formerly weak', status: 'Strong', weightage: 3 },
      { id: 'strong', name: 'Formerly strong', status: 'Weak', weightage: 3 },
    ]);
    const changed = await service.computeAdaptiveAdjustments('user-1', 'plan-1');
    expect(changed.plan.dailyGoals[0].tasks.map((task) => task.duration)).toEqual([34, 86]);
  });

  it('preserves completed and past tasks and reports impossible capacity', async () => {
    mockPlan([
      { date: past, tasks: [{ topic: 'weak', duration: 60 }] },
      { date: future, dailyCapacityMinutes: 40, tasks: [
        { topic: 'weak', duration: 50, completed: true },
        { topic: 'weak', duration: 30 },
      ] },
    ]);
    topicLookup.mockResolvedValue([{ id: 'weak', name: 'Weak', status: 'Weak', weightage: 8 }]);
    const result = await service.computeAdaptiveAdjustments('user-1', 'plan-1');
    expect(result.plan.dailyGoals[0].tasks[0].duration).toBe(60);
    expect(result.plan.dailyGoals[1].tasks[0].duration).toBe(50);
    expect(result.infeasibleDays).toEqual([{ date: future, capacity: 40, requiredMinimum: 51 }]);
  });

  it('rejects a stale apply under the plan lock without saving', async () => {
    const plan = mockPlan([{ date: future, tasks: [{ topic: 'weak', duration: 60 }] }]);
    const transaction = vi.spyOn(sequelize, 'transaction')
      .mockImplementation(async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
    await expect(service.applyAdaptiveAdjustments('user-1', 'plan-1', '2025-01-01T00:00:00Z'))
      .rejects.toMatchObject({ code: 'STALE_PLAN' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(planLookup).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plan-1', user: 'user-1', status: 'active' },
      lock: 'UPDATE',
    }));
    expect(plan.save).not.toHaveBeenCalled();
  });

  it('applies a feasible preview once with a version marker', async () => {
    const plan = mockPlan([{ date: future, dailyCapacityMinutes: 120, tasks: [
      { topic: 'weak', duration: 60 }, { topic: 'strong', duration: 60 },
    ] }]);
    topicLookup.mockResolvedValue([
      { id: 'weak', name: 'Weak', status: 'Weak', weightage: 3 },
      { id: 'strong', name: 'Strong', status: 'Strong', weightage: 3 },
    ]);
    vi.spyOn(sequelize, 'transaction')
      .mockImplementation(async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
    await service.applyAdaptiveAdjustments('user-1', 'plan-1', '2026-01-01T00:00:00Z');
    expect(plan.dailyGoals[0].tasks.map((task) => task.duration)).toEqual([85, 35]);
    expect(plan.currentVersionNumber).toBe(2);
    expect(plan.save).toHaveBeenCalledOnce();
  });
});
