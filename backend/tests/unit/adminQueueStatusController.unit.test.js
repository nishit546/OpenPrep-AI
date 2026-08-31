import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const CONTROLLER_PATH = path.join(__dirname, '..', '..', 'controllers', 'adminController.js');
const ROUTES_PATH = path.join(__dirname, '..', '..', 'routes', 'adminRoutes.js');
const SOURCE = fs.readFileSync(CONTROLLER_PATH, 'utf8');
const ROUTES = fs.readFileSync(ROUTES_PATH, 'utf8');

/**
 * `routes/adminRoutes.js` imported `getQueueStatus` from `adminController` and
 * mounted it at line 32. The controller never defined it, so the import
 * resolved to `undefined` and Express rejected the mount at require time:
 *
 *   Error: Route.get() requires a callback function but got a [object Undefined]
 *       at routes/adminRoutes.js:32:8
 *
 * That is a module-load failure, not a per-route one — the whole admin router
 * failed to build, taking every /api/admin/* endpoint down with it, not just
 * the queue one.
 *
 * The service layer was already complete. `services/queueService.js` exports
 * `getQueueStats()` and `getDlqJobs()`, both of which degrade on their own when
 * Redis is down. Only the controller was missing.
 *
 * queueService is required inside the handler, so the doubles go on its exports
 * before the controller is loaded.
 */
const queueService = require('../../services/queueService');

const getQueueStats = vi.fn();
const getDlqJobs = vi.fn();

queueService.getQueueStats = getQueueStats;
queueService.getDlqJobs = getDlqJobs;

delete require.cache[require.resolve('../../controllers/adminController')];
const adminController = require('../../controllers/adminController');

function mockRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

const mockReq = (query = {}) => ({ query, user: { id: 'admin-1', role: 'admin' } });

const activeStats = () => ({ status: 'Active', main: 3, processing: 1, delayed: 2, dlq: 4 });

beforeEach(() => {
  getQueueStats.mockReset().mockResolvedValue(activeStats());
  getDlqJobs.mockReset().mockResolvedValue([{ id: 'job-1', name: 'sendEmail' }]);
  queueService.jobHandlers.clear();
  queueService.jobHandlers.set('sendEmail', () => {});
  queueService.jobHandlers.set('reindex', () => {});
});

describe('the admin router loads', () => {
  it('mounts without throwing', () => {
    // The regression itself. Every /api/admin/* endpoint was unreachable.
    expect(() => require('../../routes/adminRoutes')).not.toThrow();
  });

  it('defines every handler adminRoutes imports from adminController', () => {
    const match = ROUTES.match(
      /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\('\.\.\/controllers\/adminController'\)/
    );

    expect(match).not.toBeNull();

    const imported = match[1]
      .split(',')
      .map((part) => part.split(':').pop().trim())
      .filter(Boolean);

    expect(imported.length).toBeGreaterThan(5);
    expect(imported).toContain('getQueueStatus');

    const undefinedHandlers = imported.filter(
      (name) => typeof adminController[name] !== 'function'
    );

    expect(undefinedHandlers).toEqual([]);
  });

  it('gives every registered admin route a real callback', () => {
    // An undefined import reaches Express as a missing callback, which is the
    // exact shape of this failure one layer down.
    const router = require('../../routes/adminRoutes');

    const broken = router.stack
      .filter((layer) => layer.route)
      .filter((layer) => layer.route.stack.some((entry) => typeof entry.handle !== 'function'))
      .map((layer) => layer.route.path);

    expect(broken).toEqual([]);
  });

  it('registers the queue status route as a GET', () => {
    const router = require('../../routes/adminRoutes');
    const layer = router.stack.find((entry) => entry.route?.path === '/queues/status');

    expect(layer).toBeDefined();
    expect(layer.route.methods.get).toBe(true);
  });

  it('documents the route on the handler', () => {
    expect(SOURCE).toMatch(/@route\s+GET \/api\/admin\/queues\/status/);
    expect(SOURCE).toMatch(/@access\s+Private\/Admin/);
  });
});

