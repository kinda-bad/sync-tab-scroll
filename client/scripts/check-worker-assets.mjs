import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * alphaTab's ESM build loads its synth/render worker and its audio worklet
 * from URLs relative to the built chunk. If the production build doesn't emit
 * them as real files in dist/assets/, playback never starts and nothing
 * visible fails: a missing worker hangs readiness forever, and a worklet
 * inlined as a `data:` URL cannot import alphaTab's core. Both are emitted by
 * the alphaTab plugin in vite.config.ts. A CT-only test can't catch a
 * regression here: CT's own Vite config (playwright.config.ts) carries the
 * plugin independently, so it would pass whether or not this build is broken.
 */
const clientDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const assetsDir = path.join(clientDir, 'dist', 'assets');
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];

const missing = ['worker', 'worklet'].filter((kind) => !assets.some((f) => new RegExp(`^alphaTab\\.${kind}[-.].*js$`).test(f)));
if (missing.length > 0) {
  console.error(`[check-worker-assets] no alphaTab ${missing.join(' or ')} chunk in ${assetsDir}: alphaTab playback will never start in this build. See the alphaTab plugin in vite.config.ts.`);
  process.exit(1);
}
