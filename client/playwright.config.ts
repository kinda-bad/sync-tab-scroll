import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, devices } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

// alphaTab's ESM build spawns its synth/render workers via
// `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url), {type:'module'})`
// — resolved at runtime relative to the built chunk (/assets/). Vite can't
// statically see that URL (it's wrapped in alphaTab's own Environment class),
// so the worker files never land in the bundle and the Worker dies silently
// (new Worker() doesn't throw on 404, so alphaTab's scriptFile fallback is
// never reached). Copy the three ESM worker files verbatim into assets/.
function alphaTabWorkerAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const distDir = path.dirname(require.resolve('@coderline/alphatab'));
  return {
    name: 'alphatab-ct-worker-assets',
    generateBundle() {
      for (const f of ['alphaTab.worker.mjs', 'alphaTab.worklet.mjs', 'alphaTab.core.mjs']) {
        this.emitFile({ type: 'asset', fileName: `assets/${f}`, source: fs.readFileSync(path.join(distDir, f)) });
      }
    },
  };
}

/**
 * One config, two projects (plan-playwright-coverage-2026-07-02.md):
 * - `e2e`: real server + real client (production preview build), driven
 *   through actual user flows. Still no audio assertions here — but the
 *   old "Chrome's autoplay policy blocks automated playback" diagnosis
 *   was wrong (see alphaTabWorkerAssets above): under CT, playback was
 *   blocked by the synth worker 404ing, and the production vite build
 *   has the same missing-`assets/alphaTab.worker.mjs` anatomy (open
 *   follow-up: verify/fix vite.config.ts, then e2e audio becomes
 *   possible too).
 * - `ct`: Playwright component testing — real alphaTab/DOM/canvas
 *   including the real synth playback loop, with only the network
 *   boundary (ws-client) faked per-test where needed.
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
    // NOTE: `ct` must be projects[0] — @playwright/experimental-ct-core
    // reads ctViteConfig/ctPort from config.projects[0].use only
    // (viteUtils.js createConfig), regardless of --project filtering.
    {
      name: 'ct',
      testDir: './src',
      testMatch: '**/*.ct.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Not strictly required (verified: playback readiness and the
        // synth loop run without it under headless Chromium), but kept as
        // cheap insurance against stricter autoplay defaults on other
        // platforms/CI. Playwright itself passes no autoplay flag.
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
        ctPort: 3100,
        ctViteConfig: {
          plugins: [svelte(), alphaTabWorkerAssets()],
          optimizeDeps: { exclude: ['@coderline/alphatab'] },
        },
      },
    },
    {
      name: 'e2e',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'] },
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
