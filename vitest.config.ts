import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'forks',
    globals: true,
    testTimeout: 60000, // the zone grids are exhaustive and take up to ~15 s on a slow machine
  },
});
