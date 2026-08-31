const { Sequelize } = require('sequelize');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Bounded connection pool configuration for raw queries and migrations
const pgPool = new Pool({
  connectionString: dbUrl,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE, 10) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_TIMEOUT, 10) || 2000,
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client pool:', err.message);
});

// Sequelize ORM instance with tuned connection pooling and statement timeouts
const sequelize = new Sequelize(
  dbUrl,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 30000,
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
