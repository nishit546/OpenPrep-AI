const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

const errorHandler = require('../../middleware/error');

/**
 * Helper: send n requests sequentially to the given app/path.
 * Sequential sends are required because express-rate-limit counts per-request.
 */
async function sendNRequests(app, method, path, n, token) {
  const results = [];
  for (let i = 0; i < n; i++) {
    let req;
    if (method === 'POST') {
      req = request(app).post(path).send({});
    } else {
      req = request(app).get(path);
    }
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    // eslint-disable-next-line no-await-in-loop
    results.push(await req);
  }
  return results;
}

/**
 * Create a test app with the given rate limiter middleware.
 * Each call creates a fresh app + fresh rate limiter instance.
 */
function createTestApp(limiterOptions) {
  const limiter = rateLimit(limiterOptions);
  const app = express();
  app.use(express.json());
  app.get('/test', limiter, (req, res) => {
    res.status(200).json({ success: true, data: 'ok' });
  });
  app.use(errorHandler);
  return app;
}

describe('Rate Limiter Middleware - aiLimiter (10 req/min)', () => {
  // Each test gets a fresh app with a fresh rate limiter instance
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    app = createTestApp({
      windowMs: 60 * 1000,
      max: 10,
      skip: () => process.env.NODE_ENV === 'test',
      message: {
        success: false,
        error: 'Too many AI requests. Please wait a moment before generating more content.',
      },
      standardHeaders: true,
      legacyHeaders: true,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should allow requests within the rate limit', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should include rate limit headers on responses', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
    expect(Number(res.headers['ratelimit-limit'])).toBe(10);
  });

  it('should return 429 when rate limit is exceeded', async () => {
    const results = await sendNRequests(app, 'GET', '/test', 11);

    const okCount = results.filter((r) => r.status === 200).length;
    const blockCount = results.filter((r) => r.status === 429).length;

    expect(okCount).toBe(10);
    expect(blockCount).toBe(1);

    const blocked = results.find((r) => r.status === 429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toBeDefined();
    expect(typeof blocked.body.error).toBe('string');
  });
});

describe('Rate Limiter Middleware - strictAiLimiter (5 req/min)', () => {
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    app = createTestApp({
      windowMs: 60 * 1000,
      max: 5,
      skip: () => process.env.NODE_ENV === 'test',
      message: {
        success: false,
        error: 'Too many AI analysis requests. Please wait a moment before uploading more files.',
      },
      standardHeaders: true,
      legacyHeaders: true,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should allow requests within the strict rate limit', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 429 when strict rate limit is exceeded', async () => {
    const results = await sendNRequests(app, 'GET', '/test', 6);

    const okCount = results.filter((r) => r.status === 200).length;
    const blockCount = results.filter((r) => r.status === 429).length;

    expect(okCount).toBe(5);
    expect(blockCount).toBe(1);
  });

  it('should skip rate limiting when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';

    const results = await sendNRequests(app, 'GET', '/test', 20);
    const allOk = results.every((r) => r.status === 200);
    expect(allOk).toBe(true);
  });
});

describe('Rate Limiter - Actual Middleware Module', () => {
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    // Re-require fresh middleware instances by clearing the require cache
    const { aiLimiter: freshAiLimiter } = require('../../middleware/rateLimiter');

    app = express();
    app.use(express.json());
    app.get('/test-ai', freshAiLimiter, (req, res) => {
      res.status(200).json({ success: true, data: 'ok' });
    });
    app.use(errorHandler);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
    // Clean module cache so next describe block gets fresh instances
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
  });

  it('should use the actual aiLimiter config (10 req/min)', async () => {
    const results = await sendNRequests(app, 'GET', '/test-ai', 11);
    expect(results.filter((r) => r.status === 200)).toHaveLength(10);
    expect(results.filter((r) => r.status === 429)).toHaveLength(1);
  });

  it('should use the actual strictAiLimiter config (5 req/min)', async () => {
    process.env.NODE_ENV = 'development';
    // Clear cache again to get fresh instance
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
    const { strictAiLimiter: freshAiLimiter } = require('../../middleware/rateLimiter');

    const strictApp = express();
    strictApp.use(express.json());
    strictApp.get('/test-strict', freshAiLimiter, (req, res) => {
      res.status(200).json({ success: true, data: 'ok' });
    });
    strictApp.use(errorHandler);

    const results = await sendNRequests(strictApp, 'GET', '/test-strict', 6);
    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(results.filter((r) => r.status === 429)).toHaveLength(1);
  });

  it('should skip rate limiting in test environment', async () => {
    process.env.NODE_ENV = 'test';
    // Clear cache to get fresh instance with test env
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
    const { strictAiLimiter: freshLimiter } = require('../../middleware/rateLimiter');

    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test', freshLimiter, (req, res) => {
      res.status(200).json({ success: true, data: 'ok' });
    });
    testApp.use(errorHandler);

    const results = await sendNRequests(testApp, 'GET', '/test', 20);
    const allOk = results.every((r) => r.status === 200);
    expect(allOk).toBe(true);
  });
});

