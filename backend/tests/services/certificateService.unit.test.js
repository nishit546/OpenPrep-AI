import { describe, it, expect } from 'vitest';
import {
  computeCertificateSignature,
  generateCertificatePdf,
  mintCertificate,
  getCertificateRecord,
} from '../../services/certificateService';

describe('Micro-Credential Certificate & Cryptographic Verification Service', () => {
  it('computes a consistent and tamper-proof SHA-256 HMAC signature', () => {
    const certId = 'test-cert-12345';
    const recipientName = 'John Doe';
    const credentialTitle = '100% Syllabus Mastery';

    const sig1 = computeCertificateSignature(certId, recipientName, credentialTitle);
    const sig2 = computeCertificateSignature(certId, recipientName, credentialTitle);

    expect(sig1).toBeDefined();
    expect(typeof sig1).toBe('string');
    expect(sig1.length).toBe(64); // SHA-256 hex string length
    expect(sig1).toBe(sig2); // Deterministic for same inputs

    // Tampered payload produces a completely different hash
    const tamperedSig = computeCertificateSignature(certId, 'Jane Doe', credentialTitle);
    expect(tamperedSig).not.toBe(sig1);
  });

  it('mints a new certificate and records it in the registry', () => {
    const cert = mintCertificate({
      recipientName: 'Alice Smith',
      credentialTitle: '30-Day Streak Milestone',
    });

    expect(cert.id).toBeDefined();
    expect(cert.recipientName).toBe('Alice Smith');
    expect(cert.credentialTitle).toBe('30-Day Streak Milestone');
    expect(cert.signature).toBeDefined();

    const fetched = getCertificateRecord(cert.id);
    expect(fetched).toEqual(cert);
  });

  it('generates a valid, printable PDF buffer for a certificate', async () => {
    const metadata = {
      certId: 'cert-pdf-test-999',
      recipientName: 'Bob Builder',
      credentialTitle: 'Mock Exam 90+ Score',
      issueDate: '2026-08-31',
      signature: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
    };

    const pdfBuffer = await generateCertificatePdf(metadata);

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF"
    const magicHeader = pdfBuffer.slice(0, 4).toString('utf-8');
    expect(magicHeader).toBe('%PDF');
  });
});