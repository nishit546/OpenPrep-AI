import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPasskeySupported,
  isConditionalMediationSupported,
  registerPasskey,
  loginWithPasskey,
  fetchUserPasskeys,
  deleteUserPasskey,
} from '../passkeyClient';
import API from '../api';
import * as simpleWebAuthnBrowser from '@simplewebauthn/browser';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: vi.fn().mockReturnValue(true),
  browserSupportsWebAuthnAutofill: vi.fn().mockResolvedValue(true),
}));

describe('passkeyClient Frontend Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPasskeySupported', () => {
    it('returns true when PublicKeyCredential exists on window', () => {
      global.window = { PublicKeyCredential: {} };
      expect(isPasskeySupported()).toBe(true);
    });
  });

  describe('isConditionalMediationSupported', () => {
    it('checks PublicKeyCredential.isConditionalMediationAvailable', async () => {
      global.window = {
        PublicKeyCredential: {
          isConditionalMediationAvailable: vi.fn().mockResolvedValue(true),
        },
      };
      const result = await isConditionalMediationSupported();
      expect(result).toBe(true);
    });
  });

  describe('registerPasskey', () => {
    it('requests challenge, prompts biometric registration, and verifies', async () => {
      API.post.mockImplementation((url) => {
        if (url === '/auth/passkey/register-challenge') {
          return Promise.resolve({
            data: { success: true, options: { challenge: 'reg-chall' } },
          });
        }
        if (url === '/auth/passkey/register-verify') {
          return Promise.resolve({
            data: { success: true, message: 'Passkey registered' },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      simpleWebAuthnBrowser.startRegistration.mockResolvedValue({ id: 'new-cred-id' });

      const res = await registerPasskey('My MacBook');
      expect(res.success).toBe(true);
      expect(simpleWebAuthnBrowser.startRegistration).toHaveBeenCalledWith({
        optionsJSON: { challenge: 'reg-chall' },
      });
      expect(API.post).toHaveBeenCalledWith('/auth/passkey/register-verify', {
        response: { id: 'new-cred-id' },
        deviceName: 'My MacBook',
      });
    });
  });

  describe('loginWithPasskey', () => {
    it('requests login challenge, prompts assertion, verifies, and stores token', async () => {
      API.post.mockImplementation((url) => {
        if (url === '/auth/passkey/login-challenge') {
          return Promise.resolve({
            data: {
              success: true,
              options: { challenge: 'login-chall' },
              challengeId: 'chall-123',
            },
          });
        }
        if (url === '/auth/passkey/login-verify') {
          return Promise.resolve({
            data: {
              success: true,
              token: 'jwt-access-token',
              user: { id: 'u1', email: 'test@example.com' },
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      simpleWebAuthnBrowser.startAuthentication.mockResolvedValue({ id: 'cred-123' });

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const res = await loginWithPasskey({ email: 'test@example.com' });
      expect(res.success).toBe(true);
      expect(res.token).toBe('jwt-access-token');
      expect(setItemSpy).toHaveBeenCalledWith('token', 'jwt-access-token');
    });
  });

  describe('fetchUserPasskeys & deleteUserPasskey', () => {
    it('fetches registered passkeys list', async () => {
      API.get.mockResolvedValue({
        data: { passkeys: [{ id: 'pk-1', deviceName: 'iPhone Touch ID' }] },
      });

      const list = await fetchUserPasskeys();
      expect(list.length).toBe(1);
      expect(list[0].deviceName).toBe('iPhone Touch ID');
    });

    it('deletes passkey by id', async () => {
      API.delete.mockResolvedValue({
        data: { success: true, message: 'Deleted' },
      });

      const res = await deleteUserPasskey('pk-1');
      expect(res.success).toBe(true);
      expect(API.delete).toHaveBeenCalledWith('/auth/passkey/pk-1');
    });
  });
});