describe('Rate Limiter - Mounted on Routes', () => {
  let app;
  let jwtToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_rate_limiter_int';
    const jwt = require('jsonwebtoken');
    const { v4: uuidv4 } = require('uuid');
    jwtToken = jwt.sign({ id: uuidv4(), type: 'access' }, process.env.JWT_SECRET);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'development';

    // Clear module cache to get fresh middleware instances
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
    const { aiLimiter } = require('../../middleware/rateLimiter');

    const mockProtect = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
      }
      req.user = { id: 'test-user-id' };
      next();
    };

    app = express();
    app.use(express.json());

    const router = express.Router();
    router.post('/generate-ai', mockProtect, aiLimiter, (req, res) => {
      res.status(200).json({ success: true, data: 'generated' });
    });
    app.use('/api/flashcards', router);

    app.use(errorHandler);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should allow requests within limit through protected routes', async () => {
    const res = await request(app)
      .post('/api/flashcards/generate-ai')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should block requests after exceeding rate limit on mounted routes', async () => {
    const results = [];
    for (let i = 0; i < 11; i++) {
      // eslint-disable-next-line no-await-in-loop
      results.push(
        await request(app)
          .post('/api/flashcards/generate-ai')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({})
      );
    }

    const okCount = results.filter((r) => r.status === 200).length;
    const blockCount = results.filter((r) => r.status === 429).length;

    expect(okCount).toBe(10);
    expect(blockCount).toBe(1);

    const blocked = results.find((r) => r.status === 429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toBeTruthy();
  });

  it('should return 401 if no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/flashcards/generate-ai')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Rate Limiter Middleware - authEmailLimiter (3 req/15 min)', () => {
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    
    // Clear cache to get fresh instance
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
    const { authEmailLimiter: freshLimiter } = require('../../middleware/rateLimiter');

    app = express();
    app.use(express.json());
    app.post('/api/auth/forgot-password', freshLimiter, (req, res) => {
      res.status(200).json({ success: true, message: 'email sent' });
    });
    app.post('/api/auth/resend-verification', freshLimiter, (req, res) => {
      res.status(200).json({ success: true, message: 'email sent' });
    });
    app.use(errorHandler);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should allow up to 3 requests within the limit', async () => {
    const results = await sendNRequests(app, 'POST', '/api/auth/forgot-password', 3);
    const allOk = results.every((r) => r.status === 200);
    expect(allOk).toBe(true);
  });

  it('should return 429 and standard error response when limit is exceeded', async () => {
    const results = await sendNRequests(app, 'POST', '/api/auth/forgot-password', 4);
    
    const okCount = results.filter((r) => r.status === 200).length;
    const blockCount = results.filter((r) => r.status === 429).length;

    expect(okCount).toBe(3);
    expect(blockCount).toBe(1);

    const blocked = results.find((r) => r.status === 429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toBe('Too many requests. Please try again after 15 minutes.');
  });

  it('should enforce rate limits on resend-verification endpoint', async () => {
    const results = await sendNRequests(app, 'POST', '/api/auth/resend-verification', 4);
    
    const okCount = results.filter((r) => r.status === 200).length;
    const blockCount = results.filter((r) => r.status === 429).length;

    expect(okCount).toBe(3);
    expect(blockCount).toBe(1);

    const blocked = results.find((r) => r.status === 429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error).toBe('Too many requests. Please try again after 15 minutes.');
  });
});

describe('Tiered Token Bucket Rate Limiter Middleware', () => {
  let app;
  let jwtSecret;

  beforeAll(() => {
    jwtSecret = process.env.JWT_SECRET || 'test_secret';
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete require.cache[require.resolve('../../middleware/rateLimiter')];
    const rateLimiter = require('../../middleware/rateLimiter');

    app = express();
    app.use(express.json());

    // Mock authentication middleware locally for tests
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token === 'student_token') {
          req.user = { id: 'student_123', role: 'student' };
        } else if (token === 'admin_token') {
          req.user = { id: 'admin_456', role: 'admin' };
        }
      }
      next();
    });

    app.get('/api/general-endpoint', rateLimiter, (req, res) => {
      res.status(200).json({ success: true, type: 'general' });
    });

    app.get('/api/ai/generation', rateLimiter, (req, res) => {
      res.status(200).json({ success: true, type: 'ai' });
    });

    app.use(errorHandler);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('Guest / Unauthenticated Tier', () => {
    it('blocks guests from accessing AI endpoints with 403 Forbidden', async () => {
      const res = await request(app).get('/api/ai/generation');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('locked for guests');
    });

    it('limits guest general requests to 10 per minute', async () => {
      const results = await sendNRequests(app, 'GET', '/api/general-endpoint', 11);
      expect(results.filter(r => r.status === 200)).toHaveLength(10);
      expect(results.filter(r => r.status === 429)).toHaveLength(1);
    });
  });

  describe('Standard Student Tier', () => {
    it('limits standard student general requests to 60 per minute', async () => {
      // Opt-in for rate limiting
      const results = await sendNRequests(app, 'GET', '/api/general-endpoint', 61, 'student_token');
      expect(results.filter(r => r.status === 200)).toHaveLength(60);
      expect(results.filter(r => r.status === 429)).toHaveLength(1);
    });

    it('limits standard student AI requests to 30 per hour', async () => {
      const results = await sendNRequests(app, 'GET', '/api/ai/generation', 31, 'student_token');
      expect(results.filter(r => r.status === 200)).toHaveLength(30);
      expect(results.filter(r => r.status === 429)).toHaveLength(1);
    });
  });

  describe('Admin / Moderator Tier', () => {
    it('limits admin general requests to 120 per minute', async () => {
      const results = await sendNRequests(app, 'GET', '/api/general-endpoint', 121, 'admin_token');
      expect(results.filter(r => r.status === 200)).toHaveLength(120);
      expect(results.filter(r => r.status === 429)).toHaveLength(1);
    });

    it('limits admin AI requests to 100 per hour', async () => {
      const results = await sendNRequests(app, 'GET', '/api/ai/generation', 101, 'admin_token');
      expect(results.filter(r => r.status === 200)).toHaveLength(100);
      expect(results.filter(r => r.status === 429)).toHaveLength(1);
    });
  });
});

