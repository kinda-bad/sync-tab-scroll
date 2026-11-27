import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as at from '@coderline/alphatab';
import type { CatalogSong, Session, SelectedPart } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

/**
 * feedback-song-part-control-during-playb-dba8 F002: a participant can
 * change their own part mid-song without any stop or reset. Between two
 * instrument parts the engine switches the rendered track in place
 * (switchTrack, same alphaTab api, same position); to and from the Lyrics
 * part the engine is rebuilt locally and rejoins at the session's position.
 * Paused, not running, so the session tick holds still for the assertions.
 */
const BAR = 3840;
const TWO_TRACK_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  const bars = Array.from({ length: 16 }, () => '0.4.4 0.4.4 0.4.4 0.4.4').join(' | ');
  const words = Array.from({ length: 16 * 4 }, (_, i) => `w${i + 1}`).join(' ');
  importer.initFromString(
    `\\tempo 120\n.\n\\track "Guitar"\n\\lyrics "${words}"\n\\ts 4 4 ${bars}\n\\track "Bass"\n${bars}`,
    settings,
  );
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();
const LRC = `[00:00.00]line one\n[00:04.00]line two`;

test.beforeEach(async ({ page }) => {
  await page.route('**/two-track.gp', (route) => route.fulfill({ body: TWO_TRACK_GP, contentType: 'application/octet-stream' }));
  await page.route('**/two-track.lrc', (route) => route.fulfill({ body: LRC, contentType: 'text/plain' }));
});

const song: CatalogSong = {
  id: 'two-track',
  catalogueId: 'default',
  name: 'Two Track',
  artist: 'Fixture',
  gpFilePath: '/two-track.gp',
  parts: [
    { instrumentName: 'Guitar', trackIndex: 0 },
    { instrumentName: 'Bass', trackIndex: 1 },
  ],
  lyricsLrc: '/two-track.lrc',
  lyricsTrackIndex: 0,
  lyricsLineIndex: 0,
  lyricLineBreaks: [32, 32],
  recordingPath: null,
  syncPoints: null,
};

const PAUSED_TICK = 6 * BAR;

function session(part: SelectedPart): Session {
  return {
    code: 'ABCD',
    selectedSong: 'two-track',
    availableParts: song.parts,
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'member', connectionStatus: 'connected', selectedPart: part, readiness: 'ready', joinedAt: 0, userId: null },
      { id: 'p2', displayName: 'Bob', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1, userId: null },
    ],
    hostId: 'p2',
    playbackState: { status: 'paused', tickPosition: PAUSED_TICK, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
    startMarkerBar: null,
  };
}

/** Sets the store as a server session-state broadcast would (a fresh session object each time). */
async function broadcast(page: Page, s: Session) {
  await page.evaluate(
    ({ s, song }) => {
      const w = window as unknown as { __clientStore: { update: (fn: (x: unknown) => unknown) => void }; __wsClient: unknown };
      w.__clientStore.update((x) => ({ ...(x as object), view: 'playback', session: s, selfParticipantId: 'p1', catalog: [song], wsClient: w.__wsClient }));
    },
    { s, song },
  );
}

type Api = { isReadyForPlayback: boolean; tickPosition: number };
const api = (page: Page) =>
  page.evaluate(() => {
    const a = (window as unknown as { __getApi: () => Api | undefined }).__getApi();
    return a ? { isReadyForPlayback: a.isReadyForPlayback, tickPosition: a.tickPosition } : undefined;
  });

/** Waits for the current engine to be ready, then re-broadcasts (the server echoes each readiness-update) so its drift correction runs. */
async function settle(page: Page, s: Session) {
  await expect.poll(async () => (await api(page))?.isReadyForPlayback ?? false, { timeout: 20_000 }).toBe(true);
  await broadcast(page, s);
  await expect.poll(async () => Math.abs(((await api(page))?.tickPosition ?? -1e9) - PAUSED_TICK), { timeout: 10_000 }).toBeLessThan(BAR / 4);
}

const controlMessages = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'playback-control' || m.type === 'song-select'));

test('switching between instrument parts mid-song keeps the same engine and position', async ({ mount, page }) => {
  await mount(AppHarness);
  await broadcast(page, session(0));
  await settle(page, session(0));
  await page.evaluate(() => {
    const w = window as unknown as { __getApi: () => unknown; __apiBefore: unknown };
    w.__apiBefore = w.__getApi();
  });

  await broadcast(page, session(1));

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { tracks: { index: number }[] } }).__getApi().tracks.map((t) => t.index)))
    .toEqual([1]);
  expect(await page.evaluate(() => {
    const w = window as unknown as { __getApi: () => unknown; __apiBefore: unknown };
    return w.__getApi() === w.__apiBefore;
  })).toBe(true);
  expect(Math.abs(((await api(page))?.tickPosition ?? -1e9) - PAUSED_TICK)).toBeLessThan(BAR / 4);
  expect(await controlMessages(page)).toEqual([]);
});

test('switching to the Lyrics part and back mid-song rebuilds locally, renders the tab, and rejoins the session position', async ({ mount, page }) => {
  await mount(AppHarness);
  await broadcast(page, session(0));
  await settle(page, session(0));

  await broadcast(page, session('lyrics'));
  await expect(page.locator('.full-lyrics-view.visible')).toBeVisible();
  await settle(page, session('lyrics'));

  await broadcast(page, session(0));
  await expect(page.locator('.engine-containers.visible')).toBeVisible();
  await settle(page, session(0));
  await expect(page.locator('.at-surface svg').first()).toBeVisible({ timeout: 20_000 });

  expect(await controlMessages(page)).toEqual([]);
});
