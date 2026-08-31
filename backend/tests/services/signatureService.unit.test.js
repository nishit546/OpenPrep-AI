const {
  generateDigitalSignature,
  verifyDigitalSignature,
  renderDigitalSignatureSeal,
} = require('../../services/signatureService');
const PDFDocument = require('pdfkit');

describe('signatureService Unit Tests', () => {
  const mockPayload = {
    noteIds: ['note-uuid-1', 'note-uuid-2'],
    userId: 'user-uuid-123',
    userEmail: 'student@openprep.ai',
    studentName: 'Rushabh Mahajan',
    timestamp: '2026-08-29T20:00:00.000Z',
  };

  const secretKey = 'test-signing-secret-key';

  describe('generateDigitalSignature', () => {
    it('should generate a valid signature object with certId and sha256 hash', () => {
      const sig = generateDigitalSignature(mockPayload, secretKey);

      expect(sig).toBeDefined();
      expect(sig.certId).toMatch(/^CERT-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(sig.signatureHash).toMatch(/^[a-f0-9]{64}$/);
      expect(sig.issuer).toBe('OpenPrep Digital Signing Engine v1.0');
      expect(sig.signer.userEmail).toBe('student@openprep.ai');
    });

    it('should generate deterministic hashes regardless of noteId array ordering', () => {
      const payloadOrdered = { ...mockPayload, noteIds: ['note-1', 'note-2', 'note-3'] };
      const payloadUnordered = { ...mockPayload, noteIds: ['note-3', 'note-1', 'note-2'] };

      const sig1 = generateDigitalSignature(payloadOrdered, secretKey);
      const sig2 = generateDigitalSignature(payloadUnordered, secretKey);

      expect(sig1.signatureHash).toBe(sig2.signatureHash);
    });
  });

  describe('verifyDigitalSignature', () => {
    it('should return true for authentic signatures matching the payload', () => {
      const sig = generateDigitalSignature(mockPayload, secretKey);
      const isValid = verifyDigitalSignature(mockPayload, sig.signatureHash, secretKey);

      expect(isValid).toBe(true);
    });

    it('should return false if payload data is tampered with', () => {
      const sig = generateDigitalSignature(mockPayload, secretKey);
      const tamperedPayload = { ...mockPayload, userId: 'hacker-uuid-999' };

      const isValid = verifyDigitalSignature(tamperedPayload, sig.signatureHash, secretKey);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid signature strings or empty inputs', () => {
      expect(verifyDigitalSignature(mockPayload, '', secretKey)).toBe(false);
      expect(verifyDigitalSignature(mockPayload, 'invalid-hex', secretKey)).toBe(false);
      expect(verifyDigitalSignature(mockPayload, null, secretKey)).toBe(false);
    });
  });

  describe('renderDigitalSignatureSeal', () => {
    it('should render signature seal box onto PDFKit document without throwing errors', () => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const sig = generateDigitalSignature(mockPayload, secretKey);

      expect(() => {
        renderDigitalSignatureSeal(doc, sig);
      }).not.toThrow();
    });
  });
});
