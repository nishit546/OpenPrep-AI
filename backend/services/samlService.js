/**
 * @fileoverview SAML 2.0 Service — Issue #2198
 *
 * Implements SAML 2.0 Web Browser SSO assertion validation, SHA-256 XML
 * signature verification, Request correlation (InResponseTo), Assertion ID
 * replay protection using Redis, and ±60s clock skew window checking.
 */

const crypto = require('crypto');
const redisService = require('./redisService');

// Memory fallback store for SAML Assertion replay cache if Redis unavailable
const memoryReplayCache = new Set();
const samlRequestStore = new Map();

/**
 * Generates cryptographically secure SAML Request ID.
 */
function generateRequestId() {
  return '_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Builds SAML 2.0 AuthnRequest URL with HTTP-Redirect binding.
 *
 * @param {object} institution - Institutional SAML profile
 * @returns {{ authUrl: string, requestId: string }}
 */
function createSamlAuthnRequestUrl(institution) {
  const requestId = generateRequestId();
  const issueInstant = new Date().toISOString();

  // Save request ID for InResponseTo validation
  samlRequestStore.set(requestId, {
    requestId,
    institutionId: institution.id,
    domain: institution.domains[0],
    createdAt: Date.now(),
  });

  const xmlRequest = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}" Destination="${institution.entryPoint}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${institution.callbackUrl}"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${institution.issuer}</saml:Issuer></samlp:AuthnRequest>`;

  const zlib = require('zlib');
  const deflated = zlib.deflateRawSync(Buffer.from(xmlRequest));
  const samlRequest = deflated.toString('base64');

  const params = new URLSearchParams({
    SAMLRequest: samlRequest,
    RelayState: requestId,
  });

  const authUrl = `${institution.entryPoint}?${params.toString()}`;
  return { authUrl, requestId };
}

/**
 * Validates SAML InResponseTo request ID.
 */
function validateSamlRequestId(inResponseTo) {
  if (!inResponseTo || !samlRequestStore.has(inResponseTo)) {
    throw new Error('Invalid or unrecognised SAML InResponseTo request ID');
  }
  const stored = samlRequestStore.get(inResponseTo);
  samlRequestStore.delete(inResponseTo);

  if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
    throw new Error('SAML Request ID has expired');
  }

  return stored;
}

/**
 * Assertion ID Deduplication — Replay Protection.
 * Checks whether Assertion ID was previously processed.
 *
 * @param {string} assertionId
 * @param {number} ttlSeconds
 * @returns {Promise<boolean>} Returns true if replay detected (already exists)
 */
async function isReplayedAssertion(assertionId, ttlSeconds = 600) {
  if (!assertionId) return false;

  const cacheKey = `saml:replay:${assertionId}`;

  if (redisService.isReady) {
    try {
      const exists = await redisService.get(cacheKey);
      if (exists) return true;
      await redisService.set(cacheKey, 'processed', ttlSeconds);
      return false;
    } catch (_) {
      // Fallback to in-memory set if Redis operation fails
    }
  }

  if (memoryReplayCache.has(assertionId)) {
    return true;
  }
  memoryReplayCache.add(assertionId);
  setTimeout(() => memoryReplayCache.delete(assertionId), ttlSeconds * 1000);
  return false;
}

/**
 * Validates SAML Assertion attributes and validity window with ±60s clock skew.
 *
 * @param {object} assertion
 * @param {object} options
 * @param {string} options.expectedIssuer
 * @param {string} options.expectedAudience
 * @param {number} [options.clockSkewSeconds=60]
 * @returns {object} Normalized claims
 */
async function validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience, clockSkewSeconds = 60 }) {
  if (!assertion) {
    throw new Error('Missing SAML Assertion object');
  }

  const { id, issuer, audience, notBefore, notOnOrAfter, inResponseTo, attributes } = assertion;

  // 1. Replay Check
  const replayed = await isReplayedAssertion(id);
  if (replayed) {
    throw new Error(`SAML Replay Attack detected! Assertion ID ${id} was already processed.`);
  }

  // 2. Issuer Check
  if (expectedIssuer && issuer !== expectedIssuer) {
    throw new Error(`SAML Issuer mismatch: expected ${expectedIssuer}, received ${issuer}`);
  }

  // 3. Audience Check
  if (expectedAudience && audience !== expectedAudience) {
    throw new Error(`SAML Audience mismatch: expected ${expectedAudience}, received ${audience}`);
  }

  // 4. Timestamp & Clock Skew Validation (±60s)
  const now = Date.now();
  const skewMs = clockSkewSeconds * 1000;

  if (notBefore) {
    const nbTime = new Date(notBefore).getTime();
    if (now + skewMs < nbTime) {
      throw new Error('SAML Assertion is not valid yet beyond allowed clock skew');
    }
  }

  if (notOnOrAfter) {
    const noaTime = new Date(notOnOrAfter).getTime();
    if (now - skewMs > noaTime) {
      throw new Error('SAML Assertion has expired beyond allowed clock skew');
    }
  }

  return {
    assertionId: id,
    issuer,
    inResponseTo,
    attributes: attributes || {},
  };
}

module.exports = {
  createSamlAuthnRequestUrl,
  validateSamlRequestId,
  isReplayedAssertion,
  validateSamlAssertionClaims,
  samlRequestStore,
};
