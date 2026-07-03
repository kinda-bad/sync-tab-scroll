---
status: approved
branch: playwright-coverage
created: 2026-07-02
features: [playwright-client-coverage]
---

# Plan: Playwright Client Coverage

## Goal

Cover `client`'s DOM/alphaTab/WebSocket-coupled modules — `tab-renderer`,
`headless-player`, `lyrics-overlay`, `playback-engine`, `ws-client`,
`store`, and `main` — with Playwright, completing the Principle VII
backfill that `plan-test-coverage-2026-07-02.md` explicitly deferred.

## Scope

**In scope:**
- Playwright installed and configured for `client`, with two distinct
  test projects: end-to-end (`e2e`) and component (`ct`) — per the user's
  explicit direction, both kinds of tests, not one or the other.
- **E2E tests**: real server + real client (built or previewed) + the
  existing `catalog/radiohead-creep` fixture, driven with real browser
  contexts through actual user flows — create/join a session, pick a
  song/part, reach readiness, start/stop playback — including
  multi-participant scenarios (host + member in separate browser
  contexts). This is the automated equivalent of the manual two-tab
  verification this project has been doing by hand all session
  (including the still-blocked `T010` in
  `tasks-lobby-cursor-modes-0bea.md`).
- **Component tests** (`@playwright/experimental-ct-svelte`): mount
  `tab-renderer`/`headless-player`/`lyrics-overlay`/`playback-engine`/
  `store` in isolation against a *real* alphaTab instance and a *real*
  DOM/canvas (the entire reason these modules needed Playwright over
  vitest in the first place), with `ws-client` replaced by a test double
  implementing the same send/subscribe interface — per the user's
  direction to mock external APIs at the component level. `ws-client`
  itself gets its own component test against a real (but local, in-test)
  WebSocket server, not a mock, since it *is* the network boundary being
  tested.
- Both test types explicitly exclude audio assertions (per the user's
  direction) — no Web Audio API node inspection, no asserting sound was
  produced. Assertions are scoped to DOM/canvas presence, rendered visual
  state, `session.playbackState.status` transitions, and WebSocket
  message flow.

**Out of scope:**
- Any assertion on actual audio output (SoundFont playback, metronome/
  count-in sound) — flagged above, matches the known Chrome
  autoplay-policy friction hit earlier this session doing manual
  browser verification.
- `main.ts` gets no dedicated component test — it's pure bootstrap wiring
  (constitution Principle III) with no logic of its own to isolate;
  it's exercised incidentally by every E2E test's page load.
- Visual regression/screenshot-diffing — not requested, and a separate
  concern (design/branding fidelity) from behavioral correctness.

## Technical Approach

**Two Playwright projects, one config** (`client/playwright.config.ts`):
- `e2e` project: Playwright's `webServer` array config launches the real
  `server` package (pointed at `CATALOG_ROOT=../catalog`) and the real
  `client` (via `vite preview` against a production build, matching what
  a user actually gets — not the dev server). Tests live in
  `client/e2e/*.spec.ts`.
- `ct` project: `@playwright/experimental-ct-svelte`'s component-testing
  mode, which mounts real `.svelte`-wrapped harness components in a real
  browser (real canvas, real Web Audio API surface — audio *creation* is
  fine, just not asserted on). Tests live colocated with source, as
  `client/src/**/*.ct.spec.ts`, mirroring the vitest `*.test.ts`
  colocation convention `plan-test-coverage-2026-07-02.md` already
  established.

**Why a second test runner alongside vitest, not one runner for
everything** (constitution Complexity Tracking, below): vitest/jsdom
structurally cannot render alphaTab's canvas/SVG output or exercise the
Web Audio API — this was `plan-test-coverage-2026-07-02.md`'s own
stated reason for excluding these modules. Playwright is the
established, idiomatic tool for real-browser testing (constitution
Principle V) rather than hand-rolling a browser harness.

**`ws-client` test double for component tests**: a plain object
implementing `WsClient`'s public shape (`send`, and whatever
subscription surface `playback-engine.ts`/`App.svelte` consume) that
records sent messages and lets the test script synthetic
`clientStore`/session updates — this is what "mock any external API"
means for `playback-engine.ts`'s and `tab-renderer.ts`'s component
tests: the network boundary is faked, alphaTab is not.

**`ws-client.ts`'s own component test** uses a real, minimal local
WebSocket server started in a `beforeEach` (plain `ws` package, a few
lines — not the full `server` package), since `ws-client.ts` *is* the
thing being tested and faking the far end of its own subject would prove
nothing.

