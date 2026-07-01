import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// @coderline/alphatab's vite plugin (dist/vite/alphaTab.vite.mjs) is missing
// from the published 1.8.3 package — a packaging bug, not a config error
// (verified: the file genuinely doesn't exist in node_modules). Configuring
// asset handling manually instead; see tab-renderer.ts for font/worker setup.
export default defineConfig({
  plugins: [svelte()],
});
