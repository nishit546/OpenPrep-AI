import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { User, UserPasskey } = require('../../models');
const passkeyService = require('../../services/passkeyAuthService');

vi.mock('../../config/redis', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(true),
  invalidateCache: vi.fn().mockResolvedValue(true),
}));

describe('passkeyAuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRegisterChallenge', () => {
    it('should generate registration options and cache the challenge', async () => {
      vi.spyOn(UserPasskey, 'findAll').mockResolvedValue([]);
      vi.spyOn(passkeyService.webAuthnDriver, 'generateRegistrationOptions').mockResolvedValue({
        challenge: 'mock-reg-challenge',
        rp: { name: 'OpenPrep AI', id: 'localhost' },
        user: { id: 'user-123', name: 'test@example.com', displayName: 'Test User' },
      });

      const user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      const options = await passkeyService.generateRegisterChallenge(user);

      expect(options).toBeDefined();
      expect(options.challenge).toBe('mock-reg-challenge');
    });
  });

  describe('verifyRegister', () => {
    it('should verify registration response and save passkey', async () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const response = { id: 'cred-123', response: { clientDataJSON: 'xyz' } };

      passkeyService._memoryChallengeStore.set(`passkey_challenge:reg_${user.id}`, {
        challenge: 'mock-reg-challenge',
        expiresAt: Date.now() + 60000,
      });

      vi.spyOn(passkeyService.webAuthnDriver, 'verifyRegistrationResponse').mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-123',
            publicKey: Buffer.from('mock-pubkey'),
            counter: 0,
          },
          aaguid: '00000000-0000-0000-0000-000000000000',
        },
      });

      vi.spyOn(UserPasskey, 'findOne').mockResolvedValue(null);
      vi.spyOn(UserPasskey, 'create').mockResolvedValue({
        id: 'passkey-1',
        userId: user.id,
        credentialId: 'cred-123',
        deviceName: 'MacBook Touch ID',
      });

      const result = await passkeyService.verifyRegister(user, response, 'MacBook Touch ID');

      expect(result.verified).toBe(true);
      expect(UserPasskey.create).toHaveBeenCalled();
    });
  });

  describe('generateLoginChallenge', () => {
    it('should generate login authentication options', async () => {
      vi.spyOn(passkeyService.webAuthnDriver, 'generateAuthenticationOptions').mockResolvedValue({
        challenge: 'mock-auth-challenge',
        rpId: 'localhost',
      });

      const result = await passkeyService.generateLoginChallenge('test@example.com');

      expect(result.options).toBeDefined();
      expect(result.challengeId).toBeDefined();
    });
  });

  describe('verifyLogin', () => {
    it('should verify login response and return authenticated user', async () => {
      const response = { id: 'cred-123', response: { clientDataJSON: 'xyz' } };
      const challengeId = 'challenge_mock-auth-challenge';

      passkeyService._memoryChallengeStore.set(`passkey_challenge:${challengeId}`, {
        challenge: 'mock-auth-challenge',
        expiresAt: Date.now() + 60000,
      });

      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      const mockPasskey = {
        id: 'passkey-1',
        credentialId: 'cred-123',
        publicKey: Buffer.from('mock-pubkey').toString('base64url'),
        counter: 0,
        transports: [],
        userRef: mockUser,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(UserPasskey, 'findOne').mockResolvedValue(mockPasskey);
      vi.spyOn(passkeyService.webAuthnDriver, 'verifyAuthenticationResponse').mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
        },
      });

      const result = await passkeyService.verifyLogin(response, challengeId);
      expect(result.verified).toBe(true);
      expect(result.user.id).toBe('user-123');
      expect(mockPasskey.save).toHaveBeenCalled();
    });
  });

  describe('getUserPasskeys & deleteUserPasskey', () => {
    it('should retrieve registered passkeys for user', async () => {
      vi.spyOn(UserPasskey, 'findAll').mockResolvedValue([{ id: 'passkey-1', deviceName: 'MacBook' }]);

      const keys = await passkeyService.getUserPasskeys('user-123');
      expect(keys.length).toBe(1);
      expect(keys[0].deviceName).toBe('MacBook');
    });

    it('should delete a passkey for user', async () => {
      const mockPk = { id: 'passkey-1', userId: 'user-123', destroy: vi.fn().mockResolvedValue(true) };
      vi.spyOn(UserPasskey, 'findOne').mockResolvedValue(mockPk);

      const res = await passkeyService.deleteUserPasskey('user-123', 'passkey-1');
      expect(res.success).toBe(true);
      expect(mockPk.destroy).toHaveBeenCalled();
    });
  });
});
