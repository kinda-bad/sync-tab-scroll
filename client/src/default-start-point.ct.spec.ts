import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Four bars with in-tab lyrics on track 0, so a bar-3 start is mid-song and
// the lyrics ticker has syllables to move between.
const GP_PATH = path.resolve(__dirname, '../test-fixtures/fixture-catalog/lyrics-in-tab/lyrics-in-tab.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

/**
 * per-song-default-start-point: the host's real engine maps the session's
 * start marker (`Session.startMarkerBar`) to a playback tick once it's ready and seeks to it with an
 * ordinary `seek`; the server's echo (driven here through the real
 * clientStore) then parks the engine at that tick while stopped, and the
 * lyrics ticker follows the parked position. Uses the same real-engine
 * harness and `isReadyForPlayback` polling as spotlight-follow.ct.spec.ts.
 */
const START_BAR = 3;

type Win = {
  __getApi: () => {
    isReadyForPlayback: boolean;
    tickPosition: number;
    score: { masterBars: unknown[] };
    tickCache: { getMasterBarStart: (bar: unknown) => number };
  };
  __sentMessages: { type: string; action?: string; tickPosition?: number }[];
  __clientStore: { update: (fn: (s: unknown) => unknown) => void };
};

function makeSession(overrides: {
  hostId: string;
  tickPosition: number;
  status?: 'stopped' | 'running';
  playbackSource?: 'synth' | 'recording';
  startMarkerBar?: number | null;
}) {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [],
    participants: [],
    hostId: overrides.hostId,
    playbackState: { status: overrides.status ?? ('stopped' as const), tickPosition: overrides.tickPosition, bpm: 120, serverTimestamp: Date.now() },
    countInEnabled: false,
    playbackSource: overrides.playbackSource ?? 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    earlyStopTick: null,
    hostBarsPerRow: null,
    startMarkerBar: overrides.startMarkerBar === undefined ? START_BAR : overrides.startMarkerBar,
  };
}

// Untyped `mount`, same helper shape as full-lyrics-view.ct.spec.ts.
async function mountReady(mount: any, page: Page, props: Record<string, unknown> = {}) {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0, ...props } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().isReadyForPlayback), { timeout: 15_000 }).toBe(true);
  return component;
}

async function pushSession(page: Page, selfParticipantId: string, session: ReturnType<typeof makeSession>) {
  await page.evaluate(
    ({ selfParticipantId, session }) => {
      (window as unknown as Win).__clientStore.update((s) => ({ ...(s as object), selfParticipantId, session: { ...session, playbackState: { ...session.playbackState, serverTimestamp: Date.now() } } }));
    },
    { selfParticipantId, session },
  );
}

// Lets a Start settle before the next push. A Stop sent milliseconds after a
// Start (never at human speed) can race alphaTab's late seek echo of play().
function waitUntilPlaying(page: Page) {
  return expect.poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { playerState: number } }).__getApi().playerState), { timeout: 10_000 }).toBe(1);
}

function tickNow(page: Page) {
  return page.evaluate(() => (window as unknown as Win).__getApi().tickPosition);
}

function seeks(page: Page) {
  return page.evaluate(() => (window as unknown as Win).__sentMessages.filter((m) => m.type === 'playback-control' && m.action === 'seek'));
}

function expectedStartTick(page: Page) {
  return page.evaluate((bar) => {
    const api = (window as unknown as Win).__getApi();
    return api.tickCache.getMasterBarStart(api.score.masterBars[bar - 1]);
  }, START_BAR);
}

test('host engine seeks once to the start marker, then parks there once the server echoes it', async ({ mount, page }) => {
  await mountReady(mount, page);
  const target = await expectedStartTick(page);
  expect(target).toBeGreaterThan(0);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await expect.poll(() => seeks(page)).toEqual([{ type: 'playback-control', action: 'seek', tickPosition: target }]);

  // Further store updates in the same stopped stretch don't re-seed.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await page.waitForTimeout(300);
  expect(await seeks(page)).toHaveLength(1);

  // Server echo: playbackState.tickPosition is now the seeded tick.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().tickPosition)).toBeGreaterThan(target - 10);
  await page.waitForTimeout(1_000);
  const after = await page.evaluate(() => (window as unknown as Win).__getApi().tickPosition);
  expect(Math.abs(after - target)).toBeLessThanOrEqual(10);
});

