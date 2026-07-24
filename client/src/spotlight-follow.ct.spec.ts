import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

/**
 * Regression coverage for plan-f841-2026-07-24-bdce.md: live two-tab manual
 * verification (tasks-lobby-cursor-modes-0bea.md T010, scenario 2) found
 * that with Spotlight mode ON, a host setting `session.lobbyCursorTick`
 * never moved a participant's `api.tickPosition` — even though real synth
 * playback (the same `isReadyForPlayback`-gated `clientStore.subscribe`
 * callback in `playback-engine.ts`) is proven to work correctly elsewhere
 * in this file's "real playback emits real tempo" test. Root cause (T002):
 * two of `correctDrift`'s own sub-blocks in `playback-sync.ts` fought the
 * Spotlight-follow assignment while `playbackState.status === 'stopped'`
 * (the pre-playback Lobby state Spotlight mode targets) — fixed in T003 by
 * exempting both on a boolean `spotlightHoldingTick`. This spec mounts the
 * same harness, waits for `isReadyForPlayback` (the established polling
 * pattern from `full-lyrics-view.ct.spec.ts` / `playback-engine.ct.spec.ts`'s
 * real-playback test), then drives the mounted `clientStore` to a session
 * with `spotlightMode: true` and a fresh `lobbyCursorTick`, and asserts
 * `api.tickPosition` actually moves to (and stays at) roughly that value.
 * This test was red before the T003 fix (constitution Principle VII).
 */
function makeSession(overrides: { hostId: string; spotlightMode: boolean; lobbyCursorTick: number | null }) {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [],
    participants: [],
    hostId: overrides.hostId,
    playbackState: { status: 'stopped' as const, tickPosition: 0, bpm: 120, serverTimestamp: Date.now() },
    countInEnabled: false,
    lobbyCursorTick: overrides.lobbyCursorTick,
    spotlightMode: overrides.spotlightMode,
  };
}

test('Spotlight mode force-follow moves a non-host participant view to the host-set lobby cursor tick', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  // Same polling pattern used elsewhere in this suite for a real,
  // fully-warmed-up engine, not a fake/short-circuited readiness flag.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } }).__getApi().isReadyForPlayback), {
      timeout: 15_000,
    })
    .toBe(true);

  const before = await page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition);

  // A large, fresh tick, well clear of the near-zero range the bug
  // resets to (and clear of alphaTab's own non-exact tickPosition
  // round-tripping — an async worker settles a set of e.g. 200 to 201, so
  // this asserts real movement to roughly the target, not exact equality).
  const FRESH_TICK = 4800;
  expect(before).not.toBeGreaterThan(1000);

  // Drive the store as a non-host participant — the scenario under test:
  // "host sets Spotlight mode on and sets a lobby cursor tick, the second
  // tab's view actually follows".
  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'member-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', spotlightMode: true, lobbyCursorTick: FRESH_TICK }));

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition), { timeout: 5_000 })
    .toBeGreaterThan(4000);

  // Stays there — not a one-shot correct-then-reset flicker: the stopped-
  // reset exemption must hold across further store updates, not just the
  // instant the tick was applied.
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition);
  expect(after).toBeGreaterThan(4000);
});

/**
 * T004 (plan-f841-2026-07-24-bdce.md Phase 3): scenario 1 (Spotlight off ⇒
 * no follow) already passed live re-verification per T010, but had no CT
 * coverage — cheap to add now that this harness/pattern exists, and it
 * closes the same live-verified-but-previously-uncovered gap T010 found for
 * scenario 2. Reuses `makeSession` with `spotlightMode: false` and asserts
 * `api.tickPosition` is unchanged after a `lobbyCursorTick` update.
 */
test('Spotlight mode off leaves a non-host participant view unchanged after a lobbyCursorTick update', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } }).__getApi().isReadyForPlayback), {
      timeout: 15_000,
    })
    .toBe(true);

  const before = await page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition);

  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'member-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', spotlightMode: false, lobbyCursorTick: 4800 }));

  await page.waitForTimeout(1_000);
  const after = await page.evaluate(() => (window as unknown as { __getApi: () => { tickPosition: number } }).__getApi().tickPosition);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
});
