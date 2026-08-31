const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const codeRoutes = require('../../routes/codeRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const { CodeRoom } = require('../../models');

const app = express();
app.use(express.json());
app.use('/api/code', codeRoutes);
app.use(errorHandler);

describe('Code Sandbox Controller Integration Tests', () => {
  let testUser;
  let authToken;
  let createdRoom;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'sandbox_jwt_secret_test';

    testUser = await User.create({
      name: 'sandbox coder',
      email: 'coder@example.com',
      password: 'StrongPass1!',
      xp: 10,
    });

    authToken = jwt.sign({ id: testUser.id, type: 'access' }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    if (createdRoom) {
      await createdRoom.destroy();
    }
    await testUser.destroy();
  });

  describe('POST /api/code/rooms', () => {
    it('creates a new collaborative code room session', async () => {
      const res = await request(app)
        .post('/api/code/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Algorithms 101',
          language: 'javascript',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.room.title).toBe('Algorithms 101');
      expect(res.body.room.inviteCode).toBeDefined();

      createdRoom = await CodeRoom.findByPk(res.body.room.id);
    });
  });

  describe('GET /api/code/rooms/:inviteCode', () => {
    it('fetches existing room detail metadata', async () => {
      const res = await request(app)
        .get(`/api/code/rooms/${createdRoom.inviteCode}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.room.id).toBe(createdRoom.id);
    });
  });

  describe('POST /api/code/run', () => {
    it('runs program compilation/execution and evaluates results metrics', async () => {
      // Bypass rate limiting for test suite
      const res = await request(app)
        .post('/api/code/run')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-test-rate-limit', 'true')
        .send({
          language: 'javascript',
          code: "console.log('Result Output');",
          testCases: [
            { input: '', expected: 'Result Output' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.passed).toBe(1);
      expect(res.body.results[0].status).toBe('Passed');
    });
  });
});
