const SimpleWebAuthn = require('@simplewebauthn/server');
const { User, UserPasskey } = require('../models');
const { getCache, setCache, invalidateCache } = require('../config/redis');

// Driver adapter allowing injection and testing
const webAuthnDriver = {
  generateRegistrationOptions: (args) => SimpleWebAuthn.generateRegistrationOptions(args),
  verifyRegistrationResponse: (args) => SimpleWebAuthn.verifyRegistrationResponse(args),
  generateAuthenticationOptions: (args) => SimpleWebAuthn.generateAuthenticationOptions(args),
  verifyAuthenticationResponse: (args) => SimpleWebAuthn.verifyAuthenticationResponse(args),
};

// In-memory fallback challenges for when Redis is unavailable
const memoryChallengeStore = new Map();

// Configuration for WebAuthn RP
const getRPConfig = () => {
  const rpName = process.env.WEBAUTHN_RP_NAME || 'OpenPrep AI';
  const rawRpId = process.env.WEBAUTHN_RP_ID || (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : 'localhost');
  const rpID = rawRpId.replace(/:\d+$/, ''); // strip port for RP ID
  const origin = process.env.WEBAUTHN_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
  return { rpName, rpID, origin };
};

const storeChallenge = async (key, challenge, ttlSeconds = 60) => {
  const prefixedKey = `passkey_challenge:${key}`;
  try {
    await setCache(prefixedKey, challenge, ttlSeconds);
  } catch (err) {
    console.warn('Passkey challenge Redis save failed, using memory fallback:', err.message);
  }
  memoryChallengeStore.set(prefixedKey, { challenge, expiresAt: Date.now() + ttlSeconds * 1000 });
};

const retrieveAndClearChallenge = async (key) => {
  const prefixedKey = `passkey_challenge:${key}`;
  let challenge = null;

  try {
    challenge = await getCache(prefixedKey);
    if (challenge) {
      await invalidateCache(prefixedKey);
    }
  } catch (err) {
    console.warn('Passkey challenge Redis fetch failed:', err.message);
  }

  if (!challenge && memoryChallengeStore.has(prefixedKey)) {
    const entry = memoryChallengeStore.get(prefixedKey);
    if (entry.expiresAt > Date.now()) {
      challenge = entry.challenge;
    }
    memoryChallengeStore.delete(prefixedKey);
  }

  return challenge;
};

/**
 * Generate WebAuthn registration options for a user
 */
const generateRegisterChallenge = async (user) => {
  const { rpName, rpID } = getRPConfig();

  // Find existing passkeys to exclude them from registration
  const existingPasskeys = await UserPasskey.findAll({
    where: { userId: user.id },
  });

  const excludeCredentials = existingPasskeys.map((pk) => ({
    id: pk.credentialId,
    transports: pk.transports || undefined,
  }));

  const options = await webAuthnDriver.generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await storeChallenge(`reg_${user.id}`, options.challenge, 60);

  return options;
};

/**
 * Verify WebAuthn registration response and save the passkey
 */
const verifyRegister = async (user, responseData, deviceName = 'Passkey Device') => {
  const { rpID, origin } = getRPConfig();
  const expectedChallenge = await retrieveAndClearChallenge(`reg_${user.id}`);

  if (!expectedChallenge) {
    throw new Error('Registration challenge expired or not found. Please try again.');
  }

  const verification = await webAuthnDriver.verifyRegistrationResponse({
    response: responseData,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WebAuthn registration verification failed');
  }

  const { credential, aaguid } = verification.registrationInfo;

  // Convert Uint8Array to base64url string if needed or store encoded public key
  const credentialId = typeof credential.id === 'string' ? credential.id : Buffer.from(credential.id).toString('base64url');
  const publicKeyStr = Buffer.from(credential.publicKey).toString('base64url');

  // Check if credential ID already exists
  const existing = await UserPasskey.findOne({ where: { credentialId } });
  if (existing) {
    throw new Error('This passkey is already registered.');
  }

  const passkey = await UserPasskey.create({
    userId: user.id,
    credentialId,
    publicKey: publicKeyStr,
    counter: credential.counter,
    deviceName: deviceName || 'Passkey Device',
    transports: responseData.response?.transports || [],
    aaguid: aaguid || null,
    lastUsedAt: new Date(),
  });

  return { verified: true, passkey };
};

/**
 * Generate WebAuthn authentication options for passwordless login
 */
const generateLoginChallenge = async (email = null) => {
  const { rpID } = getRPConfig();

  let allowCredentials = undefined;
  let challengeKey = 'global_login';

  if (email) {
    const user = await User.findOne({ where: { email } });
    if (user) {
      challengeKey = `login_${user.id}`;
      const userPasskeys = await UserPasskey.findAll({ where: { userId: user.id } });
      if (userPasskeys.length > 0) {
        allowCredentials = userPasskeys.map((pk) => ({
          id: pk.credentialId,
          transports: pk.transports || undefined,
        }));
      }
    }
  }

  const options = await webAuthnDriver.generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials,
  });

  const sessionChallengeId = `challenge_${options.challenge}`;
  await storeChallenge(sessionChallengeId, options.challenge, 60);

  return { options, challengeId: sessionChallengeId };
};

/**
 * Verify WebAuthn authentication response and return authenticated user
 */
const verifyLogin = async (responseData, challengeId) => {
  const { rpID, origin } = getRPConfig();
  const expectedChallenge = await retrieveAndClearChallenge(challengeId);

  if (!expectedChallenge) {
    throw new Error('Authentication challenge expired or invalid. Please try again.');
  }

  const credentialId = responseData.id;
  const passkey = await UserPasskey.findOne({
    where: { credentialId },
    include: [{ model: User, as: 'userRef' }],
  });

  if (!passkey || !passkey.userRef) {
    throw new Error('Passkey not recognized or associated user not found');
  }

  const publicKeyBuffer = Buffer.from(passkey.publicKey, 'base64url');

  const verification = await webAuthnDriver.verifyAuthenticationResponse({
    response: responseData,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: publicKeyBuffer,
      counter: Number(passkey.counter),
      transports: passkey.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error('WebAuthn authentication verification failed');
  }

  // Update passkey counter and lastUsedAt to prevent replay attacks
  passkey.counter = verification.authenticationInfo.newCounter;
  passkey.lastUsedAt = new Date();
  await passkey.save();

  return { verified: true, user: passkey.userRef, passkey };
};

/**
 * Get all passkeys registered by a user
 */
const getUserPasskeys = async (userId) => {
  return await UserPasskey.findAll({
    where: { userId },
    attributes: ['id', 'credentialId', 'deviceName', 'transports', 'aaguid', 'lastUsedAt', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Delete / revoke a user's passkey
 */
const deleteUserPasskey = async (userId, passkeyId) => {
  const passkey = await UserPasskey.findOne({
    where: { id: passkeyId, userId },
  });

  if (!passkey) {
    throw new Error('Passkey not found or unauthorized to delete');
  }

  await passkey.destroy();
  return { success: true };
};

module.exports = {
  generateRegisterChallenge,
  verifyRegister,
  generateLoginChallenge,
  verifyLogin,
  getUserPasskeys,
  deleteUserPasskey,
  getRPConfig,
  webAuthnDriver,
  _memoryChallengeStore: memoryChallengeStore,
};
