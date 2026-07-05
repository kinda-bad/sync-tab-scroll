import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';
import { lightTabColors } from './brand-colors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);
// 87 BPM variant (generated from synthetic-song.gp via alphaTab's
// Gp7Exporter) for real-playback tempo assertions: the base fixture is
// 120 BPM, the same value as `PlaybackState.bpm`'s hardcoded default, so
// a tempo read off it can't distinguish "real tempo" from "nobody ever
// read the tempo" — the exact coincidence that masked the shipped
// hardcoded-120 bug.
const GP_87_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song-87bpm.gp');
const gp87Buffer = fs.readFileSync(GP_87_PATH);
// Two real, distinct-content tracks (track 0: frets 3/5, track 1: frets
// 8/10 — same notes shifted, not a byte-identical clone) for the
// part-switch regression test below: a single-track fixture can't tell
// "re-rendered the new track" apart from "rendered nothing new at all".
const GP_TWO_TRACK_PATH = path.resolve(__dirname, '../test-fixtures/two-track-song.gp');
const gpTwoTrackBuffer = fs.readFileSync(GP_TWO_TRACK_PATH);

let pageErrors: string[];

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/two-track.gp', (route) => route.fulfill({ body: gpTwoTrackBuffer, contentType: 'application/octet-stream' }));
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});

/**
 * SCOPE NOTE (rewritten 2026-07-04): this file previously documented that
 * `api.isReadyForPlayback` "never becomes true under browser automation"
 * (blamed on Chrome's autoplay policy). That diagnosis was wrong: the
 * synth worker was dying on a silent 404 of `/assets/alphaTab.worker.mjs`
 * because (a) ct-core only honors `ctViteConfig` from `projects[0]` and
 * (b) alphaTab's ESM worker files were never emitted into the CT bundle —
 * both fixed in playwright.config.ts. Real synth playback now runs under
 * headless CT: `isReadyForPlayback` resolves in ~2s and `play()` produces
 * genuine ticking `playerPositionChanged` events (see the real-playback
 * test below). The clientStore-subscription logic gated on
 * `isReadyForPlayback` (drift correction, Spotlight force-follow,
 * host-only paused-only seek) is therefore now testable here — currently
 * still covered at the pure-function level by `playback-sync.test.ts`;
 * porting it to real-playback CT coverage is an open follow-up.
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
 * alphaTab instance, unconditionally (no host/session gating).
 *
 * DRIVING NOTE: this test injects a known `currentTime`/`endTime` pair via
 * `api.playerPositionChanged.trigger(...)` (the same public method
 * alphaTab's worker-message handler uses internally) so the expected
 * ratio is exact and deterministic. It is *not* because real emission is
 * impossible — the real-playback test below drives the genuine synth
 * loop. (A previous version of this note claimed real position broadcasts
 * "never happen under browser automation"; that was the dead-synth-worker
 * config bug described in the SCOPE NOTE above, not a real limitation.)
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
    const api = (window as unknown as {
      __getApi: () => { playerPositionChanged: { trigger: (e: unknown) => void } };
    }).__getApi();
    api.playerPositionChanged.trigger({ currentTime: 5, endTime: 10, currentTick: 0, endTick: 0, isSeek: false, originalTempo: 120, modifiedTempo: 120 });
  });

  await expect.poll(() => readPlaybackProgress(page), { timeout: 5_000 }).toBeGreaterThan(0);
  expect(await readPlaybackProgress(page)).toBe(0.5);
});

/**
 * Real synth playback, end to end: waits for `isReadyForPlayback`, calls
 * `api.play()`, and asserts on events emitted by alphaTab's actual
 * playback loop — no `trigger()` injection anywhere. Uses the 87 BPM
 * fixture (see top of file) so the tempo assertion cannot pass by
 * coinciding with a hardcoded 120 default. This is the regression guard
 * for the shipped never-read-the-real-tempo bug class: any future path
 * that fakes or defaults tempo instead of reading it from the score
 * fails the `originalTempo === 87` assertion.
 */
