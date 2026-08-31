/**
 * Unit tests for SSO Domain Discovery & Boundary Validation (#2198).
 */

const { findInstitutionByEmail } = require('../../config/ssoInstitutions');
const { discoverSso } = require('../../middleware/ssoDiscovery');

describe('Institutional SSO Domain Discovery (#2198)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('findInstitutionByEmail', () => {
    it('should find institution for exact matching domain (mit.edu)', () => {
      const inst = findInstitutionByEmail('student@mit.edu');
      expect(inst).not.toBeNull();
      expect(inst.id).toBe('inst-mit');
      expect(inst.protocol).toBe('oidc');
    });

    it('should find institution for subdomain matching (csail.mit.edu)', () => {
      const inst = findInstitutionByEmail('researcher@csail.mit.edu');
      expect(inst).not.toBeNull();
      expect(inst.id).toBe('inst-mit');
    });

    it('should find institution for SAML provider (stanford.edu)', () => {
      const inst = findInstitutionByEmail('student@stanford.edu');
      expect(inst).not.toBeNull();
      expect(inst.id).toBe('inst-stanford');
      expect(inst.protocol).toBe('saml');
    });

    it('should REJECT suffix spoofing domain (evil-mit.edu / evilstanford.edu)', () => {
      expect(findInstitutionByEmail('attacker@evilmit.edu')).toBeNull();
      expect(findInstitutionByEmail('attacker@evilstanford.edu')).toBeNull();
      expect(findInstitutionByEmail('attacker@mit.edu.evil.com')).toBeNull();
    });

    it('should return null for malformed or unconfigured emails', () => {
      expect(findInstitutionByEmail(null)).toBeNull();
      expect(findInstitutionByEmail('invalid-email')).toBeNull();
      expect(findInstitutionByEmail('user@gmail.com')).toBeNull();
    });
  });

  describe('discoverSso Middleware', () => {
    it('should attach ssoInstitution to req and call next() for configured domain', () => {
      req.body = { email: 'student@mit.edu' };
      discoverSso(req, res, next);
      expect(req.ssoInstitution).toBeDefined();
      expect(req.ssoInstitution.id).toBe('inst-mit');
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if email is missing', () => {
      discoverSso(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('required') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if domain has no SSO configured', () => {
      req.body = { email: 'student@unknown.edu' };
      discoverSso(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, ssoAvailable: false })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
