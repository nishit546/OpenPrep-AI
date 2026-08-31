import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import certificateVerificationController from '../../controllers/certificateVerificationController';

describe('Certificate Verification Controller Endpoints', () => {
  const app = express();
  app.use(express.json());
  app.use(certificateVerificationController);

  it('GET /api/certificates/verify/:certId returns verified certificate payload with proof', async () => {
    const res = await request(app).get('/api/certificates/verify/c8f74211-1963-4063-8a3d-0970abc12345');

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.authenticityStatus).toBe('CRYPTOGRAPHICALLY_SECURE');
    expect(res.body.recipientName).toBe('Aditya Patel');
    expect(res.body.credentialTitle).toBe('30-Day Intensive Data Structures Sprint Mastery');
    expect(res.body.signatureVerificationProof).toBeDefined();
    expect(res.body.signatureVerificationProof.length).toBe(64);
  });

  it('GET /api/certificates/verify/:certId returns 404 for unrecorded certId', async () => {
    const res = await request(app).get('/api/certificates/verify/non-existent-uuid-999');

    expect(res.status).toBe(404);
    expect(res.body.verified).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('POST /api/certificates/mint mints a new certificate artifact', async () => {
    const res = await request(app)
      .post('/api/certificates/mint')
      .send({
        recipientName: 'Sara Connor',
        credentialTitle: 'Cybersecurity Mastery',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.certificate.id).toBeDefined();
    expect(res.body.certificate.recipientName).toBe('Sara Connor');

    // Verify it can be retrieved via GET verify endpoint
    const verifyRes = await request(app).get(`/api/certificates/verify/${res.body.certificate.id}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.recipientName).toBe('Sara Connor');
  });

  it('GET /api/certificates/:certId/pdf streams PDF document with application/pdf Content-Type', async () => {
    const res = await request(app).get('/api/certificates/c8f74211-1963-4063-8a3d-0970abc12345/pdf');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body).toBeDefined();
  });
});