test('real playback emits real tempo and drives playbackProgress', async ({ mount, page }) => {
  await page.route('**/fixture-87.gp', (route) => route.fulfill({ body: gp87Buffer, contentType: 'application/octet-stream' }));

  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture-87.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate(() => {
    const api = (window as unknown as {
      __getApi: () => { playerPositionChanged: { on: (fn: (e: unknown) => void) => void } };
    }).__getApi();
    const events: unknown[] = [];
    (window as unknown as { __posEvents: unknown[] }).__posEvents = events;
    api.playerPositionChanged.on((e) => {
      const ev = e as { currentTime: number; endTime: number; originalTempo: number };
      events.push({ currentTime: ev.currentTime, endTime: ev.endTime, originalTempo: ev.originalTempo });
    });
  });

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } }).__getApi().isReadyForPlayback), {
      timeout: 15_000,
    })
    .toBe(true);

  await page.evaluate(() => (window as unknown as { __getApi: () => { play: () => boolean } }).__getApi().play());

  await expect.poll(() => readPlaybackProgress(page), { timeout: 10_000 }).toBeGreaterThan(0);

  // Skip the stale all-zero events alphaTab re-fires before the loop ticks.
  const realEvents = await page.evaluate(
    () => ((window as unknown as { __posEvents: { currentTime: number; endTime: number; originalTempo: number }[] }).__posEvents ?? []).filter((e) => e.currentTime > 0),
  );
  expect(realEvents.length).toBeGreaterThan(0);
  expect(realEvents[0].originalTempo).toBe(87);
  expect(realEvents[0].endTime).toBeGreaterThan(0);

  await page.evaluate(() => (window as unknown as { __getApi: () => { stop: () => void } }).__getApi().stop());
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

/**
 * Regression test: switching parts previously changed which row showed the
 * pink "selected" state in the Song & part modal, but never re-rendered the
 * tab, because `ensurePlaybackEngine` short-circuited unconditionally
 * (`if (state) return;`) on any call after the first — including a later
 * call with a genuinely different trackIndex. Uses a real two-track
 * fixture with distinct content per track (not a clone), since a
 * single-track fixture can't distinguish "re-rendered the new track" from
 * "rendered nothing new at all."
 */
test('switching parts (a later ensurePlaybackEngine call with a different trackIndex) re-renders the new track', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/two-track.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  const svgBefore = await component.getByTestId('tab-container').locator('svg').first().evaluate((el) => el.outerHTML);
  expect(svgBefore).toContain('>3<');
  expect(svgBefore).not.toContain('>8<');

  await page.evaluate(() => (window as unknown as { __switchPart: (t: number) => void }).__switchPart(1));

  await expect
    .poll(async () => component.getByTestId('tab-container').locator('svg').first().evaluate((el) => el.outerHTML))
    .toContain('>8<');
  const svgAfter = await component.getByTestId('tab-container').locator('svg').first().evaluate((el) => el.outerHTML);
  expect(svgAfter).toContain('>10<');
  expect(svgAfter).not.toContain('>3<');
});

/**
 * Regression test for the silent-render-failure bug (feedback-session-lifecycle-6876,
 * tasks-session-lifecycle-836f T007/T008): reproduces the narrow race where
 * `scoreLoaded` fires (and `tab-renderer.ts`'s own unconditional `api.render()`
 * silently no-ops) while the tab container is still `display: none`. Mirrors
 * App.svelte's real usage exactly: the container becomes visible, then
 * `renderNowVisible()` is called exactly once afterward (App.svelte's own
 * `tick().then(rAF(...))` one-shot, triggered by that same visibility
 * change) — never called while still hidden, since real usage couldn't do
 * that (visibility and the call are driven by the same reactive value).
 * Isolates whether alphaTab's own native `ResizeObserver`-driven
 * `triggerResize()` (confirmed present in
 * `node_modules/@coderline/alphatab/dist/alphaTab.js`'s `AlphaTabApi`
 * constructor: `this.container.resize.on(throttle(() => { if
 * (this.container.width !== this._renderer.width) this.triggerResize() }))`)
 * already self-heals this on its own in a real browser engine (Playwright
 * CT) — empirically it does not — or whether it genuinely needs T008's
 * explicit fix.
 */
test('recovers from scoreLoaded firing while the container is still hidden', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0, startHidden: true } });

  // Confirm the premise: scoreLoaded fires while hidden, and its own render is a no-op (no SVG yet).
  await page.waitForFunction(
    () => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true,
    { timeout: 20_000 },
  );
  await expect(component.getByTestId('tab-container').locator('svg')).toHaveCount(0);

  // Now make the container visible, then call renderNowVisible() exactly once — matching App.svelte's real, single call site.
  await page.evaluate(() => {
    document.querySelector('[data-testid="tab-container"]')!.setAttribute('style', '');
  });
  await page.evaluate(() => (window as unknown as { __renderNowVisible: () => void }).__renderNowVisible());

  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });
});

