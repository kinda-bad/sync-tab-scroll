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
        // alphaTab's soundFontLoaded event needs a running AudioContext,
        // which Chrome's autoplay policy otherwise suspends without a
        // user gesture — this is decode/load readiness, not playback, so
        // this flag isn't the "no audio assertions" scope creeping in.
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
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
            // `port` not `url`: the WS server 404s a bare GET / (it only
            // serves /catalog static files and the WS upgrade), and
            // Playwright's `url` check requires a 2xx response — a TCP-only
            // check is what this server can actually satisfy.
            // `pnpm --filter` cds into the matched package (server/) before
            // running its script, regardless of this entry's own `cwd` —
            // so the path is relative to server/, not the repo root.
            // Points at the committed synthetic fixture catalog
            // (client/test-fixtures/fixture-catalog), not the real (gitignored,
            // real-commercial-content) catalog/ — so these tests are
            // reproducible on a fresh clone/CI without local-only content.
            command: 'CATALOG_ROOT=../client/test-fixtures/fixture-catalog pnpm --filter @sync-tab-scroll/server dev',
            port: 8080,
            reuseExistingServer: !process.env.CI,
            cwd: '../',
            timeout: 60_000,
          },
          {
            // Production build + preview, not the dev server — matches what
            // a real user's browser actually receives.
            command: 'pnpm --filter client build && pnpm --filter client preview --port 4173 --strictPort',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
            cwd: '../',
            timeout: 120_000,
          },
        ],
});
