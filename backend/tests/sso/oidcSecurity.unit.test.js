/**
 * Security unit tests for OpenID Connect (OIDC) token verification (#2198).
 */

const jwt = require('jsonwebtoken');
const { validateIdTokenClaims, createAuthorizationUrl, consumeState, oidcStateStore } = require('../../services/oidcService');

describe('OIDC Security & Token Verification (#2198)', () => {
  const secret = 'test-rsa-mock-secret';
  const expectedIssuer = 'https://auth.mit.edu/oidc';
  const expectedAudience = 'openprep-mit-client-id';
  const expectedNonce = 'nonce-12345';

  function createMockIdToken(claims = {}) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'user-sub-101',
      iss: expectedIssuer,
      aud: expectedAudience,
      nonce: expectedNonce,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
      nbf: nowSeconds - 10,
      email: 'student@mit.edu',
      email_verified: true,
      ...claims,
    };
    return jwt.sign(payload, secret);
  }

  afterEach(() => {
    oidcStateStore.clear();
  });

  describe('validateIdTokenClaims', () => {
    it('should successfully validate a valid OIDC ID Token', () => {
      const token = createMockIdToken();
      const verified = validateIdTokenClaims(token, {
        expectedIssuer,
        expectedAudience,
        expectedNonce,
      });

      expect(verified.sub).toBe('user-sub-101');
      expect(verified.email).toBe('student@mit.edu');
    });

    it('should REJECT token with wrong issuer', () => {
      const token = createMockIdToken({ iss: 'https://attacker-idp.com' });
      expect(() => {
        validateIdTokenClaims(token, { expectedIssuer, expectedAudience, expectedNonce });
      }).toThrow(/Issuer mismatch/);
    });

    it('should REJECT token with wrong audience', () => {
      const token = createMockIdToken({ aud: 'wrong-client-id' });
      expect(() => {
        validateIdTokenClaims(token, { expectedIssuer, expectedAudience, expectedNonce });
      }).toThrow(/Audience mismatch/);
    });

    it('should REJECT token with wrong or reused nonce', () => {
      const token = createMockIdToken({ nonce: 'manipulated-nonce' });
      expect(() => {
        validateIdTokenClaims(token, { expectedIssuer, expectedAudience, expectedNonce });
      }).toThrow(/Nonce mismatch/);
    });

    it('should REJECT expired token beyond allowed ±60s clock skew window', () => {
      const past = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
      const token = createMockIdToken({ exp: past });
      expect(() => {
        validateIdTokenClaims(token, { expectedIssuer, expectedAudience, expectedNonce, clockSkewSeconds: 60 });
      }).toThrow(/expired beyond allowed clock skew/);
    });

    it('should ACCEPT slightly expired token within ±60s clock skew window', () => {
      const slightlyPast = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
      const token = createMockIdToken({ exp: slightlyPast });
      const verified = validateIdTokenClaims(token, {
        expectedIssuer,
        expectedAudience,
        expectedNonce,
        clockSkewSeconds: 60,
      });
      expect(verified.sub).toBe('user-sub-101');
    });
  });

  describe('createAuthorizationUrl & consumeState', () => {
    const mockInst = {
      id: 'inst-mit',
      domains: ['mit.edu'],
      clientId: 'openprep-mit-client-id',
      redirectUri: 'http://localhost:5000/api/auth/sso/oidc/callback',
      authorizationEndpoint: 'https://auth.mit.edu/oidc/auth',
    };

    it('should generate auth URL containing state, nonce, and S256 PKCE code_challenge', () => {
      const { authUrl, state } = createAuthorizationUrl(mockInst);
      expect(authUrl).toContain('https://auth.mit.edu/oidc/auth');
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('code_challenge=');
    });

    it('should consume state once and reject duplicate/invalid state calls', () => {
      const { state } = createAuthorizationUrl(mockInst);
      const session = consumeState(state);
      expect(session.institutionId).toBe('inst-mit');

      // Re-consuming same state must throw CSRF error
      expect(() => consumeState(state)).toThrow(/Invalid or expired OIDC state/);
    });
  });
});
