const { sequelize } = require('../../config/db');

describe('Database Connection Pooling & Timeout Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load default connection pool settings when env variables are not set', () => {
    expect(sequelize.options.pool).toBeDefined();
    expect(sequelize.options.pool.max).toBeGreaterThanOrEqual(4);
    expect(sequelize.options.pool.max).toBeLessThanOrEqual(50);
    expect(sequelize.options.pool.min).toBe(2);
    expect(sequelize.options.pool.acquire).toBe(30000);
    expect(sequelize.options.pool.idle).toBe(10000);
  });

  it('should load custom connection pool settings when env variables are defined', () => {
    const originalMax = process.env.DB_POOL_MAX;
    const originalMin = process.env.DB_POOL_MIN;
    process.env.DB_POOL_MAX = '35';
    process.env.DB_POOL_MIN = '8';

    // Clear module cache to re-evaluate the db.js config file
    delete require.cache[require.resolve('../../config/db')];
    const { sequelize: freshSequelize } = require('../../config/db');

    expect(freshSequelize.options.pool.max).toBe(35);
    expect(freshSequelize.options.pool.min).toBe(8);

    // Clean up
    if (originalMax) process.env.DB_POOL_MAX = originalMax;
    else delete process.env.DB_POOL_MAX;
    if (originalMin) process.env.DB_POOL_MIN = originalMin;
    else delete process.env.DB_POOL_MIN;

    delete require.cache[require.resolve('../../config/db')];
  });

  it('should configure dialect statement timeouts', () => {
    expect(sequelize.options.dialectOptions).toBeDefined();
    expect(sequelize.options.dialectOptions.statement_timeout).toBe(5000);
    expect(sequelize.options.dialectOptions.idle_in_transaction_session_timeout).toBe(5000);
  });

  it('should define automatic retry policy parameters for connection drops', () => {
    expect(sequelize.options.retry).toBeDefined();
    expect(sequelize.options.retry.max).toBe(3);
    expect(sequelize.options.retry.match).toBeDefined();
    expect(Array.isArray(sequelize.options.retry.match)).toBe(true);

    const matchesStr = sequelize.options.retry.match.map(r => r.toString());
    expect(matchesStr).toContain('/SequelizeConnectionError/');
    expect(matchesStr).toContain('/SequelizeConnectionRefusedError/');
    expect(matchesStr).toContain('/TimeoutError/');
  });
});
