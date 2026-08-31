const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const squadRoutes = require('../../routes/squadRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const { StudySquad, SquadMember } = require('../../models');

const app = express();
app.use(express.json());
app.use('/api/squads', squadRoutes);
app.use(errorHandler);

describe('Squad Audio Lounge Controller - Integration Tests', () => {
  let testUser1;
  let testUser2;
  let authToken1;
  let authToken2;
  let testSquad;
  let membership1;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_audio_lounge';

    testUser1 = await User.create({
      name: 'audio peer 1',
      email: 'peer1@example.com',
      password: 'StrongPass1!',
    });

    testUser2 = await User.create({
      name: 'audio peer 2',
      email: 'peer2@example.com',
      password: 'StrongPass1!',
    });

    authToken1 = jwt.sign({ id: testUser1.id, type: 'access' }, process.env.JWT_SECRET);
    authToken2 = jwt.sign({ id: testUser2.id, type: 'access' }, process.env.JWT_SECRET);

    testSquad = await StudySquad.create({
      name: 'Silent study session group',
      inviteCode: 'AUDIO99',
    });

    // Add user 1 as a member of this squad
    membership1 = await SquadMember.create({
      squadId: testSquad.id,
      userId: testUser1.id,
      role: 'admin',
    });
  });

  afterAll(async () => {
    await SquadMember.destroy({ where: { squadId: testSquad.id } });
    await testSquad.destroy();
    await testUser1.destroy();
    await testUser2.destroy();
  });

  describe('GET /api/squads/:id/audio-status', () => {
    it('allows a member of the squad to fetch the active audio lounge participants list', async () => {
      const res = await request(app)
        .get(`/api/squads/${testSquad.id}/audio-status`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.participants)).toBe(true);
    });

    it('denies access (returns 403) to users who are not members of the study squad', async () => {
      const res = await request(app)
        .get(`/api/squads/${testSquad.id}/audio-status`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });
});
