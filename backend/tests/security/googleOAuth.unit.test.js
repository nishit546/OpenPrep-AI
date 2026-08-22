import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const { OAuth2Client } = require('google-auth-library');
const User = require('../../models/User');

describe('Google OAuth authentication tests', () => {
  let app;
  let authController;
  let verifySpy;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    app = express();
    app.use(express.json());
    
    authController = require('../../controllers/authController');
    app.post('/api/auth/google', authController.googleLogin);
  });

  it('should return 401 with error message when verifyIdToken throws (token verification fails)', async () => {
    verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('Invalid signature'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-tampered-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid Google credential - token verification failed');
  });

  it('should return 200 and create/retrieve user when verifyIdToken succeeds', async () => {
    const mockPayload = {
      email: 'verified-user@gmail.com',
      name: 'Verified User',
      sub: 'google-sub-12345',
      picture: 'http://avatar-url',
    };

    verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => mockPayload,
    });

    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 'existing-id',
      name: 'Verified User',
      email: 'verified-user@gmail.com',
      role: 'student',
      save: vi.fn().mockResolvedValue(true),
      refreshTokens: [],
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('verified-user@gmail.com');
  });
});
