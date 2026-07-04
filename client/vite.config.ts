import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// @coderline/alphatab's vite plugin (dist/vite/alphaTab.vite.mjs) is missing
// from the published 1.8.3 package — a packaging bug, not a config error
// (verified: the file genuinely doesn't exist in node_modules). Configuring
// asset handling manually instead; see tab-renderer.ts for font/worker setup.
//
// Ports: dev servers (a real person's own session) run on 6000/6080; e2e
// spins up its own instances on 6001/6081 (playwright.config.ts's
// webServer array) so the two never collide/reuse each other's server —
// VITE_BACKEND_PORT lets this same config point the /catalog proxy at
// whichever backend is relevant (ws-client.ts reads the same var, via
// import.meta.env, for the WS URL baked into the client bundle).
//
// Vite only auto-injects .env into import.meta.env (browser/build-time
// code, e.g. ws-client.ts) — this file itself runs in Node and needs
// loadEnv() to see .env at all. A shell-set var (e.g. playwright.config.ts's
// e2e override) must still win over a .env-supplied value, so it's checked
// first, not merged over.
const fileEnv = loadEnv('', process.cwd(), '');
const backendPort = process.env.VITE_BACKEND_PORT ?? fileEnv.VITE_BACKEND_PORT ?? '6080';

export default defineConfig({
  plugins: [svelte()],
  // The dep-optimizer's own bundling of alphaTab.worker.mjs never resolves
  // under Vite's dev server (verified: request stays pending forever,
  // blocking soundFontLoaded/readiness) — excluding it forces alphaTab to
  // use the classic worker script (core.scriptFile, see tab-renderer.ts)
  // instead, matching how the render worker is already handled.
  optimizeDeps: {
    exclude: ['@coderline/alphatab']
  },
  server: {
    port: 6000,
    strictPort: true,
    // Bind on all interfaces, not just localhost, so the dev server is
    // reachable from another device on the LAN (e.g. a phone) via this
    // machine's LAN IP — Vite defaults to localhost-only otherwise.
    host: true,
    // Catalog asset URLs (CatalogSong.gpFilePath/lyricsLrc) are
    // server-relative (/catalog/...), served by the WS server
    // (infrastructure.md). Proxying keeps them same-origin for the client
    // dev server instead of needing CORS headers on the server response.
    // Proxy target stays localhost — this request is made by the Vite dev
    // server process itself (same machine as the WS server), not by
    // whatever device/origin the browser is on.
    proxy: {
      '/catalog': `http://localhost:${backendPort}`
    }
  },
  preview: {
    port: 6001,
    strictPort: true,
    proxy: {
      '/catalog': `http://localhost:${backendPort}`
    }
  },
  test: {
    // Vitest's default include glob also matches Playwright's *.spec.ts
    // (e2e/) and *.ct.spec.ts (component tests) — neither runs under
    // vitest, so exclude both explicitly rather than let them error.
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'src/**/*.ct.spec.ts'],
  },
});