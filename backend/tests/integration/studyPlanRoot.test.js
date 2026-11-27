const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Exam = require('../../models/Exam');
const StudyPlan = require('../../models/StudyPlan');
const studyPlanService = require('../../services/studyPlanService');
const studyPlanRoutes = require('../../routes/studyPlanRoutes');

const app = express();
app.use(express.json());
app.use('/api/study-plans', studyPlanRoutes);
app.use((error, req, res, next) => res.status(500).json({ success: false, error: error.message }));

const examDate = '2099-12-31';
const generated = {
  overallStrategy: 'Practice daily.',
  schedule: [{ date: '2099-12-30', topics: ['Algebra'], estimatedHours: 2 }],
};

describe('root study-plan persistence and ownership', () => {
  let owner;
  let outsider;
  let exam;
  let ownerToken;
  let outsiderToken;

  beforeEach(async () => {
    process.env.JWT_SECRET ||= 'test_jwt_secret_for_study_plan_integration';
    await User.destroy({ where: {}, truncate: true, cascade: true });
    owner = await User.create({ name: 'Plan Owner', email: 'plan-owner@example.com' });
    outsider = await User.create({ name: 'Other User', email: 'other-plan-user@example.com' });
    exam = await Exam.create({ name: 'Final Exam', date: new Date(examDate), user: owner.id });
    ownerToken = jwt.sign({ id: owner.id }, process.env.JWT_SECRET);
    outsiderToken = jwt.sign({ id: outsider.id }, process.env.JWT_SECRET);
    jest.spyOn(studyPlanService, 'generateStudyPlan').mockResolvedValue(generated);
  });

  afterEach(() => jest.restoreAllMocks());

  const createPlan = (token, examId) => request(app)
    .post('/api/study-plans')
    .set('Authorization', `Bearer ${token}`)
    .send({ examId, examDate, topics: ['Algebra'], dailyHours: 2 });

  it('persists and retrieves a plan without exposing it to another user', async () => {
    const created = await createPlan(ownerToken, exam.id);
    expect(created.status).toBe(201);
    const saved = await StudyPlan.findOne({ where: { id: created.body.data.id } });
    expect(saved).not.toBeNull();
    expect(saved.user).toBe(owner.id);

    const own = await request(app).get('/api/study-plans').set('Authorization', `Bearer ${ownerToken}`);
    const other = await request(app).get('/api/study-plans').set('Authorization', `Bearer ${outsiderToken}`);
    expect(own.body.data.id).toBe(saved.id);
    expect(own.body.data.schedule[0].topics).toEqual(['Algebra']);
    expect(other.body.data).toBeNull();
    expect((await createPlan(outsiderToken, exam.id)).status).toBe(404);
  });

  it('keeps one active plan when the same request is repeated concurrently', async () => {
    const responses = await Promise.all([
      createPlan(ownerToken, exam.id),
      createPlan(ownerToken, exam.id),
    ]);
    expect(responses.map((res) => res.status)).toEqual([201, 201]);
    expect(await StudyPlan.count({ where: { user: owner.id, exam: exam.id, status: 'active' } })).toBe(1);
    expect(await StudyPlan.count({ where: { user: owner.id, exam: exam.id, status: 'archived' } })).toBe(1);
  });

  it('does not change the active plan when generation fails', async () => {
    const first = await createPlan(ownerToken, exam.id);
    studyPlanService.generateStudyPlan.mockResolvedValueOnce({ schedule: [] });
    const failed = await createPlan(ownerToken, exam.id);
    expect(failed.status).toBe(502);
    const active = await StudyPlan.findOne({ where: { user: owner.id, exam: exam.id, status: 'active' } });
    expect(active.id).toBe(first.body.data.id);
  });

  it('rolls back archiving when the new plan cannot be written', async () => {
    const first = await createPlan(ownerToken, exam.id);
    jest.spyOn(StudyPlan, 'create').mockRejectedValueOnce(new Error('Write failed'));

    const failed = await createPlan(ownerToken, exam.id);

    expect(failed.status).toBe(500);
    const active = await StudyPlan.findOne({ where: { user: owner.id, exam: exam.id, status: 'active' } });
    expect(active.id).toBe(first.body.data.id);
  });
});
