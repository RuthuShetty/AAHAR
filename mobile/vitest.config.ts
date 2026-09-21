import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Map any import of assets/ml/thresholds.json regardless of call depth
      {
        find: /.*assets\/ml\/thresholds\.json$/,
        replacement: path.resolve(__dirname, './assets/ml/thresholds.json'),
      },
    ],
  },
  json: {
    stringify: false,
  },
});
