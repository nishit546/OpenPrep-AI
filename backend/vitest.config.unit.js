import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.unit.test.js'],
    fileParallelism: false,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'controllers/**/*.js',
        'middleware/**/*.js',
        'services/**/*.js',
        'models/**/*.js',
        'config/**/*.js',
      ],
      exclude: ['node_modules/', 'tests/', 'coverage/'],
      thresholds: {
        statements: 75,
      },
    },
  },
});