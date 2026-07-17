import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'controllers/**/*.js',
        'middleware/**/*.js',
        'services/**/*.js',
        'models/**/*.js',
        'config/**/*.js',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
      ],
    },
  },
});
