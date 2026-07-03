import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, devices } from '@playwright/experimental-ct-svelte';

/**
 * One config, two projects (plan-playwright-coverage-2026-07-02.md):
 * - `e2e`: real server + real client (production preview build), driven
 *   through actual user flows. No audio assertions (Chrome's autoplay
 *   policy blocks automated playback — verified this project already).
 * - `ct`: Playwright component testing — real alphaTab/DOM/canvas, with
 *   only the network boundary (ws-client) faked per-test where needed.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ct',
      testDir: './src',
      testMatch: '**/*.ct.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ctPort: 3100,
        ctViteConfig: {
          plugins: [svelte()],
          optimizeDeps: { exclude: ['@coderline/alphatab'] },
        },
      },
    },
  ],
  webServer:
    process.env.PW_SKIP_WEBSERVER
      ? undefined
      : [
          {
            // Real server (not mocked) — tsx dev is functionally identical to
            // the compiled server for E2E purposes; only the client's build
            // artifact matters for "matches what a user gets" (below).
            command: 'CATALOG_ROOT=../catalog pnpm --filter @sync-tab-scroll/server dev',
            url: 'http://localhost:8080',
            reuseExistingServer: !process.env.CI,
            cwd: '../',
          },
          {
            // Production build + preview, not the dev server — matches what
            // a real user's browser actually receives.
            command: 'pnpm --filter client build && pnpm --filter client preview --port 4173 --strictPort',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
            cwd: '../',
          },
        ],
});
