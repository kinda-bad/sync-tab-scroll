import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import AppHarness from './test-harness/AppHarness.svelte';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';

/**
 * default-to-recording-source: when the selected song ships a recording, the
 * server defaults the session to it (song-select). This checks the client side
 * of that default through the real App wiring: a session that arrives already
 * in recording mode builds a backing-track engine straight away (no synth
 * engine first), ignores the count-in even with the host's toggle on, and the
 * Session tab shows Recording selected with Synth still available.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../test-fixtures/fixture-catalog/recording-aligned');
const gp = fs.readFileSync(path.join(root, 'recording-aligned.gp'));
const mp3 = fs.readFileSync(path.join(root, 'recording.mp3'));
const syncPoints = JSON.parse(fs.readFileSync(path.join(root, 'meta.json'), 'utf8')).syncPoints;

const song: CatalogSong = {
  id: 'aligned',
  catalogueId: 'default',
  name: 'Aligned',
  artist: 'Fixtures',
  gpFilePath: '/recording.gp',
  parts: [{ instrumentName: 'Click', trackIndex: 0 }],
  lyricsLrc: null,
  lyricsTrackIndex: null,
  lyricsLineIndex: null,
  lyricLineBreaks: null,
  recordingPath: '/recording.mp3',
  syncPoints,
};

function session(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: 'aligned',
    availableParts: song.parts,
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'loading', joinedAt: 0, userId: null },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: true,
    playbackSource: 'recording',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
    startMarkerBar: null,
    ...overrides,
  };
}

test('a session defaulted to recording builds a backing-track engine and ignores the count-in', async ({ mount, page }) => {
  await page.route('**/recording.gp', (r) => r.fulfill({ body: gp, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (r) => r.fulfill({ body: mp3, contentType: 'audio/mpeg' }));
  await mount(AppHarness);

  await page.evaluate(
    ({ session, song }) => {
      const w = window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void }; __wsClient: unknown };
      w.__clientStore.update((s) => ({ ...(s as object), view: 'lobby', session, selfParticipantId: 'host-1', catalog: [song], wsClient: w.__wsClient }));
    },
    { session: session(), song },
  );

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const api = (window as unknown as { __getApi: () => { isReadyForPlayback: boolean; settings: { player: { playerMode: number } }; score?: { backingTrack?: unknown } } | undefined }).__getApi();
          return api ? { mode: api.settings.player.playerMode, backing: api.score?.backingTrack != null, ready: api.isReadyForPlayback } : null;
        }),
      { timeout: 30_000 },
    )
    .toEqual({ mode: 3, backing: true, ready: true });

  // Count-in is on for the session, but recording mode forces it off.
  const countIn = await page.evaluate(() => (window as unknown as { __getApi: () => { countInVolume: number } }).__getApi().countInVolume);
  expect(countIn).toBe(0);

  // The host can still choose the synth for this song.
  await page.getByRole('button', { name: /settings/i }).first().click();
  const settings = page.getByRole('dialog');
  await settings.getByRole('button', { name: 'Session', exact: true }).click();
  await expect(settings.getByText('Everyone hears the real recording.')).toBeVisible();
  await settings.getByRole('button', { name: 'Synth' }).click();
  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'playback-source-set'));
  expect(sent).toEqual([{ type: 'playback-source-set', source: 'synth' }]);
});
