process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/openprep_test';

const { sequelize } = require('../models');

beforeAll(async () => {
  // Clear and recreate all tables for clean test execution
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
