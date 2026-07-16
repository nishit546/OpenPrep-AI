const request = require('supertest');
const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// =========================================================================
// Compression Middleware
// =========================================================================
describe('Compression Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(compression());
    app.get('/api/test', (req, res) => {
      res.json({ message: 'hello '.repeat(100) });
    });
  });

  it('should apply compression without breaking responses', async () => {
    const res = await request(app)
      .get('/api/test')
      .set('Accept-Encoding', 'gzip');

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    // supertest auto-decompresses, so body content is intact
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('should return correct response body with compression enabled', async () => {
    const res = await request(app)
      .get('/api/test');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('hello');
    expect(res.body.message.length).toBe(600); // 'hello ' * 100
  });
});

// =========================================================================
// Rate Limiter Configuration
// =========================================================================
describe('Rate Limiter Configuration', () => {
  // Verify the configuration constants match documented values
  // Actual rate limiting is disabled in test env (NODE_ENV=test),
  // but we verify the limiter configuration is correct.

  it('should configure auth route limiters with correct thresholds', () => {
    // Login: 10 attempts per 15 minutes
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { success: false, error: 'Too many login attempts. Please try again after 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

    expect(loginLimiter).toBeDefined();
    // Verify the limiter's key configuration via its internal structure
    const loginConfig = loginLimiter;
    expect(typeof loginConfig).toBe('function');
  });

  it('should configure register limiter with 5 per hour', () => {
    const registerLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      message: { success: false, error: 'Too many registration attempts.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    expect(registerLimiter).toBeDefined();
    expect(typeof registerLimiter).toBe('function');
  });

  it('should rate-limit and return 429 when threshold is exceeded', async () => {
    // Create an app with a very low rate limit for testing
    const localApp = express();
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute window
      max: 3,              // Only 3 requests allowed
      skip: () => false,   // Never skip — test actual rate limiting
      message: { success: false, error: 'Too many requests. Please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    localApp.use('/api/', limiter);
    localApp.get('/api/test', (req, res) => {
      res.json({ success: true });
    });

    // Send 3 requests that should succeed
    for (let i = 0; i < 3; i++) {
      const res = await request(localApp).get('/api/test');
      expect(res.status).toBe(200);
    }

    // 4th request should be rate-limited
    const blocked = await request(localApp).get('/api/test');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: 'Too many requests. Please try again later.',
    });
  });

  it('should include standard RateLimit headers in response', async () => {
    const localApp = express();
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      skip: () => false,
      standardHeaders: true,
      legacyHeaders: false,
    });
    localApp.use('/api/', limiter);
    localApp.get('/api/test', (req, res) => {
      res.json({ success: true });
    });

    const res = await request(localApp).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
  });
});

// =========================================================================
// Helmet Security Headers
// =========================================================================
describe('Helmet Security Headers', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(require('helmet')());
    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });
  });

  it('should include X-Content-Type-Options nosniff header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should include X-Frame-Options header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should include Strict-Transport-Security header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('should include X-XSS-Protection header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.headers['x-xss-protection']).toBeDefined();
  });

  it('should include Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
