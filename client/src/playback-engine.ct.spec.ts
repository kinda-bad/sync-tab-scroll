import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

let pageErrors: string[];

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});

/**
 * SCOPE NOTE: `playback-engine.ts`'s clientStore subscription (drift
 * correction, Spotlight-mode force-follow, host-only paused-only seek) is
 * entirely gated on `api.isReadyForPlayback`. That flag never becomes
 * true under any browser-automation context this project has tried
 * (Playwright CT included) — confirmed empirically it stays `false`
 * indefinitely, matching this project's already-documented "Full
 * live-audio verification blocked by Chrome's autoplay policy in
 * browser-automation testing" limitation (not a new CT-specific bug).
 * That gated logic is therefore untestable here; it stays covered at the
 * pure-function level by `playback-sync.test.ts`
 * (test-coverage-backfill), and at the real-user level only by manual
 * browser testing — same status as `tasks-lobby-cursor-modes-0bea.md`'s
 * still-blocked T010. This test covers what *is* verifiable: the engine
 * constructs against a real alphaTab instance and renders real tab
 * output without crashing.
 */
test('constructs the engine and renders real tab output without crashing', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });

  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
});
