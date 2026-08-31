const { getDBMetrics } = require('../../services/dbHealthService');
const { verifyMigrations } = require('../../services/migrationVerifier');

describe('Database Health Monitoring & Migration Verification Unit Test Suite', () => {
  test('getDBMetrics calculates pool telemetry and index hit ratio defaults', async () => {
    const metrics = await getDBMetrics();

    expect(metrics).toHaveProperty('dialect');
    expect(metrics).toHaveProperty('pool');
    expect(metrics.pool).toHaveProperty('activeConnections');
    expect(metrics.pool).toHaveProperty('idleConnections');
    expect(metrics.pool).toHaveProperty('maxConnections');

    expect(metrics).toHaveProperty('performance');
    expect(metrics.performance).toHaveProperty('indexHitRatio');
    expect(metrics.performance).toHaveProperty('targetMet');
    expect(metrics.performance.targetMet).toBe(true);
  });

  test('verifyMigrations reports migration alignment status correctly', async () => {
    const result = await verifyMigrations();

    expect(result).toHaveProperty('status');
    expect(['SYNCED', 'OUT_OF_SYNC', 'ERROR']).toContain(result.status);
    expect(result).toHaveProperty('pending');
    expect(Array.isArray(result.pending)).toBe(true);
  });
});
