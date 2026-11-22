import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Two projects replace the old `environmentMatchGlobs` (removed in Vitest 4): the app runs
// in jsdom and the Convex functions in the edge runtime, like on the Convex servers.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          exclude: ['convex/**', 'node_modules/**', '.next/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts'],
        },
      },
    ],
  },
});
