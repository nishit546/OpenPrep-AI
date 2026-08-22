const { sequelize } = require('../../config/db');
const { rlsStorage } = require('../../middleware/rlsContext');
const User = require('../../models/User');
const Exam = require('../../models/Exam');

describe('Database Row-Level Security (RLS) Integration', () => {
  let userA, userB, adminUser, testExam;

  beforeAll(async () => {
    // Ensure RLS is active on Exams table by executing the DDL (in case test db migrations haven't run)
    try {
      await sequelize.query('ALTER TABLE "Exams" ENABLE ROW LEVEL SECURITY;');
      await sequelize.query('ALTER TABLE "Exams" FORCE ROW LEVEL SECURITY;');
      await sequelize.query('DROP POLICY IF EXISTS exams_tenant_isolation_policy ON "Exams";');
      await sequelize.query(`
        CREATE POLICY exams_tenant_isolation_policy ON "Exams"
        USING ("user"::text = current_setting('app.current_user_id', true) OR current_setting('app.is_admin', true) = 'true');
      `);
    } catch (e) {
      console.warn('Skipping RLS policy setup in test (might be running in sqlite or non-PG env):', e.message);
    }

    userA = await User.create({ name: 'User A', email: 'usera@example.com', role: 'student' });
    userB = await User.create({ name: 'User B', email: 'userb@example.com', role: 'student' });
    adminUser = await User.create({ name: 'Admin User', email: 'adminrls@example.com', role: 'admin' });

    testExam = await Exam.create({
      name: 'User A Math Exam',
      description: 'Algebra details',
      date: new Date(),
      user: userA.id,
    });
  });

  afterAll(async () => {
    if (testExam) {
      await Exam.destroy({ where: { id: testExam.id } });
    }
    await User.destroy({ where: { id: [userA.id, userB.id, adminUser.id] } });
  });

  it('should allow User A to read their own Exam', async () => {
    let exams = [];
    await rlsStorage.run({ userId: userA.id, isAdmin: false }, async () => {
      exams = await Exam.findAll({ where: { id: testExam.id } });
    });
    expect(exams.length).toBe(1);
    expect(exams[0].name).toBe('User A Math Exam');
  });

  it('should isolate User B from reading User A\'s Exam', async () => {
    let exams = [];
    await rlsStorage.run({ userId: userB.id, isAdmin: false }, async () => {
      exams = await Exam.findAll({ where: { id: testExam.id } });
    });
    expect(exams.length).toBe(0);
  });

  it('should allow Admin User to read User A\'s Exam (bypass RLS)', async () => {
    let exams = [];
    await rlsStorage.run({ userId: adminUser.id, isAdmin: true }, async () => {
      exams = await Exam.findAll({ where: { id: testExam.id } });
    });
    expect(exams.length).toBe(1);
  });
});
