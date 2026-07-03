import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

let pageErrors: string[];

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});

/**
 * SCOPE NOTE: `playback-engine.ts`'s clientStore subscription (drift
 * correction, Spotlight-mode force-follow, host-only paused-only seek) is
 * entirely gated on `api.isReadyForPlayback`. That flag never becomes
 * true under any browser-automation context this project has tried
 * (Playwright CT included) — confirmed empirically it stays `false`
 * indefinitely, matching this project's already-documented "Full
 * live-audio verification blocked by Chrome's autoplay policy in
 * browser-automation testing" limitation (not a new CT-specific bug).
 * That gated logic is therefore untestable here; it stays covered at the
 * pure-function level by `playback-sync.test.ts`
 * (test-coverage-backfill), and at the real-user level only by manual
 * browser testing — same status as `tasks-lobby-cursor-modes-0bea.md`'s
 * still-blocked T010. This test covers what *is* verifiable: the engine
 * constructs against a real alphaTab instance and renders real tab
 * output without crashing.
 */
test('constructs the engine and renders real tab output without crashing', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });

  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
});

/**
 * Playback-tick-report reporter (plan-playback-sync-fixes): deliberately not
 * gated on `api.isReadyForPlayback` (see SCOPE NOTE above — that flag never
 * resolves under browser automation), so it's testable here independent of
 * that known limitation. Drives the real `clientStore` (exposed by the
 * harness as `window.__clientStore` for this purpose) rather than the real
 * WS server.
 */
function makeSession(overrides: { hostId: string; status: 'stopped' | 'running' | 'paused' }) {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [],
    participants: [],
    hostId: overrides.hostId,
    playbackState: { status: overrides.status, tickPosition: 0, bpm: 120, serverTimestamp: Date.now() },
    countInEnabled: false,
    metronomeEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
  };
}

test('reports tickPosition periodically while host and running', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'host-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', status: 'running' }));

  await expect
    .poll(
      async () => {
        const messages = await page.evaluate(() => (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages);
        return messages.filter((m) => m.type === 'playback-tick-report').length;
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0);

  const reports = await page.evaluate(() =>
    (window as unknown as { __sentMessages: { type: string; tickPosition?: number }[] }).__sentMessages.filter((m) => m.type === 'playback-tick-report'),
  );
  const tickPosition = await page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition);
  expect(reports[0].tickPosition).toBe(tickPosition);
});

test('does not report tickPosition when not host', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'member-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', status: 'running' }));

  await page.waitForTimeout(1_500);
  const reports = await page.evaluate(() =>
    (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'playback-tick-report'),
  );
  expect(reports).toEqual([]);
});

/**
 * Hazard-bar real playback progress (plan-hazard-bar-progress): a third,
 * narrowly-scoped `playerPositionChanged` subscription (distinct from the
 * lrc-line-matching and seek-broadcast ones already covered above) writes
 * `currentTime / endTime` to `clientStore.playbackProgress` on every real
 * alphaTab instance, unconditionally (no host/session gating). Driven the
 * same way as "reports tickPosition periodically" above: setting
 * `api.tickPosition` directly is the same mechanism `correctDrift` itself
 * relies on to fire `playerPositionChanged` without needing real audio.
 */
async function readPlaybackProgress(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const store = (window as unknown as { __clientStore: { subscribe: (fn: (s: unknown) => void) => () => void } }).__clientStore;
    let value: unknown;
    const unsub = store.subscribe((s) => {
      value = (s as { playbackProgress: number }).playbackProgress;
    });
    unsub();
    return value as number;
  });
}

test('tracks real playbackProgress in clientStore from playerPositionChanged', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  expect(await readPlaybackProgress(page)).toBe(0);

  await page.evaluate(() => {
    const api = (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi();
    api.tickPosition = 1000;
  });

  await expect.poll(() => readPlaybackProgress(page), { timeout: 5_000 }).toBeGreaterThan(0);

  const expectedRatio = await page.evaluate(() => {
    const api = (window as unknown as { __getApi: () => { currentTime: number; endTime: number } }).__getApi();
    return api.endTime > 0 ? api.currentTime / api.endTime : 0;
  });
  expect(await readPlaybackProgress(page)).toBe(expectedRatio);
});

test('does not report tickPosition when status is not running', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'host-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', status: 'paused' }));

  await page.waitForTimeout(1_500);
  const reports = await page.evaluate(() =>
    (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'playback-tick-report'),
  );
  expect(reports).toEqual([]);
});
