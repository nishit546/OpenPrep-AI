import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser';
import API from './api';

/**
 * Check if the current browser environment supports WebAuthn Passkeys.
 */
export const isPasskeySupported = () => {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
};

/**
 * Check if the browser supports conditional UI (autofill passkeys).
 */
export const isConditionalMediationSupported = async () => {
  try {
    if (!isPasskeySupported()) return false;
    if (typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      return await window.PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Register a new passkey on the current device
 * @param {string} deviceName - Friendly name for the passkey device
 */
export const registerPasskey = async (deviceName = 'Passkey Device') => {
  // 1. Get challenge options from backend
  const { data: challengeData } = await API.post('/auth/passkey/register-challenge');
  if (!challengeData.success || !challengeData.options) {
    throw new Error(challengeData.error || 'Failed to obtain registration challenge');
  }

  // 2. Perform WebAuthn biometric prompt via @simplewebauthn/browser
  const registrationResponse = await startRegistration({ optionsJSON: challengeData.options });

  // 3. Verify registration on backend and save passkey
  const { data: verifyData } = await API.post('/auth/passkey/register-verify', {
    response: registrationResponse,
    deviceName,
  });

  if (!verifyData.success) {
    throw new Error(verifyData.error || 'Failed to verify passkey registration');
  }

  return verifyData;
};

/**
 * Login with a passkey using WebAuthn assertion
 * @param {object} options
 * @param {string} [options.email] - Optional email to narrow allowed credentials
 * @param {boolean} [options.useBrowserAutofill=false] - Whether to use conditional UI mediation
 */
export const loginWithPasskey = async ({ email = null, useBrowserAutofill = false } = {}) => {
  // 1. Get login challenge from backend
  const { data: challengeData } = await API.post('/auth/passkey/login-challenge', { email });
  if (!challengeData.success || !challengeData.options) {
    throw new Error(challengeData.error || 'Failed to obtain authentication challenge');
  }

  // 2. Prompt user biometrics (Touch ID / Face ID / Windows Hello)
  const authResponse = await startAuthentication({
    optionsJSON: challengeData.options,
    useBrowserAutofill,
  });

  // 3. Verify assertion on backend and obtain session tokens
  const { data: verifyData } = await API.post('/auth/passkey/login-verify', {
    response: authResponse,
    challengeId: challengeData.challengeId,
  });

  if (!verifyData.success) {
    throw new Error(verifyData.error || 'Passkey verification failed');
  }

  // Save session tokens to localStorage if returned
  if (verifyData.token) {
    localStorage.setItem('token', verifyData.token);
  }

  return verifyData;
};

/**
 * Fetch all registered passkeys for the current user
 */
export const fetchUserPasskeys = async () => {
  const { data } = await API.get('/auth/passkey/list');
  return data.passkeys || [];
};

/**
 * Delete / revoke a registered passkey
 * @param {string} passkeyId
 */
export const deleteUserPasskey = async (passkeyId) => {
  const { data } = await API.delete(`/auth/passkey/${passkeyId}`);
  return data;
};

/**
 * Ensure the current auth token is valid and silently renew it if expired
 */
export const ensureValidToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const { data } = await API.post('/auth/passkey/refresh-token');
    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      return true;
    }
  } catch (err) {
    console.warn('Silent token renewal failed', err);
  }
  return false;
};
