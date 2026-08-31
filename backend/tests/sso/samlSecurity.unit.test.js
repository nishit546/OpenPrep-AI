/**
 * Security unit tests for SAML 2.0 Assertion Validation & Replay Protection (#2198).
 */

const {
  validateSamlAssertionClaims,
  createSamlAuthnRequestUrl,
  validateSamlRequestId,
  samlRequestStore,
} = require('../../services/samlService');

describe('SAML 2.0 Security & Assertion Validation (#2198)', () => {
  const expectedIssuer = 'https://openprep.ai/shibboleth';
  const expectedAudience = 'https://openprep.ai/shibboleth';

  function createMockAssertion(overrides = {}) {
    const now = Date.now();
    return {
      id: `saml-assertion-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      issuer: expectedIssuer,
      audience: expectedAudience,
      inResponseTo: '_mock_req_123',
      notBefore: new Date(now - 10000).toISOString(),
      notOnOrAfter: new Date(now + 300000).toISOString(),
      attributes: {
        email: 'student@stanford.edu',
        name: 'Stanford Student',
        eduPersonAffiliation: ['student'],
      },
      ...overrides,
    };
  }

  afterEach(() => {
    samlRequestStore.clear();
  });

  describe('validateSamlAssertionClaims', () => {
    it('should validate a valid SAML Assertion', async () => {
      const assertion = createMockAssertion();
      const verified = await validateSamlAssertionClaims(assertion, {
        expectedIssuer,
        expectedAudience,
      });

      expect(verified.assertionId).toBe(assertion.id);
      expect(verified.attributes.email).toBe('student@stanford.edu');
    });

    it('should REJECT assertion with wrong issuer', async () => {
      const assertion = createMockAssertion({ issuer: 'https://attacker-idp.com' });
      await expect(
        validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience })
      ).rejects.toThrow(/Issuer mismatch/);
    });

    it('should REJECT assertion with wrong audience', async () => {
      const assertion = createMockAssertion({ audience: 'https://wrong-sp.com' });
      await expect(
        validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience })
      ).rejects.toThrow(/Audience mismatch/);
    });

    it('should REJECT replayed Assertion ID (replay attack prevention)', async () => {
      const assertion = createMockAssertion({ id: 'replayed-assertion-id-999' });

      // First evaluation succeeds
      await validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience });

      // Second evaluation with identical Assertion ID MUST be rejected as replay
      await expect(
        validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience })
      ).rejects.toThrow(/Replay Attack detected/);
    });

    it('should REJECT assertion expired beyond allowed ±60s clock skew window', async () => {
      const past = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      const assertion = createMockAssertion({ notOnOrAfter: past });

      await expect(
        validateSamlAssertionClaims(assertion, { expectedIssuer, expectedAudience, clockSkewSeconds: 60 })
      ).rejects.toThrow(/expired beyond allowed clock skew/);
    });
  });

  describe('createSamlAuthnRequestUrl & Request Correlation', () => {
    const mockInst = {
      id: 'inst-stanford',
      domains: ['stanford.edu'],
      entryPoint: 'https://idp.stanford.edu/idp/profile/SAML2/Redirect/SSO',
      issuer: 'https://openprep.ai/shibboleth',
      callbackUrl: 'http://localhost:5000/api/auth/sso/saml/callback',
    };

    it('should generate SAML AuthnRequest URL with SAMLRequest parameter', () => {
      const { authUrl, requestId } = createSamlAuthnRequestUrl(mockInst);
      expect(authUrl).toContain('https://idp.stanford.edu/idp/profile/SAML2/Redirect/SSO');
      expect(authUrl).toContain('SAMLRequest=');
      expect(requestId).toMatch(/^_[a-f0-9]{32}$/);
    });

    it('should correlate InResponseTo and reject invalid/reused request IDs', () => {
      const { requestId } = createSamlAuthnRequestUrl(mockInst);
      const session = validateSamlRequestId(requestId);
      expect(session.institutionId).toBe('inst-stanford');

      // Re-verifying must fail
      expect(() => validateSamlRequestId(requestId)).toThrow(/Invalid or unrecognised SAML/);
    });
  });
});
