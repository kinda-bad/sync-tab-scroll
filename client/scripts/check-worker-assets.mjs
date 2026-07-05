import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * alphaTab's ESM build always requests
 * `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url))` under
 * Vite-bundled output — if the production build doesn't emit that file into
 * dist/assets/, the request hangs forever with zero visible error,
 * permanently blocking playback readiness (vite.config.ts's
 * alphaTabWorkerAssets() plugin comment). A CT-only test can't catch a
 * regression here: CT's own Vite config (playwright.config.ts) carries this
 * same plugin independently, so it would pass whether or not this file's
 * build config is broken.
 */
const clientDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workerAsset = path.join(clientDir, 'dist', 'assets', 'alphaTab.worker.mjs');

if (!existsSync(workerAsset)) {
  console.error(`[check-worker-assets] missing ${workerAsset} — alphaTab playback readiness will hang forever in this build. See vite.config.ts's alphaTabWorkerAssets() plugin.`);
  process.exit(1);
}
