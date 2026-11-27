import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as at from '@coderline/alphatab';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

/**
 * Lyrics on the playback timeline (plan-lyrics-timing-repeats-2026-11-27-4c1e):
 * the in-tab ticker after a repeat sign, and an lrclib `.lrc`'s recording
 * times converted to tab time, both through the real ensurePlaybackEngine
 * wiring. The scores are built from AlphaTex and exported to GP7 here, so
 * the fixture's repeats/tempo are readable in the test itself.
 */

const BAR = 3840; // one 4/4 bar in MIDI ticks

function gp7FromTex(tex: string): Buffer {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
}

// Bars: 1 | :2 3:| x2 | 4 → played 1 2 3 2 3 4. Two half-note syllables per bar.
const REPEAT_GP = gp7FromTex(
  `\\tempo 120\n.\n\\track "Voice"\n\\lyrics "one two three four five six seven eight"\n` +
    `\\ts 4 4 0.4.2 0.4.2 | \\ro 1.4.2 1.4.2 | \\rc 2 2.4.2 2.4.2 | 3.4.2 3.4.2`,
);

// Four plain 4/4 bars at 120bpm: 2000ms of tab time per bar.
const FOUR_BAR_GP = gp7FromTex(`\\tempo 120\n.\n\\track "Voice"\n\\ts 4 4 0.4.1 | 0.4.1 | 0.4.1 | 0.4.1`);

// lrclib-style: studio-recording times. The recording starts 1s in and plays
// bars 1–2 at half speed, so recording 5000ms is tab 2000ms, 9000ms is 4000ms.
const LRCLIB_LRC = `[00:01.00]First line\n[00:05.00]Second line\n[00:09.00]Third line\n`;
const LRCLIB_SYNC_POINTS = [
  { barIndex: 0, barOccurence: 0, barPosition: 0, millisecondOffset: 1000 },
  { barIndex: 2, barOccurence: 0, barPosition: 0, millisecondOffset: 9000 },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/repeat.gp', (route) => route.fulfill({ body: REPEAT_GP, contentType: 'application/octet-stream' }));
  await page.route('**/four-bar.gp', (route) => route.fulfill({ body: FOUR_BAR_GP, contentType: 'application/octet-stream' }));
  await page.route('**/lrclib.lrc', (route) => route.fulfill({ body: LRCLIB_LRC, contentType: 'text/plain' }));
});

function trigger(page: Page, position: { currentTick?: number; currentTime?: number }) {
  return page.evaluate(({ currentTick = 0, currentTime = 0 }) => {
    const api = (window as unknown as { __getApi: () => { playerPositionChanged: { trigger: (e: unknown) => void } } }).__getApi();
    api.playerPositionChanged.trigger({ currentTime, endTime: 100_000, currentTick, endTick: 0, isSeek: false, originalTempo: 120, modifiedTempo: 120 });
  }, position);
}

async function waitForReady(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } | undefined }).__getApi()?.isReadyForPlayback === true,
    undefined,
    { timeout: 20_000 },
  );
}

test("ticker shows a repeated bar's syllables again on the second pass, and later bars on time", async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/repeat.gp', trackIndex: 0, songOverrides: { lyricLineBreaks: [8] } },
  });
  await page.waitForSelector('.lyrics-overlay', { timeout: 20_000 });
  const highlighted = page.locator('.lyric-syllable.at-highlight');

  // First pass of bar 2.
  await trigger(page, { currentTick: BAR + 100 });
  await expect(highlighted).toHaveText('three ');

  // Playback tick 3 bars in is bar 2 again (second pass), not bar 4.
  await trigger(page, { currentTick: 3 * BAR + 100 });
  await expect(highlighted).toHaveText('three ');
  await trigger(page, { currentTick: 4 * BAR + 1920 + 100 });
  await expect(highlighted).toHaveText('six ');

  // Bar 4 is played at tick 5 * BAR (its written start is 3 * BAR).
  await trigger(page, { currentTick: 5 * BAR + 100 });
  await expect(highlighted).toHaveText('seven ');
});

test('measure markers follow the playback order (bar numbers repeat on the second pass)', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.setItem('sync-tab-scroll:lyrics-measure-markers', 'on'));
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/repeat.gp', trackIndex: 0, songOverrides: { lyricLineBreaks: [8] } },
  });
  await page.waitForSelector('.lyrics-overlay', { timeout: 20_000 });
  await expect(page.locator('.lyrics-measure-marker-number')).toHaveText(['1', '2', '3', '2', '3', '4']);
});

test("lyric sheet converts an lrclib .lrc's recording times to tab time through the song's sync points", async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/four-bar.gp',
      trackIndex: 0,
      isLyricsPart: true,
      lyricsLrc: '/lrclib.lrc',
      songOverrides: { lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null, syncPoints: LRCLIB_SYNC_POINTS },
    },
  });
  await waitForReady(page);
  await expect(page.locator('.lyric-line')).toHaveCount(3);
  const active = page.locator('.lyric-line.active');

  // Tab 2500ms: recording ~6000ms, so "Second line" (recording 5000ms), not
  // still "First line" as a raw comparison against 5000ms would give.
  await trigger(page, { currentTime: 2500 });
  await expect(active).toHaveText('Second line');

  // Tab 4500ms is past "Third line" (recording 9000ms = tab 4000ms).
  await trigger(page, { currentTime: 4500 });
  await expect(active).toHaveText('Third line');
});

test('lyric sheet keeps lrclib times as they are when the song has no sync points', async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/four-bar.gp',
      trackIndex: 0,
      isLyricsPart: true,
      lyricsLrc: '/lrclib.lrc',
      songOverrides: { lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null, syncPoints: null },
    },
  });
  await waitForReady(page);
  await expect(page.locator('.lyric-line')).toHaveCount(3);
  await trigger(page, { currentTime: 4500 });
  await expect(page.locator('.lyric-line.active')).toHaveText('First line');
});

test("lyric sheet shows a tab-sourced line's raw GP text without + holds or syllable hyphens", async ({ mount, page }) => {
  await page.route('**/raw-line.lrc', (route) =>
    route.fulfill({ body: `[00:00.00]But I'm a + creep, I'm a + weir-do + +\n[00:02.00]\n`, contentType: 'text/plain' }),
  );
  await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/four-bar.gp',
      trackIndex: 0,
      isLyricsPart: true,
      lyricsLrc: '/raw-line.lrc',
      songOverrides: { lyricsRawLine: "But I'm a + creep, I'm a + weir-do + +\nWhat the hell am I do-ing here?" },
    },
  });
  await expect(page.locator('.lyric-line')).toHaveText(["But I'm a creep, I'm a weirdo"]);
});
