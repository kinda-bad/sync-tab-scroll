import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Same fixture as full-lyrics-view.ct.spec.ts: a real (not mocked) GP file,
// 120bpm/4-4, 2 measures (2000ms each) — confirmed by loading it and
// reading score.masterBars during this task's own exploration. Gap windows
// below are chosen relative to that real 2000ms measure length, since
// findLyricGaps (lyrics-gap-timing.ts) reads the *actual* loaded score, not
// a mock — this CT spec exercises the real T001-T003 wiring end to end.
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

// Leading gap (0 -> 2500ms) and inter-line gap (3000ms -> 6000ms) both
// exceed the 2000ms measure length, so both qualify for an indicator. The
// inter-line gap's endMs (6000ms) runs past this fixture's own mapped
// 4000ms (2 measures) — lyrics-gap-timing.ts's fallback ("nearest
// masterBar", clamped to the last one once endMs runs past the whole
// score) still gives a real, correct 2000ms local measure length here
// since the whole fixture is a constant 120bpm/4-4.
const QUALIFYING_LRC = `[00:02.50]Hello there\n[00:03.00]\n[00:06.00]General Kenobi`;

// Inter-line gap here is exactly 1000ms (1000ms -> 2000ms) — one measure or
// shorter, so no indicator should appear (ui.md: "Gaps of one measure or
// shorter get no special treatment").
const SHORT_GAP_LRC = `[00:00.00]Hello there\n[00:01.00]\n[00:02.00]General Kenobi`;

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/qualifying.lrc', (route) => route.fulfill({ body: QUALIFYING_LRC, contentType: 'text/plain' }));
  await page.route('**/short-gap.lrc', (route) => route.fulfill({ body: SHORT_GAP_LRC, contentType: 'text/plain' }));
});

function triggerPosition(page: import('@playwright/test').Page, currentTimeMs: number) {
  return page.evaluate((currentTime) => {
    const api = (window as unknown as { __getApi: () => { playerPositionChanged: { trigger: (e: unknown) => void } } }).__getApi();
    api.playerPositionChanged.trigger({ currentTime, endTime: 10_000, currentTick: 0, endTick: 0, isSeek: false, originalTempo: 120, modifiedTempo: 120 });
  }, currentTimeMs);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mountAndWaitForScoreAndLrc(mount: any, page: import('@playwright/test').Page, lyricsLrc: string) {
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/fixture.gp', trackIndex: 0, isLyricsPart: true, lyricsLrc },
  });
  await page.waitForFunction(() => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true, {
    timeout: 20_000,
  });
  // Gives both the async .lrc fetch and the gap-computation wiring (which
  // needs both scoreLoaded and the fetch to resolve, in either order) a
  // moment to settle, mirroring full-lyrics-view.ct.spec.ts's own fetch race
  // guard.
  await page.waitForTimeout(300);
}

// T002 (tasks-7f0f-4f2d.md, feedback F006): the 4 count-in dots render as an
// inline prefix on the upcoming `.lyric-line`'s own text — not as a separate
// element positioned above the line — so the line reads e.g. "···· Hello
// there". The drain bar remains a separate element positioned directly
// above the upcoming line (ui.md), just no longer sharing a `.gap-indicator`
// wrapper with the dots.
test('a qualifying leading gap renders 4 dots inline as a prefix on the first line, plus a drain bar above it', async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/qualifying.lrc');

  const firstLine = page.locator('.lyric-line').nth(0);
  await expect(firstLine.locator('.gap-dot')).toHaveCount(4);
  await expect(firstLine).toContainText('Hello there');

  // The drain bar sits directly before the line it belongs to, not wrapped
  // together with the dots in a shared container.
  await expect(page.locator('.gap-drain')).toHaveCount(2); // leading + inter-line
  const children = await page.locator('.full-lyrics-view > *').evaluateAll((els) => els.map((el) => el.className));
  expect(children[0]).toContain('gap-drain');
  expect(children[1]).toContain('lyric-line');
});

