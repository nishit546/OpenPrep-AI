import { describe, it, expect, vi, beforeEach } from 'vitest';
const passkeyController = require('../../controllers/passkeyController');
const passkeyService = require('../../services/passkeyAuthService');
const { User } = require('../../models');

describe('passkeyController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 'user-123' },
      body: {},
      params: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getRegisterChallenge', () => {
    it('returns challenge options when user exists', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      vi.spyOn(passkeyService, 'generateRegisterChallenge').mockResolvedValue({ challenge: 'test-challenge' });

      await passkeyController.getRegisterChallenge(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        options: { challenge: 'test-challenge' },
      });
    });

    it('returns 404 when user is not found', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue(null);

      await passkeyController.getRegisterChallenge(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });
  });

  describe('verifyRegister', () => {
    it('verifies and saves passkey successfully', async () => {
      req.body = { response: { id: 'cred-123' }, deviceName: 'MacBook Pro' };
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-123' });
      vi.spyOn(passkeyService, 'verifyRegister').mockResolvedValue({
        verified: true,
        passkey: {
          id: 'pk-1',
          deviceName: 'MacBook Pro',
          createdAt: new Date(),
        },
      });

      await passkeyController.verifyRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Passkey registered successfully',
        })
      );
    });

    it('returns 400 if response body is missing', async () => {
      req.body = {};
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-123' });

      await passkeyController.verifyRegister(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Registration response payload is required',
      });
    });
  });

  describe('getLoginChallenge', () => {
    it('generates login challenge for authentication', async () => {
      req.body = { email: 'test@example.com' };
      vi.spyOn(passkeyService, 'generateLoginChallenge').mockResolvedValue({
        options: { challenge: 'auth-challenge' },
        challengeId: 'chall-1',
      });

      await passkeyController.getLoginChallenge(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        options: { challenge: 'auth-challenge' },
        challengeId: 'chall-1',
      });
    });
  });

  describe('verifyLogin', () => {
    it('verifies passkey authentication and sets cookie/returns tokens', async () => {
      req.body = { response: { id: 'cred-123' }, challengeId: 'chall-1' };
      const mockUser = {
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'student',
      };

      vi.spyOn(passkeyService, 'verifyLogin').mockResolvedValue({
        verified: true,
        user: mockUser,
      });

      await passkeyController.verifyLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String),
          user: expect.objectContaining({ id: 'user-123', email: 'jane@example.com' }),
        })
      );
    });

    it('returns 400 if payload missing challengeId or response', async () => {
      req.body = {};

      await passkeyController.verifyLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Passkey response and challengeId are required',
      });
    });
  });

  describe('listPasskeys & deletePasskey', () => {
    it('lists passkeys for user', async () => {
      vi.spyOn(passkeyService, 'getUserPasskeys').mockResolvedValue([
        { id: 'pk-1', deviceName: 'MacBook Touch ID' },
      ]);

      await passkeyController.listPasskeys(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        passkeys: [{ id: 'pk-1', deviceName: 'MacBook Touch ID' }],
      });
    });

    it('deletes passkey for user', async () => {
      req.params = { id: 'pk-1' };
      vi.spyOn(passkeyService, 'deleteUserPasskey').mockResolvedValue({ success: true });

      await passkeyController.deletePasskey(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passkey deleted successfully',
      });
    });
  });
});
