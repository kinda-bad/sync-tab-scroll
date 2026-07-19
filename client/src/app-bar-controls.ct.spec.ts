import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);
const LRC_CONTENT = `[00:00.00]Hello there\n[00:02.00]General Kenobi`;

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/fixture-lyrics.lrc', (route) => route.fulfill({ body: LRC_CONTENT, contentType: 'text/plain' }));
});

const song: CatalogSong = {
  id: 'creep',
  catalogueId: 'default',
  name: 'Creep',
  artist: 'Radiohead',
  gpFilePath: '/fixture.gp',
  parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  lyricsLrc: '/fixture-lyrics.lrc',
  lyricsTrackIndex: 0,
  lyricsLineIndex: 0,
  lyricLineBreaks: [2],
};

function instrumentSession(view: 'lobby' | 'playback'): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
    ],
    hostId: 'p1',
    playbackState: { status: view === 'playback' ? 'running' : 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
  };
}

function lyricsSession(): Session {
  return {
    ...instrumentSession('playback'),
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 0, userId: null },
    ],
  };
}

async function setStore(page: import('@playwright/test').Page, view: 'lobby' | 'playback', session: Session) {
  await page.evaluate(
    ({ session, song, view }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({
        ...(s as object),
        view,
        session,
        selfParticipantId: 'p1',
        catalog: [song],
        wsClient,
      }));
    },
    { session, song, view },
  );
}

// T002/T003 (tasks-bottom-bar-icons-47a6.md): the bar's Settings,
// Start/Pause-Resume/Stop, Leave-session, and (T003) Toggle-lyrics
// controls are icon-only buttons, each still exposing its original label
// via aria-label (Button.svelte's iconOnly support from T001).
test('lobby: Song & part, Settings, Start, and Leave session render icon-only with correct aria-labels', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'lobby', instrumentSession('lobby'));

  const songPart = page.getByRole('button', { name: 'Song & part' });
  const settings = page.getByRole('button', { name: 'Settings' });
  const start = page.getByRole('button', { name: 'Start' });
  const leave = page.getByRole('button', { name: 'Leave session' });

  await expect(songPart).toBeVisible();
  await expect(settings).toBeVisible();
  await expect(start).toBeVisible();
  await expect(leave).toBeVisible();
  await expect(songPart).toHaveText('');
  await expect(settings).toHaveText('');
  await expect(start).toHaveText('');
  await expect(leave).toHaveText('');
});

// Feedback: the lyrics toggle was gated to the Playback view only, so it
// wasn't reachable before playback started even though the overlay's
// engine/DOM already exists once a part is picked in the Lobby (ui.md
// Lobby View: load is triggered "the moment a participant's part is
// known ... in the Lobby"). Widened the bar's gating from
// `view === 'playback'` to `hasPart`, so it's visible in both views.
test('lobby (instrument part selected): Toggle lyrics is visible before playback starts', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'lobby', instrumentSession('lobby'));

  const toggleLyrics = page.getByRole('button', { name: 'Toggle lyrics' });
  await expect(toggleLyrics).toBeVisible();
  await expect(toggleLyrics).toHaveText('');
});

test('playback (instrument part): Pause/Resume, Stop, and Toggle lyrics render icon-only in the bar', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'playback', instrumentSession('playback'));

  const pause = page.getByRole('button', { name: 'Pause' });
  const stop = page.getByRole('button', { name: 'Stop' });
  const toggleLyrics = page.getByRole('button', { name: 'Toggle lyrics' });

  await expect(pause).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(toggleLyrics).toBeVisible();
  await expect(pause).toHaveText('');
  await expect(stop).toHaveText('');
  await expect(toggleLyrics).toHaveText('');

  // Moved out of Playback.svelte's own body into the bar (T003) — no
  // standalone control left in the view's own markup.
  await expect(page.locator('.playback-controls button')).toHaveCount(0);
});

// T001 (tasks-icons-a11y-ticker-a10d.md, feedback F005): Bar tooltips
// rendered UNDERNEATH the alphaTab tab view during Playback. The tooltip
// lives inside `.bar-wrap` (position: fixed, z-index — the stacking context
// every bar child, tooltip included, is trapped in), while alphaTab injects
// its own `.at-cursors` wrapper with an inline z-index: 1000 and the lyrics
// ticker sits at 1001 — both above the bar's old z-index: 100, so a child
// z-index could never escape to paint the tooltip over them. The fix raises
// the bar's own stacking context above both; the required order is
// tab cursors (1000) < lyrics ticker < bar/tooltip.
test('tooltip stacking: bar sits above the lyrics ticker, which sits above the alphaTab cursor layer', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'playback', instrumentSession('playback'));

  // Engine DOM present (the ticker is what the bar must out-stack).
  await page.waitForSelector('.lyrics-overlay');

  // Show a bar tooltip via mouse hover on an icon-only control.
  await page.getByRole('button', { name: 'Settings' }).hover();
  const tooltip = page.locator('.bar-wrap [role="tooltip"]');
  await expect(tooltip).toBeVisible();

  const { barZ, overlayZ } = await page.evaluate(() => ({
    barZ: Number(getComputedStyle(document.querySelector('.bar-wrap')!).zIndex),
    overlayZ: Number(getComputedStyle(document.querySelector('.lyrics-overlay')!).zIndex),
  }));
  // Ticker still above alphaTab's .at-cursors inline z-index: 1000 …
  expect(overlayZ).toBeGreaterThan(1000);
  // … and the bar (the tooltip's stacking context) above the ticker, so
  // the tooltip paints over both the tab view and the ticker.
  expect(barZ).toBeGreaterThan(overlayZ);
});

test('playback (lyrics part): Toggle lyrics is absent entirely', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'playback', lyricsSession());

  await expect(page.getByRole('button', { name: 'Toggle lyrics' })).toHaveCount(0);
});

/**
 * T004 (tasks-bottom-bar-icons-47a6.md, feedback-bottom-bar-icons-3a15
 * F001): toggling lyrics off must hide the *entire* visible strip band, not
 * just the syllable text. Root cause found live (via a repro CT spec):
 * `.lyrics-overlay.ts`'s `setVisible()` already correctly sets
 * `display: none` on the overlay element itself (verified separately in
 * lyrics-overlay.ct.spec.ts), but `App.svelte`'s
 * `.engine-containers.visible { padding-bottom: calc(var(--lyrics-strip-height) * 2) }`
 * rule — reserved scroll room so the tab's last rows clear the strip
 * (plan-lyrics-ticker-2026-07-03.md) — stayed applied regardless of the
 * toggle, because `showOverlay` lived only in playback-engine.ts's module
 * closure with no reactive signal into App.svelte. On `--canvas-bg`
 * (`.tab-container`'s background), that reserved region reads as a
 * persisting solid band even once the overlay itself is `display: none`.
 */
test('toggling lyrics off collapses the reserved strip padding, not just the overlay element', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, 'playback', instrumentSession('playback'));

  await page.waitForSelector('.lyrics-overlay');
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => getComputedStyle(document.querySelector('.engine-containers')!).paddingBottom);
  expect(before).not.toBe('0px');

  await page.getByRole('button', { name: 'Toggle lyrics' }).click();
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => getComputedStyle(document.querySelector('.engine-containers')!).paddingBottom);
  expect(after).toBe('0px');
});
