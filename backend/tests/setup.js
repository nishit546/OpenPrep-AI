process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/openprep_test';

const { sequelize } = require('../models');

let dbAvailable = false;

beforeAll(async () => {
  try {
    await sequelize.authenticate();
    dbAvailable = true;

    // Clean slate: drop and recreate public schema
    // (sync({ force: true }) doesn't clean up PostgreSQL enum types)
    await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await sequelize.query('CREATE SCHEMA public;');
    await sequelize.sync();
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
