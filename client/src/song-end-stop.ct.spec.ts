import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as at from '@coderline/alphatab';
import type { Session } from '@sync-tab-scroll/shared';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

/**
 * Song end stops playback instead of looping (user feedback 2026-11-27:
 * "i dont want the playback to loop by default").
 *
 * Root cause: nothing handled the song's end. alphaTab finishes and stops
 * (not looping is its default), but the session stays 'running', so
 * correctDrift's "running but not playing" branch calls play() again and
 * the song starts over. Now the host sends the same Stop as the Stop
 * button. Every participant, the host included, also holds still at the
 * end until the session leaves 'running', so nobody restarts while that
 * Stop is in flight.
 */

// 2 bars at 240bpm: two seconds of playback.
const SHORT_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(`\\tempo 240\n.\n\\track "Guitar"\n\\ts 4 4 0.4.4 0.4.4 0.4.4 0.4.4 | 0.4.4 0.4.4 0.4.4 0.4.4`, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();

function session(selfIsHost: boolean): Session {
  return {
    code: 'ABCD',
    selectedSong: 'short',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
      { id: 'p2', displayName: 'Bob', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1, userId: null },
    ],
    hostId: selfIsHost ? 'p2' : 'p1',
    playbackState: { status: 'running', tickPosition: 0, bpm: 240, serverTimestamp: Date.now() },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
    startMarkerBar: null,
  } as Session;
}

type Win = {
  __getApi: () => at.AlphaTabApi | undefined;
  __sentMessages: { type: string; action?: string }[];
  __clientStore: { update: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function playToEnd(mount: any, page: Page, selfIsHost: boolean) {
  await page.route('**/short.gp', (route) => route.fulfill({ body: SHORT_GP, contentType: 'application/octet-stream' }));
  await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/short.gp', trackIndex: 0, songOverrides: { lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null } },
  });
  await page.waitForFunction(() => (window as unknown as Win).__getApi()?.isReadyForPlayback === true, undefined, { timeout: 20_000 });
  await page.evaluate(() => {
    const w = window as unknown as Win & { __finished: number };
    w.__finished = 0;
    w.__getApi()!.playerFinished.on(() => w.__finished++);
  });
  // Session running, as after Start: correctDrift plays the engine.
  await page.evaluate((s) => {
    (window as unknown as Win).__clientStore.update((st) => ({ ...st, session: s, selfParticipantId: 'p2' }));
  }, session(selfIsHost));
  await page.waitForFunction(() => (window as unknown as { __finished: number }).__finished >= 1, undefined, { timeout: 15_000 });
  // Store updates keep arriving while the session still says 'running'
  // (tick reports, other participants' changes) before the Stop lands.
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(200);
    await page.evaluate((s) => {
      (window as unknown as Win).__clientStore.update((st) => ({ ...st, session: { ...s, playbackState: { ...s.playbackState, serverTimestamp: Date.now() } } }));
    }, session(selfIsHost));
  }
}

for (const selfIsHost of [true, false]) {
  test(`playback stops at the song end instead of starting over (${selfIsHost ? 'host' : 'member'})`, async ({ mount, page }) => {
    await playToEnd(mount, page, selfIsHost);
    const state = await page.evaluate((playing) => {
      const w = window as unknown as Win;
      return {
        playing: (w.__getApi()!.playerState as number) === playing,
        stops: w.__sentMessages.filter((m) => m.type === 'playback-control' && m.action === 'stop').length,
        finished: (window as unknown as { __finished: number }).__finished,
      };
    }, at.synth.PlayerState.Playing as number);
    expect(state.finished).toBe(1);
    expect(state.playing).toBe(false);
    expect(state.stops).toBe(selfIsHost ? 1 : 0);
  });
}
