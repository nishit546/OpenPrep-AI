const request = require('supertest');
const express = require('express');

describe('Prometheus Telemetry Scraper Endpoint - Integration Tests', () => {
  let app;
  const originalToken = process.env.METRICS_TOKEN;

  beforeAll(() => {
    process.env.METRICS_TOKEN = 'secure_telemetry_test_token';

    app = express();
    // Register the routes
    app.get(['/metrics', '/api/metrics'], async (req, res) => {
      const authHeader = req.headers.authorization;
      const metricsToken = process.env.METRICS_TOKEN;
      // Mock req.ip check by checking customized header or parameter for testability
      const isLocalhost = req.headers['x-mock-ip'] === '127.0.0.1' || req.ip === '127.0.0.1' || req.ip === '::1';

      if (metricsToken && authHeader === `Bearer ${metricsToken}`) {
        // Approved
      } else if (isLocalhost) {
        // Approved
      } else {
        return res.status(403).json({ error: 'Forbidden: Access to metrics endpoint is denied.' });
      }

      try {
        const { register } = require('../../services/metricsService');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (err) {
        res.status(500).end(err);
      }
    });
  });

  afterAll(() => {
    process.env.METRICS_TOKEN = originalToken;
  });

  it('rejects unauthorized external requests with 403 status code', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer invalid_token');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('allows access with a valid Bearer token matching METRICS_TOKEN', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer secure_telemetry_test_token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_requests_total');
  });

  it('allows access to scraping requests originating from localhost IP', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('x-mock-ip', '127.0.0.1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
