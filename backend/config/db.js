const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sequelize = new Sequelize(
  dbUrl,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000
    },
    dialectOptions: {
      ssl: dbUrl.includes('supabase.co') || (process.env.NODE_ENV === 'production' && !dbUrl.includes('localhost'))
        ? { require: true, rejectUnauthorized: false }
        : false,
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT, 10) || 15000,
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT, 10) || 15000
    },
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/
      ],
      max: 3
    }
  }
);

const { rlsStorage } = require('../middleware/rlsContext');

sequelize.addHook('beforeQuery', async (options, query) => {
  // Prevent recursion / infinite loop for SET commands
  if (options.sql && options.sql.startsWith('SET ')) return;
  if (query && query.sql && query.sql.startsWith('SET ')) return;

  const store = rlsStorage.getStore();
  const userId = store ? store.userId : 'system';
  const isAdmin = store ? store.isAdmin : true; // Background/System tasks bypass RLS

  const conn = options.connection;
  if (conn && typeof conn.query === 'function') {
    try {
      await conn.query(`SET app.current_user_id = '${userId}';`);
      await conn.query(`SET app.is_admin = '${isAdmin ? 'true' : 'false'}';`);
    } catch (err) {
      console.error('[RLS Hook] Failed to set context on database connection:', err.message);
    }
  }
});

const { initializeQueryAudit } = require('../services/queryAuditService');
initializeQueryAudit(sequelize);

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

module.exports = { sequelize, connectDB };
