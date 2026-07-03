import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';
import { lightTabColors } from './brand-colors';

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
 * Regression test for the theme-persistence bug (feedback-theme-persistence-bed6):
 * `ensurePlaybackEngine()` used to hardcode a freshly-created engine's
 * `state.theme` (and the `theme` passed to `createTabRenderer()`) to
 * `'dark'`, ignoring `document.documentElement.dataset.theme` — the same
 * attribute `theme.ts`'s `applyTheme()` sets from the persisted preference
 * at app startup, before any engine exists. Sets that attribute directly via
 * `page.evaluate` (so it's in place before `PlaybackEngineHarness.svelte`'s
 * `onMount` calls `ensurePlaybackEngine`) and asserts the rendered tab's
 * glyph color matches `lightTabColors.foreground`, not the dark default —
 * mirroring `tab-renderer.ct.spec.ts`'s "setTheme visibly changes rendered
 * resource colors" test's computed-style-on-`svg text` assertion style.
 */
test('a freshly-created engine picks up the document theme instead of hardcoding dark', async ({ mount, page }) => {
  // Playwright CT's `page` fixture has already navigated to the mount
  // index page by the time the test body runs, so `addInitScript` (which
  // only affects *future* navigations) is too late here — set the
  // attribute directly instead, before `mount()` injects/mounts the
  // component into that already-loaded document.
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });

  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  // Resolve lightTabColors.foreground (an alphaTab Color instance, r/g/b/a
  // fields) to the same canonical string format getComputedStyle returns,
  // by round-tripping it through the browser's own CSS color parser rather
  // than hand-formatting an "rgb(...)" literal that might not match
  // however alphaTab actually serializes the fill.
  const { r, g, b, a } = lightTabColors.foreground;
  const expectedFill = await page.evaluate(
    ({ r, g, b, a }) => {
      const probe = document.createElement('div');
      probe.style.color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    },
    { r, g, b, a },
  );

  const actualFill = await component.getByTestId('tab-container').locator('svg text').first().evaluate((el) => getComputedStyle(el).fill);
  expect(actualFill).toBe(expectedFill);
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
