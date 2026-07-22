import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
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