**E2E fixture**: `catalog/radiohead-creep` already exists (built during
`song-catalog-selection`) — no new fixture needed.

## Phase Breakdown

### Phase 1: Playwright infrastructure
- Install `@playwright/test` and `@playwright/experimental-ct-svelte` as
  `client` dev dependencies; run `playwright install chromium` (one
  browser engine is enough for this project's scale — no cross-browser
  matrix requested or currently justified).
- Write `client/playwright.config.ts` defining the `e2e` and `ct`
  projects described above.
- Add `client/package.json` scripts: `"test:e2e": "playwright test
  --project=e2e"`, `"test:ct": "playwright test --project=ct"`. Leave
  the existing `"test"` (vitest) script untouched — this is deliberately
  a second, distinct test command, not a replacement.

### Phase 2: `ws-client` component test
- `client/src/ws-client.ct.spec.ts`: spin up a minimal local `ws`
  server in `beforeEach`/tear down in `afterEach`; mount/exercise
  `ws-client.ts` against it — confirm `send()` transmits the right JSON
  shape, and incoming server messages are dispatched to the client's
  subscribers. This is the one component test using a real (if
  throwaway) WebSocket server rather than a fake, since it's the
  boundary under test.

### Phase 3: alphaTab-coupled component tests [parallel across files]
- `client/src/tab-renderer.ct.spec.ts`: mount a harness that calls
  `createTabRenderer` against the real `catalog/radiohead-creep` `.gp`
  file, confirm real SVG output appears in the container, and that
  `setTheme` visibly changes rendered resource colors (dark vs. light).
- `client/src/headless-player.ct.spec.ts`: confirm a headless instance
  reaches `isReadyForPlayback` without any visible container.
- `client/src/lyrics-overlay.ct.spec.ts`: mount with fixture lyric
  lines, confirm overlay DOM text updates as a driven tick position
  advances past each line's timestamp.
- `client/src/playback-engine.ct.spec.ts`: mount the engine against a
  real container + the `ws-client` test double from the Technical
  Approach, feed synthetic `clientStore` updates, and confirm (against
  the real `api` instance, not a fake) that drift correction applies,
  Spotlight-mode force-follow applies `lobbyCursorTick` to
  `api.tickPosition` only when `spotlightMode` is true (the real-DOM
  counterpart to `playback-sync.test.ts`'s pure-function coverage), and
  host-only paused-only seek enables/disables `enableUserInteraction`
  correctly.
- `client/src/store.ct.spec.ts`: confirm a mounted component reacting to
  `clientStore` updates re-renders correctly on `set`/`update`.

### Phase 4: End-to-end flows
- `client/e2e/single-participant.spec.ts`: Landing → create session →
  select `radiohead-creep` → select an instrument part → readiness
  reaches `ready` → host starts playback → Playback view shows a
  rendered tab canvas. A second run through the lyrics part confirms the
  full-lyrics view instead.
- `client/e2e/multi-participant.spec.ts`: two browser contexts (host +
  member) — song/part selection sync between them; lobby cursor
  set/clear with Spotlight mode **off** (member's view doesn't move) and
  **on** (member's view snaps to match) — this is the automated version
  of the still-blocked `T010`; Start/Stop round-trip confirms Spotlight
  mode and the lobby cursor both auto-reset.
- `client/e2e/host-controls.spec.ts`: pause/resume/stop transitions
  reflected in `session.playbackState.status` across participants; host
  removing a participant.

### Phase 5: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and
  `pnpm --filter client test:e2e` together (plus `pnpm --filter server
  test`) and confirm no port collisions between the two Playwright
  webServers and any already-running dev server, no flaky failures
  across 3 consecutive runs, and no audio-autoplay-policy errors leaking
  into CT/E2E test output. Document the full command set in this task's
  completion note for future reference.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| A second test runner (Playwright) alongside vitest | vitest/jsdom cannot render alphaTab's canvas/SVG output or exercise the Web Audio API — `plan-test-coverage-2026-07-02.md` already established this as the reason these modules were excluded from the vitest pass. Playwright is the standard tool for this exact gap (constitution Principle V), not a custom mechanism. |

## Open Questions

None outstanding — test-type scope (both E2E and CT) and audio-assertion
scope (out) were both resolved with the user before drafting.

## Production Annotation Summary

None anticipated — this plan adds no new production code paths, only
test infrastructure and test files.