function readEngineReady(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    let value: unknown;
    const unsub = (window as unknown as { __clientStore: { subscribe: (fn: (s: unknown) => void) => () => void } }).__clientStore.subscribe(
      (s) => (value = (s as { engineReady: boolean }).engineReady),
    );
    unsub();
    return value as boolean;
  });
}

/**
 * Regression test for the loading-indicator signal (T009,
 * tasks-session-lifecycle-836f): `clientStore.engineReady` must stay false
 * until the tab has actually rendered, then flip true — this is exactly
 * what `Playback.svelte`'s loading banner keys off. Not a Svelte-component
 * test of `Playback.svelte` itself (its `{#if !$clientStore.engineReady}`
 * is a one-line conditional with no logic of its own worth a dedicated
 * harness for) — this covers the actual production logic
 * (`markEngineReadyIfComplete`) that drives it, end-to-end against a real
 * alphaTab render.
 */
test('clientStore.engineReady flips true only once the tab has actually rendered', async ({ mount, page }) => {
  // Deliberately hidden at mount: proves engineReady only flips once a real,
  // visible render actually happens (T008's renderedWhileVisible gate), not
  // merely once scoreLoaded fires — the fixture is small enough that
  // scoreLoaded (and, if this gate didn't exist, engineReady) could
  // otherwise flip before this test even gets to check.
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0, startHidden: true } });

  await page.waitForFunction(
    () => (window as unknown as { __getEngineState: () => { scoreLoaded: boolean } | undefined }).__getEngineState()?.scoreLoaded === true,
    { timeout: 20_000 },
  );
  expect(await readEngineReady(page)).toBe(false);

  await page.evaluate(() => {
    document.querySelector('[data-testid="tab-container"]')!.setAttribute('style', '');
  });
  await page.evaluate(() => (window as unknown as { __renderNowVisible: () => void }).__renderNowVisible());

  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => readEngineReady(page), { timeout: 5_000 }).toBe(true);
});

/**
 * Regression test for the rapid-click cursor-thrash bug
 * (feedback-lobby-cursor-race-4262, tasks-lobby-cursor-race-c9f8 T002/T003):
 * a burst of rapid host seeks must collapse into a single
 * `playback-control` `seek` broadcast (the *last* tick), not one broadcast
 * per click.
 */
test('debounces rapid host seeks into a single broadcast carrying the last tick', async ({ mount, page }) => {
  const component = await mount(PlaybackEngineHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.getByTestId('tab-container').locator('svg').first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate((session) => {
    (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore.update((s) => ({
      ...(s as object),
      selfParticipantId: 'host-1',
      session,
    }));
  }, makeSession({ hostId: 'host-1', status: 'paused' }));

  // A real host can't click-to-seek before alphaTab is actually ready for
  // playback (the seek-broadcast listener itself is gated on
  // isReadyForPlayback, since alphaTab fires its own internal isSeek:true
  // position-reset while still preparing MIDI, well before that point) —
  // wait for the same real condition before firing synthetic seeks, rather
  // than racing it.
  await page.waitForFunction(
    () => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } }).__getApi().isReadyForPlayback === true,
    { timeout: 20_000 },
  );

  await page.evaluate(() => {
    const api = (window as unknown as {
      __getApi: () => { playerPositionChanged: { trigger: (e: unknown) => void } };
    }).__getApi();
    const trigger = (currentTick: number) =>
      api.playerPositionChanged.trigger({ currentTime: 0, endTime: 10, currentTick, endTick: 0, isSeek: true, originalTempo: 120, modifiedTempo: 120 });
    trigger(100);
    trigger(200);
    trigger(300);
  });

  await page.waitForTimeout(300);

  const seeks = await page.evaluate(() =>
    (window as unknown as { __sentMessages: { type: string; action?: string; tickPosition?: number }[] }).__sentMessages.filter(
      (m) => m.type === 'playback-control' && m.action === 'seek',
    ),
  );
  expect(seeks).toHaveLength(1);
  expect(seeks[0].tickPosition).toBe(300);
});