describe('getQueueStatus returns the queue depths', () => {
  it('passes the service stats through', async () => {
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toMatchObject({
      status: 'Active',
      main: 3,
      processing: 1,
      delayed: 2,
      dlq: 4,
    });
  });

  it('includes recent dead-letter jobs', async () => {
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.payload.data.dlqJobs).toEqual([{ id: 'job-1', name: 'sendEmail' }]);
  });

  it('lists the registered job handlers', async () => {
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.payload.data.registeredHandlers).toEqual(['sendEmail', 'reindex']);
  });

  it('defaults the dead-letter page size to 20', async () => {
    await adminController.getQueueStatus(mockReq(), mockRes(), vi.fn());

    expect(getDlqJobs).toHaveBeenCalledWith(20);
  });

  it('honours a supplied page size', async () => {
    await adminController.getQueueStatus(mockReq({ dlqLimit: '5' }), mockRes(), vi.fn());

    expect(getDlqJobs).toHaveBeenCalledWith(5);
  });

  it('caps the page size at 100', async () => {
    await adminController.getQueueStatus(mockReq({ dlqLimit: '5000' }), mockRes(), vi.fn());

    expect(getDlqJobs).toHaveBeenCalledWith(100);
  });

  it.each([
    ['zero', '0'],
    ['negative', '-4'],
    ['unparseable', 'lots'],
  ])('falls back to 20 for a %s page size', async (_label, dlqLimit) => {
    await adminController.getQueueStatus(mockReq({ dlqLimit }), mockRes(), vi.fn());

    expect(getDlqJobs).toHaveBeenCalledWith(20);
  });
});

describe('getQueueStatus degrades rather than failing', () => {
  it('reports an offline queue without hitting the dead-letter list', async () => {
    // Same contract as getRedisStatus: the admin dashboard renders a state
    // instead of an error page when Redis is down.
    getQueueStats.mockResolvedValue({
      status: 'Redis Offline',
      main: 0,
      processing: 0,
      delayed: 0,
      dlq: 0,
    });
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.status).toBe('Redis Offline');
    expect(res.payload.data.dlqJobs).toEqual([]);
    expect(getDlqJobs).not.toHaveBeenCalled();
  });

  it('reports a queue error without hitting the dead-letter list', async () => {
    getQueueStats.mockResolvedValue({ status: 'Error', error: 'WRONGTYPE' });
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.status).toBe('Error');
    expect(res.payload.data.dlqJobs).toEqual([]);
    expect(getDlqJobs).not.toHaveBeenCalled();
  });

  it('still lists handlers while the queue is offline', async () => {
    getQueueStats.mockResolvedValue({ status: 'Redis Offline', main: 0 });
    const res = mockRes();

    await adminController.getQueueStatus(mockReq(), res, vi.fn());

    expect(res.payload.data.registeredHandlers).toEqual(['sendEmail', 'reindex']);
  });

  it('forwards an unexpected failure to next()', async () => {
    const failure = new Error('queueService exploded');
    getQueueStats.mockRejectedValue(failure);
    const next = vi.fn();

    await adminController.getQueueStatus(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});

describe('the service contract getQueueStatus relies on', () => {
  it('exports the two readers and the handler registry', () => {
    const real = require('../../services/queueService');

    expect(typeof real.getQueueStats).toBe('function');
    expect(typeof real.getDlqJobs).toBe('function');
    expect(real.jobHandlers).toBeInstanceOf(Map);
  });

  it('degrades inside getQueueStats rather than throwing', () => {
    // The controller leans on this; if the service starts throwing instead,
    // the handler needs its own guard.
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'services', 'queueService.js'),
      'utf8'
    );

    expect(source).toMatch(/status: 'Redis Offline'/);
    expect(source).toMatch(/status: 'Error'/);
  });

  it('returns an empty dead-letter list when Redis is down', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'services', 'queueService.js'),
      'utf8'
    );

    expect(source).toMatch(/async function getDlqJobs[\s\S]{0,200}return \[\];/);
  });
});
