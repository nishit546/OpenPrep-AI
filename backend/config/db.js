const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const os = require('os');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Pool sizing (#2363): explicit env value wins, otherwise scale with the CPU
// count and never exceed a hard cap so a big host can't exhaust Postgres.
const POOL_HARD_CAP = 50;
const clampPool = (n) => Math.max(1, Math.min(n, POOL_HARD_CAP));
const defaultPoolMax = () => clampPool((os.cpus().length || 1) * 2 + 2);
const poolMax = clampPool(parseInt(process.env.DB_POOL_MAX, 10) || defaultPoolMax());
const poolMin = Math.min(parseInt(process.env.DB_POOL_MIN, 10) || 2, poolMax);

// Bounded connection pool configuration for raw queries and migrations
const pgPool = new Pool({
  connectionString: dbUrl,
  max: poolMax,
  min: poolMin,
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_TIMEOUT, 10) || 2000,
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client pool:', err.message);
});

// Slow-query profiling (#2193). Off in tests so unit/integration suites
// aren't slowed down or polluted by profiler EXPLAIN calls; on everywhere
// else unless explicitly disabled.
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_QUERY_PROFILER !== 'true') {
  require('../middleware/queryProfiler').attachQueryProfiler(pgPool);
}

// Sequelize ORM instance with tuned connection pooling and statement timeouts
const sequelize = new Sequelize(
  dbUrl,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: poolMax,
      min: poolMin,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    dialectOptions: {
      ssl: dbUrl.includes('supabase.co') || (process.env.NODE_ENV === 'production' && !dbUrl.includes('localhost'))
        ? { require: true, rejectUnauthorized: false }
        : false,
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT, 10) || 15000,
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT, 10) || 15000,
    },
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
      ],
      max: 3,
    },
  }
);

// Register database query execution duration hooks
sequelize.addHook('beforeQuery', (options) => {
  options.queryStartTime = Date.now();
});

sequelize.addHook('afterQuery', (options) => {
  if (options.queryStartTime) {
    const duration = (Date.now() - options.queryStartTime) / 1000;
    const { recordDbQueryDuration } = require('../services/metricsService');
    recordDbQueryDuration(duration);
  }
});

// Slow query telemetry (#2363): log + record queries over the threshold.
// Skipped in tests so suites don't write log files.
if (process.env.NODE_ENV !== 'test') {
  const { createSlowQueryHooks } = require('../services/dbSlowQueryTelemetry');
  const { recordSlowQuery } = require('../services/queryProfilerService');
  const hooks = createSlowQueryHooks({
    thresholdMs: parseInt(process.env.DB_SLOW_QUERY_MS, 10) || 150,
    record: recordSlowQuery,
  });
  sequelize.addHook('beforeQuery', hooks.beforeQuery);
  sequelize.addHook('afterQuery', hooks.afterQuery);
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected successfully via Sequelize');

    // Always register models and associations (required for eager loading)
    require('../models');
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown listener for pool
const shutdownPool = async () => {
  try {
    console.log('Closing PostgreSQL client pools gracefully...');
    await pgPool.end();
    await sequelize.close();
    console.log('PostgreSQL pools closed.');
  } catch (err) {
    console.error('Error during pool termination:', err.message);
  }
};

process.on('SIGTERM', shutdownPool);
process.on('SIGINT', shutdownPool);

module.exports = { sequelize, connectDB, pgPool, shutdownPool };
