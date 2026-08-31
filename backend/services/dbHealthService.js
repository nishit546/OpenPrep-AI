const { sequelize } = require('../models');

async function getDBMetrics() {
  const isPostgres = sequelize.options?.dialect === 'postgres';
  
  // Extract Pool Telemetry
  const pool = sequelize.connectionManager?.pool;
  const poolMetrics = {
    activeConnections: pool ? (pool.size - pool.available) : 0,
    idleConnections: pool?.available || 0,
    maxConnections: sequelize.options?.pool?.max || 10,
  };

  let slowQueries = [];
  let indexHitRatio = 100;

  if (isPostgres) {
    try {
      // Find locks and queries running > 1000ms
      const [activity] = await sequelize.query(`
        SELECT pid, now() - query_start AS duration, query, state, wait_event_type 
        FROM pg_stat_activity 
        WHERE state != 'idle' AND (now() - query_start) > interval '1 second'
        ORDER BY duration DESC;
      `);
      slowQueries = activity || [];

      // Calculate Index Cache Hit Ratio
      const [hitRatioResult] = await sequelize.query(`
        SELECT 
          (sum(idx_blks_hit) - sum(idx_blks_read)) / COALESCE(nullif(sum(idx_blks_hit), 0), 1) * 100 AS ratio
        FROM pg_statio_user_tables;
      `);
      indexHitRatio = parseFloat(hitRatioResult[0]?.ratio || 100);
    } catch (err) {
      console.error('Error fetching PostgreSQL performance metrics:', err.message);
    }
  }

  return {
    dialect: sequelize.options?.dialect || 'sqlite',
    pool: poolMetrics,
    performance: {
      indexHitRatio: `${indexHitRatio.toFixed(2)}%`,
      targetMet: indexHitRatio > 99,
      slowQueriesCount: slowQueries.length,
      slowQueries,
    }
  };
}

module.exports = { getDBMetrics };
