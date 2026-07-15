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

// A much longer sheet (30 lines, one every 2s) — tall enough that the
// container (`calc(100dvh - var(--bar-height))`) can't show every line at
// once at the CT harness's default viewport, so the auto-scroll test below
// can observe a real `scrollTop` change, not a no-op scroll on content that
// already fit.
const MANY_LINES_LRC = Array.from({ length: 30 }, (_, i) => `[00:${String(i * 2).padStart(2, '0')}.00]Line ${i}`).join('\n');

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/fixture-lyrics.lrc', (route) => route.fulfill({ body: LRC_CONTENT, contentType: 'text/plain' }));
  await page.route('**/fixture-lyrics-many.lrc', (route) => route.fulfill({ body: MANY_LINES_LRC, contentType: 'text/plain' }));
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
async function mountAndWaitForScore(mount: any, page: import('@playwright/test').Page, lyricsLrc = '/fixture-lyrics.lrc') {
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/fixture.gp', trackIndex: 0, isLyricsPart: true, lyricsLrc },
  });
  await page.waitForFunction(() => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true, {
    timeout: 20_000,
  });
  expect((await readEngineState(page))?.scoreLoaded).toBe(true);
  // T003 (feedback F005): playback-engine.ts's playerPositionChanged
  // handler gates on `api.isReadyForPlayback` — wait for it explicitly
  // (not just a fixed timeout) so a manually-triggered triggerPosition()
  // below isn't racily ignored under CPU contention (many CT workers).
  await page.waitForFunction(
    () => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } }).__getApi()?.isReadyForPlayback === true,
    { timeout: 20_000 },
  );
  // Give the async `fetch(song.lyricsLrc).then(...)` a moment to resolve
  // before driving position — mirrors the real race between lrc parsing
  // and the first tick in production.
  await page.waitForTimeout(300);
}

/**
 * Reworked 2026-07-06 (ui.md "Lyrics part selected", just-revised): the
 * full-lyrics view now shows every line of the song's .lrc at once,
 * vertically stacked and scrollable, populated the moment the .lrc fetch
 * resolves — not gated on the first `playerPositionChanged` event the way
 * the old single-current-line implementation was. This suite replaces the
 * prior one-line-at-a-time coverage (T001/T004/T006,
 * tasks-lyrics-only-view-fix-2-c7cf.md) with coverage for the new
 * all-lines-at-once behavior.
 */
test('renders every lyric line immediately on mount, before any playback position event fires', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  const lines = page.locator('.lyric-line');
  await expect(lines).toHaveCount(4);
  await expect(lines.nth(0)).toHaveText('Hello there');
  await expect(lines.nth(1)).toHaveText('General Kenobi');
  await expect(lines.nth(2)).toHaveText('You are');
  await expect(lines.nth(3)).toHaveText('a bold one');
});

// T003 (tasks-7f0f-4f2d.md, feedback F005): a prior version of this
// behavior pre-highlighted the first line synchronously on load, before any
// real playback position data confirmed its timestamp had actually been
// reached — which read as wrong for songs with a leading instrumental gap.
// No line is active until a genuine playerPositionChanged event clears one.
test('no line is highlighted as active immediately after load, before any playback position event fires', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  await expect(page.locator('.lyric-line.active')).toHaveCount(0);
});

test('the first line becomes active once a playback position event confirms its timestamp has been reached', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);
  await expect(page.locator('.lyric-line.active')).toHaveCount(0);

  await triggerPosition(page, 0);
  await expect(page.locator('.lyric-line.active')).toHaveText('Hello there');
});

test('the container resolves to lyrics.css\'s flex layout, not display:none', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);
  await expect(page.locator('.full-lyrics-view')).not.toHaveCSS('display', 'none');
});

test('the active line updates (and previous lines deactivate) as playback position advances past each boundary', async ({ mount, page }) => {
  await mountAndWaitForScore(mount, page);

  await triggerPosition(page, 0);
  await expect(page.locator('.lyric-line.active')).toHaveText('Hello there');

  await triggerPosition(page, 1_999); // just before the next line
  await expect(page.locator('.lyric-line.active')).toHaveText('Hello there');

  await triggerPosition(page, 2_000);
  await expect(page.locator('.lyric-line.active')).toHaveCount(1);
  await expect(page.locator('.lyric-line.active')).toHaveText('General Kenobi');
  await expect(page.locator('.lyric-line').nth(0)).not.toHaveClass(/active/);

  await triggerPosition(page, 4_500);
  await expect(page.locator('.lyric-line.active')).toHaveText('You are');
  await expect(page.locator('.lyric-line').nth(1)).not.toHaveClass(/active/);

  await triggerPosition(page, 6_000);
  await expect(page.locator('.lyric-line.active')).toHaveText('a bold one');

  // The trailing [00:08.00] gap entry has empty text, so playback-engine.ts's
  // `.filter((l) => l.text.length > 0)` drops it from lrcLines entirely -
  // the last real line ("a bold one") stays active, it doesn't clear.
  await triggerPosition(page, 8_000);
  await expect(page.locator('.lyric-line.active')).toHaveText('a bold one');
});

/**
 * Uses MANY_LINES_LRC (30 lines) so the sheet is definitely taller than the
 * container and a real scroll is observable — the 4-line fixture used by
 * the other tests comfortably fits the CT harness's default viewport
 * without ever needing to scroll, which would make this assertion vacuous.
 */
test('the container auto-scrolls to keep the active line roughly centered as playback advances', async ({ mount, page }) => {
  // Forces playback-engine.ts's reducedMotion() branch (scrollIntoView's
  // `behavior: 'auto'`, i.e. instant) so this test asserts on the real
  // scroll-to-position logic without racing a CSS-timed smooth-scroll
  // animation under parallel-worker CPU contention (flaky at a fixed
  // waitForTimeout when many CT workers run at once).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountAndWaitForScore(mount, page, '/fixture-lyrics-many.lrc');

  const container = page.locator('.full-lyrics-view');
  const initialScrollTop = await container.evaluate((el) => el.scrollTop);

  await triggerPosition(page, 40_000); // ~line 20 of 30
  await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBeGreaterThan(initialScrollTop);
  const laterScrollTop = await container.evaluate((el) => el.scrollTop);

  // Jumping back to the first line scrolls back up toward the top.
  await triggerPosition(page, 0);
  await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBeLessThan(laterScrollTop);
});
