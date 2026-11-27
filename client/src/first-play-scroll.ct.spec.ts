import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as at from '@coderline/alphatab';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

/**
 * First Start after loading a part scrolls the tab to the cursor
 * (user report, 2026-11-27: "the first time i hit play after loading a
 * part, the screen doesn't scroll properly to make the cursor visible. if
 * i start and stop it does on subsequent start").
 *
 * Root cause: alphaTab's continuous scroll handler skips a scroll when the
 * cursor's row is the row it last scrolled to (BasicScrollHandler
 * lastScroll), and every render after the tick cache exists
 * (postRenderFinished: a resize re-render, renderNowVisible, the recording
 * engine's own render) "scrolls" to the parked cursor and records its row,
 * even while stopped. The page then moves (the Lobby's content goes away
 * at Start, or the user scrolls), but the first Start's row is still
 * "already scrolled to", so nothing scrolls until the cursor reaches the
 * next row. After one Start and Stop the memo holds the row playback
 * reached (a pause clears it outright: alphaTab calls scrollToCursor
 * then), and Stop parks back on bar 1, a different row, which is why the
 * second Start works.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BAR = 3840;

// 64 bars at 60bpm (4s a bar): the cursor stays in its first row for many
// seconds, so a scroll seen there can only come from the Start itself.
const LONG_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  const bars = Array.from({ length: 64 }, () => '0.4.4 0.4.4 0.4.4 0.4.4').join(' | ');
  importer.initFromString(`\\tempo 60\n.\n\\track "Guitar"\n\\ts 4 4 ${bars}`, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();

const RECORDING_MP3 = fs.readFileSync(path.resolve(__dirname, '../test-fixtures/fixture-catalog/recording-aligned/recording.mp3'));
const LONG_SYNC_POINTS = [
  { barIndex: 0, barOccurence: 0, barPosition: 0, millisecondOffset: 0 },
  { barIndex: 2, barOccurence: 0, barPosition: 0, millisecondOffset: 8000 },
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/long.gp', (route) => route.fulfill({ body: LONG_GP, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (route) => route.fulfill({ body: RECORDING_MP3, contentType: 'audio/mpeg' }));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mountReady(mount: any, page: Page, source: 'synth' | 'recording') {
  await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/long.gp',
      trackIndex: 0,
      recordingPath: '/recording.mp3',
      syncPoints: LONG_SYNC_POINTS,
      songOverrides: { lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null },
    },
  });
  if (source === 'recording') {
    await page.evaluate(() => (window as unknown as { __switchSource: (s: string) => void }).__switchSource('recording'));
  }
  await page.waitForFunction(
    () => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } | undefined }).__getApi()?.isReadyForPlayback === true,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForSelector('.at-surface svg', { timeout: 20_000 });
  await page.waitForTimeout(300); // let the post-render cursor placement (and its scroll) land
}

/**
 * Parks the cursor at `tick` (as the start marker does while stopped),
 * re-renders as alphaTab does on a resize, moves the page away from the
 * tab, then Starts and waits for real playback. Returns the bar cursor's
 * viewport rect.
 */
async function startAfterRerender(page: Page, tick: number) {
  await page.evaluate(async (t) => {
    const api = (window as unknown as { __getApi: () => at.AlphaTabApi }).__getApi();
    api.settings.player.nativeBrowserSmoothScroll = false;
    api.settings.player.scrollSpeed = 0;
    if (t !== 0) api.tickPosition = t;
    await new Promise((r) => setTimeout(r, 300));
    await new Promise<void>((resolve) => {
      const done = () => {
        api.postRenderFinished.off(done);
        resolve();
      };
      api.postRenderFinished.on(done);
      api.render();
    });
    await new Promise((r) => setTimeout(r, 300));
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 100));
    api.play();
  }, tick);
  // Still in the parked beat's row: 60bpm, so 960 ticks is one second.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => at.AlphaTabApi }).__getApi().tickPosition), { timeout: 15_000 })
    .toBeGreaterThan(tick + 960);
  return page.evaluate(() => {
    const rect = document.querySelector('.at-cursor-bar')!.getBoundingClientRect();
    (window as unknown as { __getApi: () => at.AlphaTabApi }).__getApi().pause();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
  });
}

for (const source of ['synth', 'recording'] as const) {
  for (const marker of [null, 1] as const) {
    test(`the first Start after a re-render scrolls the cursor into view (${source}, ${marker === null ? 'no start marker' : 'parked at bar 2'})`, async ({ mount, page }) => {
      await mountReady(mount, page, source);
      const cursor = await startAfterRerender(page, marker === null ? 0 : marker * BAR);
      expect(cursor.top).toBeGreaterThanOrEqual(-1);
      expect(cursor.bottom).toBeLessThanOrEqual(cursor.viewport + 1);
    });
  }
}
