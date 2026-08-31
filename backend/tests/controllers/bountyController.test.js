const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bountyRoutes = require('../../routes/bountyRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const { BountyQuestion, BountyAnswer } = require('../../models');

const app = express();
app.use(express.json());
app.use('/api/bounties', bountyRoutes);
app.use(errorHandler);

describe('Bounty Board Controller Integration Tests', () => {
  let testUser1;
  let testUser2;
  let authToken1;
  let authToken2;
  let testQuestion;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'bounty_jwt_secret_test';

    testUser1 = await User.create({
      name: 'bounty user 1',
      email: 'buser1@example.com',
      password: 'StrongPass1!',
      xp: 300,
    });

    testUser2 = await User.create({
      name: 'bounty user 2',
      email: 'buser2@example.com',
      password: 'StrongPass1!',
      xp: 50,
    });

    authToken1 = jwt.sign({ id: testUser1.id, type: 'access' }, process.env.JWT_SECRET);
    authToken2 = jwt.sign({ id: testUser2.id, type: 'access' }, process.env.JWT_SECRET);

    testQuestion = await BountyQuestion.create({
      title: 'Global Integration Theorem',
      problemText: 'Integrate $e^{-x^2}$ over $\\mathbb{R}$',
      bountyXp: 50,
      expirationDate: new Date(Date.now() + 86400000),
      userId: testUser1.id,
    });
  });

  afterAll(async () => {
    await BountyAnswer.destroy({ where: { questionId: testQuestion.id } });
    await testQuestion.destroy();
    await testUser1.destroy();
    await testUser2.destroy();
  });

  describe('GET /api/bounties', () => {
    it('returns a list of active bounties', async () => {
      const res = await request(app)
        .get('/api/bounties')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.bounties)).toBe(true);
    });
  });

  describe('POST /api/bounties', () => {
    it('creates a new bounty question and deducts XP escrow from user balance', async () => {
      const res = await request(app)
        .post('/api/bounties')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          title: 'Graph Theory Proof',
          problemText: 'Prove that $G$ is planar',
          bountyXp: 100,
          expirationDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bounty.title).toBe('Graph Theory Proof');

      // Verify XP deducted
      await testUser1.reload();
      expect(testUser1.xp).toBe(200); // 300 - 100 (initially created was 300, minus 100)

      // Cleanup
      await BountyQuestion.destroy({ where: { id: res.body.bounty.id } });
    });
  });

  describe('POST /api/bounties/:id/answers', () => {
    it('allows a peer to submit a solution for an open bounty', async () => {
      const res = await request(app)
        .post(`/api/bounties/${testQuestion.id}/answers`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          answerText: 'The solution is $\\sqrt{\\pi}$ using polar coordinates.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.answer.answerText).toContain('\\sqrt');
    });
  });

  describe('PUT /api/bounties/:id/accept/:answerId', () => {
    it('allows question creator to accept solution and pays out escrowed XP', async () => {
      // Find the answer submitted in the previous step
      const answer = await BountyAnswer.findOne({ where: { questionId: testQuestion.id } });
      expect(answer).toBeDefined();

      const res = await request(app)
        .put(`/api/bounties/${testQuestion.id}/accept/${answer.id}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify XP transferred
      await testUser2.reload();
      expect(testUser2.xp).toBe(100); // 50 + 50
    });
  });
});