test('a qualifying inter-line gap renders its dots inline on the second line, with its drain bar between the two lines', async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/qualifying.lrc');

  const secondLine = page.locator('.lyric-line').nth(1);
  await expect(secondLine.locator('.gap-dot')).toHaveCount(4);
  await expect(secondLine).toContainText('General Kenobi');

  const children = await page.locator('.full-lyrics-view > *').evaluateAll((els) => els.map((el) => el.className));
  // [gap-drain (leading), "Hello there" (with inline dots), gap-drain (inter-line), "General Kenobi" (with inline dots)]
  expect(children).toHaveLength(4);
  expect(children[2]).toContain('gap-drain');
  expect(children[3]).toContain('lyric-line');
});

test('a short (<= 1 measure) gap renders no dots and no drain bar at all', async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/short-gap.lrc');

  await expect(page.locator('.gap-dot')).toHaveCount(0);
  await expect(page.locator('.gap-drain')).toHaveCount(0);
  await expect(page.locator('.lyric-line')).toHaveCount(2);
});

test('dots light up one at a time, in order, across the 4 beats immediately preceding the gap end', async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/qualifying.lrc');

  // Inter-line gap: [3000ms, 6000ms], 120bpm/4-4 local measure = 2000ms,
  // beat = 500ms. The 4 beat timestamps immediately preceding 6000 are
  // 4000, 4500, 5000, 5500. The inter-line gap's dots are inline on the
  // second line ("General Kenobi").
  const dots = page.locator('.lyric-line').nth(1).locator('.gap-dot');

  await triggerPosition(page, 3999);
  await expect(dots).toHaveCount(4);
  await expect(page.locator('.lyric-line').nth(1).locator('.gap-dot.active')).toHaveCount(0);

  await triggerPosition(page, 4000);
  await expect(dots.nth(0)).toHaveClass(/active/);
  await expect(dots.nth(1)).not.toHaveClass(/active/);

  await triggerPosition(page, 4500);
  await expect(dots.nth(1)).toHaveClass(/active/);
  await expect(dots.nth(0)).not.toHaveClass(/active/);

  await triggerPosition(page, 5000);
  await expect(dots.nth(2)).toHaveClass(/active/);

  await triggerPosition(page, 5500);
  await expect(dots.nth(3)).toHaveClass(/active/);
});

test("the drain bar's fill decreases from 100% at gap start to 0% at gap end", async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/qualifying.lrc');

  // The inter-line drain bar immediately precedes the second line.
  const drain = page.locator('.lyric-line + .gap-drain');

  function readFill() {
    return drain.evaluate((el) => Number(el.style.getPropertyValue('--gap-fill')));
  }

  await triggerPosition(page, 3000); // gap start
  expect(await readFill()).toBeCloseTo(1, 2);

  await triggerPosition(page, 4500); // halfway through the 3000ms gap
  expect(await readFill()).toBeCloseTo(0.5, 1);

  await triggerPosition(page, 6000); // gap end
  expect(await readFill()).toBeCloseTo(0, 2);
});

// T001 (feedback F003/F004): once a gap fully elapses (currentTimeMs past
// gap.endMs), its dots and drain bar clear — the dots are removed from the
// `.lyric-line` (leaving plain text behind) and the drain bar element is
// removed entirely — instead of staying frozen forever.
test('dots and drain bar clear once a gap has fully elapsed, leaving plain line text behind', async ({ mount, page }) => {
  await mountAndWaitForScoreAndLrc(mount, page, '/qualifying.lrc');

  const firstLine = page.locator('.lyric-line').nth(0);
  await expect(firstLine.locator('.gap-dot')).toHaveCount(4);
  await expect(page.locator('.gap-drain')).toHaveCount(2);

  // Leading gap ends at 2500ms — past it, its dots/drain clear.
  await triggerPosition(page, 2600);
  await expect(firstLine.locator('.gap-dot')).toHaveCount(0);
  await expect(firstLine).toHaveText('Hello there');
  await expect(page.locator('.gap-drain')).toHaveCount(1);

  // Inter-line gap ends at 6000ms — past it, none remain.
  await triggerPosition(page, 6100);
  await expect(page.locator('.gap-dot')).toHaveCount(0);
  await expect(page.locator('.gap-drain')).toHaveCount(0);
  await expect(page.locator('.lyric-line').nth(1)).toHaveText('General Kenobi');
});