test('a non-host engine never seeks, but parks at the stopped position the host set', async ({ mount, page }) => {
  await mountReady(mount, page);
  const target = await expectedStartTick(page);

  await pushSession(page, 'member-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await page.waitForTimeout(500);
  expect(await seeks(page)).toEqual([]);

  await pushSession(page, 'member-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().tickPosition)).toBeGreaterThan(target - 10);
  await page.waitForTimeout(1_000);
  const after = await page.evaluate(() => (window as unknown as Win).__getApi().tickPosition);
  expect(Math.abs(after - target)).toBeLessThanOrEqual(10);
});

test('a host click while stopped is broadcast, held locally until echoed, and not overridden by the marker', async ({ mount, page }) => {
  await mountReady(mount, page);
  const target = await expectedStartTick(page);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await expect.poll(() => seeks(page)).toHaveLength(1);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await expect.poll(() => tickNow(page)).toBeGreaterThan(target - 70);

  // The host clicks bar 2: alphaTab fires beatMouseDown, then click-to-seek
  // assigns the tick.
  const bar2 = await page.evaluate(() => {
    const api = (window as unknown as Win).__getApi() as ReturnType<Win['__getApi']> & { beatMouseDown: { trigger: (beat: unknown) => void } };
    api.beatMouseDown.trigger(null);
    const tick = api.tickCache.getMasterBarStart(api.score.masterBars[1]);
    api.tickPosition = tick;
    return tick;
  });
  await expect.poll(() => seeks(page)).toHaveLength(2);
  expect((await seeks(page))[1].tickPosition).toBeGreaterThanOrEqual(bar2 - 2);

  // Before the echo, further store updates don't snap the click back.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await page.waitForTimeout(300);
  expect(Math.abs((await tickNow(page)) - bar2)).toBeLessThanOrEqual(70);

  // Echo: the click is now the session's stopped position, and it sticks.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: bar2 }));
  await page.waitForTimeout(300);
  expect(Math.abs((await tickNow(page)) - bar2)).toBeLessThanOrEqual(70);
  expect(await seeks(page)).toHaveLength(2);
});

test('with no start marker (or once it is cleared) no seek is sent, before or after a Stop', async ({ mount, page }) => {
  await mountReady(mount, page);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0, startMarkerBar: null }));
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 1920, status: 'running', startMarkerBar: null }));
  await waitUntilPlaying(page);
  await page.waitForTimeout(1_000);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0, startMarkerBar: null }));
  await page.waitForTimeout(500);
  // alphaTab's late seek event after the Stop's pause is neither broadcast
  // nor left standing: the cursor is back on bar 1.
  expect(await seeks(page)).toEqual([]);
  expect(await tickNow(page)).toBeLessThanOrEqual(70);
});

test('every Stop returns to the marker while it is set', async ({ mount, page }) => {
  await mountReady(mount, page);
  const target = await expectedStartTick(page);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await expect.poll(() => seeks(page)).toHaveLength(1);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target, status: 'running' }));
  await waitUntilPlaying(page);
  // Stop: the server resets to 0; the host seeks straight back to the marker.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await expect.poll(() => seeks(page)).toHaveLength(2);
  expect((await seeks(page))[1].tickPosition).toBe(target);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await page.waitForTimeout(500);
  expect(await seeks(page)).toHaveLength(2);
  expect(Math.abs((await tickNow(page)) - target)).toBeLessThanOrEqual(70);
});

test('moving the marker while stopped seeks the host to the new bar', async ({ mount, page }) => {
  await mountReady(mount, page);
  const bar2 = await page.evaluate(() => {
    const api = (window as unknown as Win).__getApi();
    return api.tickCache.getMasterBarStart(api.score.masterBars[1]);
  });

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0 }));
  await expect.poll(() => seeks(page)).toHaveLength(1);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0, startMarkerBar: 2 }));
  await expect.poll(() => seeks(page)).toHaveLength(2);
  expect((await seeks(page))[1].tickPosition).toBe(bar2);
});

test('the lyrics ticker follows a mid-song stopped park', async ({ mount, page }) => {
  await mountReady(mount, page);
  const target = await expectedStartTick(page);
  const highlighted = page.locator('.lyric-syllable.at-highlight');
  const before = await highlighted.textContent();

  await pushSession(page, 'member-1', makeSession({ hostId: 'host-1', tickPosition: target }));
  await expect.poll(() => highlighted.textContent()).not.toBe(before);
});

