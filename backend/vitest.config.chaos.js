import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openprep_chaos';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'chaos_test_secret';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/chaos/**/*.test.js',
      'tests/controllers/pdfAnnotationExport.test.js',
      'tests/controllers/codeExecutionController.unit.test.js',
      'tests/sandbox/sandboxSecurity.unit.test.js',
      'tests/sso/**/*.unit.test.js',
    ],
    fileParallelism: false,
    testTimeout: 30000,
    dangerouslyIgnoreUnhandledErrors: true,
  },
});
