import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

// Real multi-line .lrc content (not the single-line fixture-catalog one) —
// four real timestamped lines plus a trailing gap, so a test can cross
// more than one line boundary in order (mirrors lyrics-overlay.ct.spec.ts's
// existing pattern for the in-tab overlay).
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mountAndWaitForScore(mount: any, page: import('@playwright/test').Page) {
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
}

/**
 * T001/T005/T006 (tasks-lyrics-only-view-fix-2-c7cf.md): permanent
 * regression coverage for the headless lyrics-part path — reproduces
 * feedback-lyrics-only-view-6386's "lyrics-only view shows nothing"
 * report using the real `ensurePlaybackEngine` wiring (via
 * `PlaybackEngineHarness`, extended with an `isLyricsPart`/`lyricsLrc`
 * prop pair for this task) rather than reimplementing the lrc-matching
 * logic in a bespoke harness.
 *
 * T001 FINDING (see the tasks file's T001 note for the full writeup):
 * this suite's first test, asserting the plan's literal Phase 1
 * acceptance criteria (`display` not `'none'` AND `textContent`
 * non-empty), did NOT fail against pre-fix code — it passed immediately.
 * `scoreLoaded`/`playerPositionChanged` both fire normally for the
 * headless (permanently `display:none`) container, refuting the
 * render-gate/tick-pipeline-stall hypothesis (plan Technical Approach
 * #1; T003 skipped, no fix needed). A separate, throwaway
 * two-participant e2e repro (real production build, real server, host
 * on an instrument part + member on Lyrics, real playback) also found no
 * "nothing visible" symptom.
 *
 * What *was* a real, confirmed defect (plan Technical Approach #2):
 * `.full-lyrics-view`'s computed `display` resolved to `'block'`
 * (App.svelte's scoped rule won the specificity fight against
 * `lyrics.css`'s `display: flex`), never `'flex'` — not a
 * total-blackout bug on its own (text/visibility both worked), but a
 * real loss of the intended flex-based vertical centering. T004
 * consolidated the CSS split into `lyrics.css` alone; the second test
 * below is this defect's regression guard.
 */
test('headless lyrics-part path: full-lyrics-view becomes visible and shows text as playback crosses a line boundary', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  await triggerPosition(page, 2_500); // past "General Kenobi" (2000ms), before "You are" (4000ms)

  const el = page.locator('.full-lyrics-view');
  await expect(el).toHaveText('General Kenobi', { timeout: 5_000 });
  await expect(el).not.toHaveCSS('display', 'none');
});

test('regression (T004): full-lyrics-view display resolves to lyrics.css\'s flex, not App.svelte\'s stale block', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  await triggerPosition(page, 0); // any position past hasPart/visible — display doesn't depend on playback position, just the .visible class
  await expect(page.locator('.full-lyrics-view')).toHaveCSS('display', 'flex');
});

/**
 * T006: shows the correct line text as simulated playback position
 * crosses each .lrc line boundary in order, mirroring
 * lyrics-overlay.ct.spec.ts's existing pattern for the in-tab overlay.
 */
test('shows each line in order as playback crosses each .lrc line boundary', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  const el = page.locator('.full-lyrics-view');

  await triggerPosition(page, 0);
  await expect(el).toHaveText('Hello there');

  await triggerPosition(page, 1_999); // just before the next line
  await expect(el).toHaveText('Hello there');

  await triggerPosition(page, 2_000);
  await expect(el).toHaveText('General Kenobi');

  await triggerPosition(page, 4_500);
  await expect(el).toHaveText('You are');

  await triggerPosition(page, 6_000);
  await expect(el).toHaveText('a bold one');

  // The trailing [00:08.00] gap entry has empty text, so playback-engine.ts's
  // `.filter((l) => l.text.length > 0)` drops it from lrcLines entirely -
  // the last real line ("a bold one") stays shown, it doesn't clear.
  await triggerPosition(page, 8_000);
  await expect(el).toHaveText('a bold one');
});
