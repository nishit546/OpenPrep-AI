import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.unit.test.js'],
    fileParallelism: false,
    testTimeout: 10000,
  },
});
