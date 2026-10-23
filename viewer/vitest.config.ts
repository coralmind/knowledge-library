import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Every test exercises Node-side code; no DOM environment is needed.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
