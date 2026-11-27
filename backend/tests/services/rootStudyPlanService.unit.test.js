const { normalizeGeneratedPlan, serializeRootPlan } = require('../../services/rootStudyPlanService');

const options = {
  examDate: '2099-12-31', dailyHours: 3, now: new Date('2099-12-27T12:00:00Z'),
};
const generated = {
  overallStrategy: 'Revise each day.',
  schedule: [
    { date: '2099-12-29', topics: ['Algebra', 'Geometry'], estimatedHours: 2, focusArea: 'Practice', notes: 'Review mistakes.' },
    { date: '2099-12-30', topics: ['Calculus'], estimatedHours: 1.5 },
  ],
};

describe('root study-plan persistence mapping', () => {
  it('maps generated topics to editable canonical tasks and preserves the root API shape', () => {
    const dailyGoals = normalizeGeneratedPlan(generated, options);
    expect(dailyGoals).toHaveLength(2);
    expect(dailyGoals[0].tasks[0]).toMatchObject({
      title: 'Algebra', duration: 60, completed: false, topic: null,
    });
    expect(dailyGoals[0].tasks[0]._id).toBeTruthy();

    const response = serializeRootPlan({
      id: 'plan-1', exam: 'exam-1', status: 'active', dailyGoals,
      overallStrategy: generated.overallStrategy,
    });
    expect(response).toMatchObject({
      id: 'plan-1', examId: 'exam-1', totalDays: 2,
      overallStrategy: 'Revise each day.',
    });
    expect(response.schedule[0]).toMatchObject({
      date: '2099-12-29', topics: ['Algebra', 'Geometry'], estimatedHours: 2,
    });
  });

  it('rejects empty, duplicate, out-of-range, and impossible schedules', () => {
    expect(() => normalizeGeneratedPlan({ schedule: [] }, options)).toThrow(/empty schedule/);
    expect(() => normalizeGeneratedPlan({ schedule: [generated.schedule[0], generated.schedule[0]] }, options)).toThrow(/invalid schedule/);
    expect(() => normalizeGeneratedPlan({ schedule: [{ ...generated.schedule[0], estimatedHours: 4 }] }, options)).toThrow(/invalid schedule/);
    expect(() => normalizeGeneratedPlan({ schedule: [{ ...generated.schedule[0], date: '2099-02-30' }] }, options)).toThrow(/invalid schedule/);
  });

  it('returns null for users without a saved plan', () => {
    expect(serializeRootPlan(null)).toBeNull();
  });
});
