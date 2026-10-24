const poolManager = require('../services/poolManagerService');
const { getDatabaseHealth } = require('../controllers/dbHealthController');
const errorHandler = require('../middleware/error');
const { createSlowQueryHooks, stripSqlValues } = require('../services/dbSlowQueryTelemetry');
const { openprepDbPoolActiveConnections, register } = require('../services/metricsService');

const makeRes = () => {
  const res = { headers: {} };
  res.set = vi.fn((k, v) => {
    res.headers[k] = v;
    return res;
  });
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

// Fake clock: each call to now() returns the next value (nanoseconds).
const clock = (...values) => {
  const queue = values.map((ms) => BigInt(Math.round(ms * 1e6)));
  return () => queue.shift();
};

describe('slow query telemetry', () => {
  it('logs and records a query slower than the threshold', () => {
    const write = vi.fn();
    const record = vi.fn();
    const { beforeQuery, afterQuery } = createSlowQueryHooks({
      thresholdMs: 150,
      write,
      record,
      now: clock(0, 200),
    });
    const options = {};
    beforeQuery(options);
    afterQuery(options, { sql: "SELECT * FROM users WHERE email = 'a@b.com' AND id = 42" });

    expect(write).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(write.mock.calls[0][0]);
    expect(entry.durationMs).toBe(200);
    expect(entry.sql).toBe('SELECT * FROM users WHERE email = ? AND id = ?');
    expect(entry.sql).not.toContain('a@b.com');
    expect(Array.isArray(entry.stack)).toBe(true);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ durationMs: 200 }));
  });

  it('ignores a fast query', () => {
    const write = vi.fn();
    const record = vi.fn();
    const { beforeQuery, afterQuery } = createSlowQueryHooks({ write, record, now: clock(0, 20) });
    const options = {};
    beforeQuery(options);
    afterQuery(options, { sql: 'SELECT 1' });
    expect(write).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('never throws even if the writer fails', () => {
    const write = vi.fn(() => {
      throw new Error('disk full');
    });
    const { beforeQuery, afterQuery } = createSlowQueryHooks({ write, now: clock(0, 500) });
    const options = {};
    beforeQuery(options);
    expect(() => afterQuery(options, { sql: 'SELECT 1' })).not.toThrow();
  });

  it('keeps bind placeholders and table names with digits', () => {
    expect(stripSqlValues('SELECT * FROM t1 WHERE a = $1 AND b IN (1, 2, 3)')).toBe(
      'SELECT * FROM t1 WHERE a = $1 AND b IN (?)'
    );
  });
});

describe('pool stats', () => {
  const fakeDb = {
    options: { pool: { max: 12 } },
    connectionManager: { pool: { size: 8, available: 3, using: 5, waiting: 2 } },
  };

  it('reads the sequelize pool and sets the gauge', async () => {
    const stats = poolManager.getPoolStats(fakeDb);
    expect(stats.pool).toMatchObject({ total: 8, idle: 3, active: 5, queueLength: 2, max: 12 });

    const metric = await register.getSingleMetric('openprep_db_pool_active_connections').get();
    expect(metric.values[0].value).toBe(5);
    expect(openprepDbPoolActiveConnections).toBeDefined();
  });

  it('returns zeros when the pool is not created yet', () => {
    const stats = poolManager.getPoolStats({ options: {}, connectionManager: {} });
    expect(stats.pool).toMatchObject({ total: 0, idle: 0, active: 0, queueLength: 0 });
  });
});

describe('GET /api/health/db handler', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns total, active, idle, queue length and latency', async () => {
    vi.spyOn(poolManager, 'pingDatabase').mockResolvedValue({ status: 'healthy', latencyMs: 4 });
    vi.spyOn(poolManager, 'getPoolStats').mockReturnValue({
      pool: { total: 8, active: 5, idle: 3, queueLength: 2 },
      circuitBreaker: { state: 'CLOSED' },
      latency: { p50: 3, p95: 9, avg: 4.5, samples: 10 },
    });
    const res = makeRes();
    await getDatabaseHealth({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('healthy');
    expect(body.pool).toMatchObject({ total: 8, active: 5, idle: 3, queueLength: 2 });
    expect(body.averageLatencyMs).toBe(4.5);
  });
});

describe('connection acquire timeout handling', () => {
  it('maps SequelizeConnectionAcquireTimeoutError to 503 with Retry-After', () => {
    const err = new Error('Operation timeout');
    err.name = 'SequelizeConnectionAcquireTimeoutError';
    const res = makeRes();
    errorHandler(err, { id: 'req-1', method: 'GET', path: '/x' }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.headers['Retry-After']).toBeDefined();
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });
});
