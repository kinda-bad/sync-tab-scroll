import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

// Real multi-line .lrc content (not the single-line fixture-catalog one) —
// three real timestamped lines plus a trailing gap, so a test can cross
// more than one line boundary in order (T006 permanent coverage) as well
// as reproduce T001's single-line-crossing repro.
const LRC_CONTENT = `[00:00.00]Hello there\n[00:02.00]General Kenobi\n[00:04.00]You are\n[00:06.00]a bold one\n[00:08.00]`;

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/fixture-lyrics.lrc', (route) => route.fulfill({ body: LRC_CONTENT, contentType: 'text/plain' }));
});

function readEngineState(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState());
}

function triggerPosition(page: import('@playwright/test').Page, currentTimeMs: number) {
  return page.evaluate((currentTime) => {
    const api = (window as unknown as { __getApi: () => { playerPositionChanged: { trigger: (e: unknown) => void } } }).__getApi();
    api.playerPositionChanged.trigger({ currentTime, endTime: 10_000, currentTick: 0, endTick: 0, isSeek: false, originalTempo: 120, modifiedTempo: 120 });
  }, currentTimeMs);
}

/**
 * T001 (tasks-lyrics-only-view-fix-2-c7cf.md): reproduces
 * feedback-lyrics-only-view-6386's "lyrics-only view shows nothing" report
 * against the headless lyrics-part path, using the real
 * `ensurePlaybackEngine` wiring (via `PlaybackEngineHarness`, extended
 * with an `isLyricsPart`/`lyricsLrc` prop pair for this task) rather than
 * reimplementing the lrc-matching logic in a bespoke harness. Asserts
 * exactly the plan's Phase 1 acceptance criteria: `.full-lyrics-view`'s
 * computed `display` is not `'none'`, and its `textContent` becomes
 * non-empty, once simulated playback crosses a real `.lrc` line's
 * timestamp.
 *
 * FINDING (see the tasks file's T001 note for the full writeup): this
 * test does NOT fail against current code — it passes as written, with
 * no fix applied. The headless api's `scoreLoaded` and
 * `playerPositionChanged` both fire normally despite the headless
 * container being permanently `display:none` (refuting hypothesis 1 —
 * the render-gate/tick-pipeline stall never happens), and
 * `.full-lyrics-view`'s `textContent` updates correctly. A separate,
 * throwaway two-participant e2e repro (host on an instrument part,
 * member on Lyrics, real playback) also failed to reproduce "nothing
 * visible" on this branch's current code.
 *
 * The one thing this test *does* confirm as a genuine, live defect
 * (logged separately below, not gating this test) is hypothesis 2's CSS
 * conflict: `getComputedStyle(...).display` resolves to `'block'`
 * (App.svelte's scoped rule wins), never `lyrics.css`'s intended
 * `'flex'` — real, but not a total-blackout bug on its own; text and
 * visibility both work, only flex-based vertical centering is lost.
 */
test('headless lyrics-part path: full-lyrics-view becomes visible and shows text as playback crosses a line boundary', async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/fixture.gp', trackIndex: 0, isLyricsPart: true, lyricsLrc: '/fixture-lyrics.lrc' },
  });

  await page.waitForFunction(() => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true, {
    timeout: 20_000,
  });
  expect((await readEngineState(page))?.scoreLoaded).toBe(true);

  // Give the async `fetch(song.lyricsLrc).then(...)` a moment to resolve
  // before driving position — mirrors the real race between lrc parsing
  // and the first tick in production.
  await page.waitForTimeout(300);

  await triggerPosition(page, 2_500); // past "General Kenobi" (2000ms), before "You are" (4000ms)

  const el = page.locator('.full-lyrics-view');
  await expect(el).toHaveText('General Kenobi', { timeout: 5_000 });
  await expect(el).not.toHaveCSS('display', 'none');
});

test('CONFIRMED DEFECT (hypothesis 2): full-lyrics-view display resolves to block, not lyrics.css\'s intended flex', async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/fixture.gp', trackIndex: 0, isLyricsPart: true, lyricsLrc: '/fixture-lyrics.lrc' },
  });

  await page.waitForFunction(() => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true, {
    timeout: 20_000,
  });

  const display = await page.locator('.full-lyrics-view').evaluate((el) => getComputedStyle(el).display);
  // Pre-T004: App.svelte's scoped `display:block` beats lyrics.css's
  // `display:flex` on specificity. T004 consolidates the rule into
  // lyrics.css alone, at which point this should become 'flex' — this
  // test's expectation flips as part of T005.
  expect(display).toBe('block');
});
