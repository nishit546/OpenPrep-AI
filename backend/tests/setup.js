const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Global afterEach was removed intentionally.
// Individual test files manage their own cleanup.
// The previous afterEach here deleted ALL collections after every test,
// which broke integration tests that need data to persist across tests
// (e.g., controller tests creating a user in beforeAll).
