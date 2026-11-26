import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { alphaTab } from '@coderline/alphatab-vite';
import { accountDevProxy } from './src/dev-proxy';

// alphaTab's ESM build spawns its synth/render worker and its audio worklet
// from `new URL('./alphaTab.worker.mjs' | './alphaTab.worklet.mjs',
// import.meta.url)`. alphaTab's own Vite plugin (@coderline/alphatab-vite,
// its own package since 1.9) handles both halves:
// - build: emits the worker and worklet as chunks that share the page's
//   alphaTab core chunk. Without it Vite inlines the tiny worklet entry as a
//   `data:` URL, its relative import of the core module cannot resolve, and
//   playback never starts (alphaTab logs "Audio Worklet operation failed").
// - dev server: excludes alphaTab from dependency pre-bundling, which would
//   otherwise move the main module away from the worker files its relative
//   URLs point to.
// scripts/check-worker-assets.mjs fails the build if those chunks go missing.
// `assetOutputDir: false` because the font and SoundFont are already
// committed under public/ (see tab-renderer.ts).
//
// Ports: dev servers (a real person's own session) run on 6100/6080; e2e
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
// The version mark in Help & About (src/build-info.ts) shows the commit the
// client was built from. Railway passes it to the image build as
// RAILWAY_GIT_COMMIT_SHA (declared as an ARG in the Dockerfile, where there is
// no .git to ask); a local build asks git. Vite exposes any VITE_-prefixed
// process variable to the client, so setting it here is all it takes.
function buildCommit(): string {
  if (process.env.RAILWAY_GIT_COMMIT_SHA) return process.env.RAILWAY_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}
process.env.VITE_APP_COMMIT ??= buildCommit();

const fileEnv = loadEnv('', process.cwd(), '');
const backendPort = process.env.VITE_BACKEND_PORT ?? fileEnv.VITE_BACKEND_PORT ?? '6080';

export default defineConfig({
  plugins: [svelte(), alphaTab({ assetOutputDir: false })],
  server: {
    // 6100, not 6000: Chrome (and other Chromium browsers) refuses to
    // navigate to port 6000 at all — it's on their hardcoded "unsafe
    // ports" list (historically associated with X11), a browser
    // restriction with no override. 6100 isn't on that list.
    port: 6100,
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
    // /auth/* and /me join /catalog in the proxy so the OAuth redirect dance
    // and the SameSite=Lax cookie stay same-origin in dev (design §6); the map
    // is defined once in src/dev-proxy.ts.
    proxy: accountDevProxy(backendPort)
  },
  preview: {
    port: 6001,
    strictPort: true,
    proxy: accountDevProxy(backendPort)
  },
  test: {
    // Vitest's default include glob also matches Playwright's *.spec.ts
    // (e2e/) and *.ct.spec.ts (component tests) — neither runs under
    // vitest, so exclude both explicitly rather than let them error.
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'src/**/*.ct.spec.ts'],
  },
});