/**
 * Recording mode: the seeded tick is all the app supplies — alphaTab maps it
 * through the song's sync points to the recording's time. The skewed fixture
 * is notated at 120 bpm but recorded at 130 bpm, so bar 9 sits at 16.0 s of
 * notation but 14.77 s of audio (syncPoints[8]); the backing audio must start
 * at the recording's moment, not the notated one.
 */
test('in recording mode, a seeded bar-9 start plays the recording from the sync point for that bar', async ({ mount, page }) => {
  const root = path.resolve(__dirname, '../test-fixtures/fixture-catalog/recording-skewed');
  const gp = fs.readFileSync(path.join(root, 'recording-skewed.gp'));
  const mp3 = fs.readFileSync(path.join(root, 'recording.mp3'));
  const syncPoints = JSON.parse(fs.readFileSync(path.join(root, 'meta.json'), 'utf8')).syncPoints as { barIndex: number; millisecondOffset: number }[];
  await page.route('**/recording.gp', (r) => r.fulfill({ body: gp, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (r) => r.fulfill({ body: mp3, contentType: 'audio/mpeg' }));
  const expectedMs = syncPoints.find((p) => p.barIndex === 8)!.millisecondOffset;

  const component = await mount(PlaybackEngineHarness, {
    props: { gpFilePath: '/recording.gp', trackIndex: 0, recordingPath: '/recording.mp3', syncPoints },
  });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => (window as unknown as { __switchSource: (s: string) => void }).__switchSource('recording'));
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const api = (window as unknown as { __getApi: () => { isReadyForPlayback: boolean; score?: { backingTrack?: unknown } } }).__getApi();
          return api.isReadyForPlayback && api.score?.backingTrack != null;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0, playbackSource: 'recording', startMarkerBar: 9 }));
  await expect.poll(() => seeks(page)).toHaveLength(1);
  const [{ tickPosition: seeded }] = await seeks(page);
  expect(seeded).toBe(8 * 3840);

  // Echo the seek, then start.
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: seeded!, playbackSource: 'recording', startMarkerBar: 9 }));
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: seeded!, status: 'running', playbackSource: 'recording', startMarkerBar: 9 }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { playerState: number } }).__getApi().playerState), { timeout: 10_000 }).toBe(1);

  const audioMs = await page.evaluate(() => {
    const api = (window as unknown as { __getApi: () => { player?: { output?: { audioElement?: HTMLAudioElement } } } }).__getApi();
    return api.player!.output!.audioElement!.currentTime * 1000;
  });
  // The park/start assignments' readback stayed inside the echo tolerance:
  // no extra seek was broadcast.
  expect(await seeks(page)).toHaveLength(1);
  // Started at the recording's bar 9 (plus however long the poll took),
  // well short of the notated 16 s.
  expect(audioMs).toBeGreaterThanOrEqual(expectedMs - 50);
  expect(audioMs).toBeLessThan(expectedMs + 1000);
});

test('a part switch while parked keeps the marker position, and does not re-seek', async ({ mount, page }) => {
  // Two tracks, two bars: start at bar 2 so there's a track to switch to.
  // Registered after beforeEach's route, so it takes precedence.
  const twoTrack = fs.readFileSync(path.resolve(__dirname, '../test-fixtures/two-track-song.gp'));
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: twoTrack, contentType: 'application/octet-stream' }));
  await mountReady(mount, page);
  const target = await page.evaluate(() => {
    const api = (window as unknown as Win).__getApi();
    return api.tickCache.getMasterBarStart(api.score.masterBars[1]);
  });
  expect(target).toBe(3840);

  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: 0, startMarkerBar: 2 }));
  await expect.poll(() => seeks(page)).toHaveLength(1);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target, startMarkerBar: 2 }));
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().tickPosition)).toBeGreaterThan(target - 10);

  // Same-api part switch (switchTrack re-renders another track of the same score).
  await page.evaluate(() => (window as unknown as { __switchPart: (i: number) => void }).__switchPart(1));
  await page.waitForTimeout(1_500);
  await pushSession(page, 'host-1', makeSession({ hostId: 'host-1', tickPosition: target, startMarkerBar: 2 }));
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => (window as unknown as Win).__getApi().tickPosition);
  expect(Math.abs(after - target)).toBeLessThanOrEqual(10);
  expect(await seeks(page)).toHaveLength(1);
});
