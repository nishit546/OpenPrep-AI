process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/openprep_test';

const { sequelize } = require('../models');

let dbAvailable = false;

beforeAll(async () => {
  try {
    await sequelize.authenticate();
    dbAvailable = true;
    // Clear and recreate all tables for clean test execution
    await sequelize.sync({ force: true });
  } catch (err) {
    console.warn(
      'PostgreSQL not available — skipping DB setup. Tests that require a database will be skipped.'
    );
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await sequelize.close();
  }
});
