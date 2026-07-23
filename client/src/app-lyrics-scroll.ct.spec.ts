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

// T005 (tasks-7f0f-4f2d.md, feedback F002): the routed Lobby/Playback view
// body (App.svelte's `.app-content`) and the standalone lyrics-part sheet
// (`.full-lyrics-view`) used to be independent top-level siblings, each
// capable of scrolling — producing two scrollbars and leaving stale Lobby
// content sitting (unscrollable-away) above the lyrics sheet. Once a
// lyrics-part participant is in the Playback view, only `.full-lyrics-view`
// should be a scrollable region; `.app-content` collapses out of the
// document flow entirely.
test('only one scrollable container is present, and app-content is collapsed, once the lyrics view is active', async ({ mount, page }) => {
  await mount(AppHarness);

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
    recordingPath: null,
    syncPoints: null,
  };

  const session: Session = {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 0 , userId: null},
    ],
    hostId: 'p1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
  };

  await page.evaluate(
    ({ session, song }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({
        ...(s as object),
        view: 'playback',
        session,
        selfParticipantId: 'p1',
        catalog: [song],
        wsClient,
      }));
    },
    { session, song },
  );

  await page.waitForSelector('.full-lyrics-view.visible');
  await page.waitForTimeout(300);

  await expect(page.locator('.app-content')).not.toBeVisible();

  // Exactly one scrollable region: .full-lyrics-view's own overflow-y auto.
  const overflowYs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *')).filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
    }).length,
  );
  expect(overflowYs).toBeLessThanOrEqual(1);
});
