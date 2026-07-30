process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/openprep_test';

const { sequelize } = require('../models');

beforeAll(async () => {
  try {
    // Check if DB is reachable with a 3 second timeout
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 3000)
    );
    await Promise.race([authPromise, timeoutPromise]);

    // Clear and recreate all tables for clean test execution
    await sequelize.sync({ force: true });
  } catch (err) {
    console.warn(`\n[WARN] PostgreSQL database is unreachable during test setup (${err.message}).\n`);
    throw new Error(`Database connection failed: ${err.message}`);
  }
});

afterAll(async () => {
  try {
    await Promise.race([
      sequelize.close(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch (err) {
    // Ignore cleanup error if DB wasn't connected
  }
}, 60000);
