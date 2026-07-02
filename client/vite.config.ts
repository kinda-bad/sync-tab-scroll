import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// @coderline/alphatab's vite plugin (dist/vite/alphaTab.vite.mjs) is missing
// from the published 1.8.3 package — a packaging bug, not a config error
// (verified: the file genuinely doesn't exist in node_modules). Configuring
// asset handling manually instead; see tab-renderer.ts for font/worker setup.
export default defineConfig({
  plugins: [svelte()],
  // The dep-optimizer's own bundling of alphaTab.worker.mjs never resolves
  // under Vite's dev server (verified: request stays pending forever,
  // blocking soundFontLoaded/readiness) — excluding it forces alphaTab to
  // use the classic worker script (core.scriptFile, see tab-renderer.ts)
  // instead, matching how the render worker is already handled.
  optimizeDeps: {
    exclude: ['@coderline/alphatab'],
  },
  server: {
    // Catalog asset URLs (CatalogSong.gpFilePath/lyricsLrc) are
    // server-relative (/catalog/...), served by the WS server on :8080
    // (infrastructure.md). Proxying keeps them same-origin for the client
    // dev server instead of needing CORS headers on the server response.
    proxy: {
      '/catalog': 'http://localhost:8080',
    },
  },
});
