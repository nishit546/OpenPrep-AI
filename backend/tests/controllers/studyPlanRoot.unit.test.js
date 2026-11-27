const { createStudyPlan, getStudyPlan } = require('../../controllers/studyPlanController');
const { sequelize } = require('../../config/db');
const User = require('../../models/User');
const Exam = require('../../models/Exam');
const StudyPlan = require('../../models/StudyPlan');
const cacheService = require('../../services/cacheService');
const studyPlanService = require('../../services/studyPlanService');

const examId = 'b1f30405-7788-4910-aabb-123456789abc';
const body = {
  examId, examDate: '2099-12-31', topics: ['Algebra'], dailyHours: 2,
};
const schedule = {
  overallStrategy: 'Practice algebra.',
  schedule: [{ date: '2099-12-30', topics: ['Algebra'], estimatedHours: 2 }],
};
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

describe('root study-plan API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('archives a prior active plan and persists a user-owned plan in one transaction', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    vi.spyOn(Exam, 'findOne').mockResolvedValue({ id: examId, date: new Date('2099-12-31') });
    vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-1' });
    vi.spyOn(studyPlanService, 'generateStudyPlan').mockResolvedValue(schedule);
    const update = vi.spyOn(StudyPlan, 'update').mockResolvedValue([1]);
    const create = vi.spyOn(StudyPlan, 'create').mockImplementation(async (data) => ({ id: 'plan-1', ...data }));
    vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback) => callback(transaction));
    vi.spyOn(cacheService, 'del').mockResolvedValue();
    const res = response();
    const next = vi.fn();

    await createStudyPlan({ user: { id: 'user-1' }, body }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(update).toHaveBeenCalledWith(
      { status: 'archived' },
      { where: { user: 'user-1', exam: examId, status: 'active' }, transaction }
    );
    expect(create.mock.calls[0][0]).toMatchObject({
      user: 'user-1', exam: examId, status: 'active', overallStrategy: 'Practice algebra.',
    });
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      id: 'plan-1', examId, totalDays: 1, overallStrategy: 'Practice algebra.',
    });
  });

  it('does not generate or save a plan for another user\'s exam', async () => {
    vi.spyOn(Exam, 'findOne').mockResolvedValue(null);
    const generator = vi.spyOn(studyPlanService, 'generateStudyPlan');
    const create = vi.spyOn(StudyPlan, 'create');
    const res = response();

    await createStudyPlan({ user: { id: 'outsider' }, body }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(generator).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('fails explicitly when the generator returns an empty schedule', async () => {
    vi.spyOn(Exam, 'findOne').mockResolvedValue({ id: examId, date: new Date('2099-12-31') });
    vi.spyOn(studyPlanService, 'generateStudyPlan').mockResolvedValue({ schedule: [] });
    const create = vi.spyOn(StudyPlan, 'create');
    const res = response();

    await createStudyPlan({ user: { id: 'user-1' }, body }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(502);
    expect(create).not.toHaveBeenCalled();
  });

  it('retrieves only the signed-in user\'s active plan or null', async () => {
    const find = vi.spyOn(StudyPlan, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'plan-1', exam: examId, status: 'active', dailyGoals: [], overallStrategy: '',
    });
    const first = response();
    const second = response();

    await getStudyPlan({ user: { id: 'user-1' }, query: {} }, first, vi.fn());
    await getStudyPlan({ user: { id: 'user-1' }, query: { examId } }, second, vi.fn());

    expect(first.json.mock.calls[0][0].data).toBeNull();
    expect(find.mock.calls[0][0].where).toEqual({ user: 'user-1', status: 'active' });
    expect(find.mock.calls[1][0].where).toEqual({ user: 'user-1', status: 'active', exam: examId });
    expect(second.json.mock.calls[0][0].data.id).toBe('plan-1');
  });
});
