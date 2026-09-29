/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: true,
        },
        '/authz': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      // The suite runs 19 files in parallel. On a loaded CI runner the default
      // 5s budget is not enough for the heavier page-level tests (Login /
      // RequestAccess render large trees), which made LandingPage.test.tsx fail
      // intermittently with "Test timed out in 5000ms" even though it completes
      // in well under a second on its own.
      testTimeout: 20000,
      hookTimeout: 20000,
      // `.kilo` is a git worktree snapshot of this repo; excluding it prevents
      // duplicate test files from being discovered twice.
      exclude: ['**/node_modules/**', '**/dist/**', '**/.kilo/**'],
    },
  };
});
