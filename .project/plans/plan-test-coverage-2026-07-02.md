---
status: approved
branch: test-coverage
created: 2026-07-02
features: [test-coverage-backfill]
---

# Plan: Test Coverage Backfill

## Goal

Bring the codebase into compliance with constitution Principle VII
(Test-First Development) by backfilling tests for existing untested logic
across `server` and `client`, and standing up a test runner for `client`
(only `server` has one today).

## Scope

**In scope:**
- `client`: add `vitest` as a dev dependency and a `test` script, matching
  `server`'s existing setup (added this session for
  `plan-lobby-cursor-modes-2026-07-03.md`'s T007).
- Unit tests for every pure-logic module in `client` that doesn't require a
  real DOM, real WebSocket, or a real `@coderline/alphatab` instance to
  exercise meaningfully: `lrc-parser.ts`, `lyrics-beat-walk.ts`,
  `toast-store.ts`, `session-persistence.ts`, `readiness.ts`,
  `playback-sync.ts`.
- Unit tests for every server module and handler not yet covered:
  `session-store.ts`, `connections.ts`, `host-succession.ts`,
  `catalog-loader.ts`, `catalog-static.ts`, `config.ts`, and the handlers
  `session-create`, `session-join`, `part-select`, `readiness-update`,
  `host-remove-participant`, `playback-control`, `lobby-cursor-set`,
  `song-select` (mirroring `spotlight-mode-set.test.ts`'s established
  pattern: fake sockets/`HandlerContext`, real `SessionStore`/
  `ConnectionRegistry`).

**Out of scope, with rationale (see Open Questions):**
- `packages/shared`: both files (`index.ts`, `messages.ts`) are pure type
  declarations with no runtime logic — nothing to unit test beyond what
  `tsc` (the existing build) already checks. No test runner is proposed
  for this package.
- `client`'s DOM/alphaTab/WebSocket-coupled modules: `tab-renderer.ts`,
  `headless-player.ts`, `lyrics-overlay.ts`, `playback-engine.ts`,
  `ws-client.ts`, `store.ts`, `main.ts`. These either need a real browser
  environment (canvas/audio rendering) or are thin
  wiring/bootstrap/singleton-state modules (constitution Principle III)
  whose value is in integration behavior, not unit-testable logic. Flagged
  as an open question rather than silently dropped — see below.

## Technical Approach

**Client test runner**: `vitest` in `node` environment (no `jsdom`) —
every in-scope client module is either pure computation
(`lrc-parser`/`lyrics-beat-walk`) or takes a fake/duck-typed dependency
object (`readiness.ts`'s `AlphaTabApi`, `playback-sync.ts`'s `AlphaTabApi`
and `Session`), the same fake-object pattern
`spotlight-mode-set.test.ts` already established server-side
(constitution Principle V: check existing idioms before adding a new one —
`jsdom` would be a heavier dependency than any in-scope test actually
needs). `session-persistence.ts`'s `localStorage` calls are exercised via
a minimal in-memory stub assigned to `globalThis.localStorage`, not a real
DOM.

**Server tests**: same pattern as `spotlight-mode-set.test.ts` throughout —
a real `SessionStore` and `ConnectionRegistry`, fake `WebSocket` objects
(`{ send: () => {} } as unknown as WebSocket`), and constructed
`HandlerContext` objects. `catalog-loader.ts`/`catalog-static.ts` tests use
real temp-directory fixtures (`fs.mkdtempSync`) rather than mocking `fs` —
they're thin wrappers around real filesystem calls, so a real (if
scratch) filesystem is more representative than a mock.

**No new production code paths** — this plan is purely additive test
coverage over existing, already-shipped behavior. No handler, module, or
UI changes are anticipated; if writing a test reveals an actual bug, that
becomes a separate `/ardd-feedback` item, not silently fixed inline in
this plan.

## Phase Breakdown

### Phase 1: Client test infrastructure
- Add `vitest` (pinned to the same `^2.1.9` used in `server`, to avoid
  version drift between the two packages) as a `client` dev dependency.
- Add a `"test": "vitest run"` script to `client/package.json`.

### Phase 2: Client pure-logic test backfill [parallel across files]
- `lrc-parser.test.ts`: valid timestamped lines, blank "gap" lines (empty
  text, real timestamp), malformed/non-matching lines ignored, multi-line
  input.
- `lyrics-beat-walk.test.ts`: `walkLyricBeats` against a fake
  `at.model.Score`-shaped object (tracks/staves/bars/voices/beats) —
  single syllable per beat, consecutive-same-text beats collapsed into one
  syllable (the melisma case), `lyricsLineIndex` selecting the right lyric
  channel. `groupIntoLines` regrouping a flat syllable stream by
  `lyricLineBreaks` counts.
- `toast-store.test.ts`: `push()` appends a toast with an incrementing id;
  auto-removal after the 5s timeout (`vi.useFakeTimers()`).
- `session-persistence.test.ts`: `startSessionPersistence()` writes
  `{code, displayName, participantId}` to `localStorage` once
  `session`/`selfParticipantId` are both present; no-op before then.
  `loadStoredSession()` round-trips what was stored, and returns
  `undefined` when nothing's stored.
- `readiness.test.ts`: `waitUntilReady` resolves only once both
  `scoreLoaded` and `soundFontLoaded` have fired, regardless of firing
  order, against a fake `AlphaTabApi` with a minimal event-emitter shape
  (`{ on: (cb) => ..., }`, triggered manually in the test).
- `playback-sync.test.ts`: `correctDrift` — starts playback when
  `status: 'running'` and not yet playing; pauses when not running and
  still playing; snaps `tickPosition` and returns the applied tick when
  drift exceeds `DRIFT_THRESHOLD_TICKS`; returns `null` and leaves
  `tickPosition` alone within the threshold. `applyPlaybackSettings` sets
  `metronomeVolume`/`countInVolume` from `Session.metronomeEnabled`/
  `countInEnabled`.

### Phase 3: Server module test backfill [parallel across files]
- `session-store.test.ts`: `create()` assigns a unique 4-char code and all
  documented defaults (including `spotlightMode: false`); `markActive`/
  `markPossiblyEmpty` grace-timer behavior (a session with no connected
  participants schedules destruction, `markActive` cancels it); host-
  reassignment timer scheduling/cancellation (`scheduleHostReassignment`
  is a no-op if already pending, `cancelHostReassignment` clears it).
- `connections.test.ts`: `attach`/`get`/`detach` round-trip connection
  info; `send` delivers a single message to one socket; `broadcast`
  delivers to every socket in a session code, building each message via
  the per-participant callback.
- `host-succession.test.ts`: `promoteNextHost` — no-op if the session is
  gone, no-op if the host is already connected, no-op if no other
  connected participant exists, and promotes the longest-tenured
  connected non-host participant otherwise (checking `joinedAt`
  ordering and the role/hostId swap).
- `catalog-loader.test.ts`: `loadCatalog` against real temp-directory
  fixtures — a well-formed song directory produces a matching
  `CatalogSong`; a directory missing `meta.json` or a `.gp` file is
  skipped, not thrown; a present vs. absent `lyrics.lrc` toggles
  `lyricsLrc` between a path and `null`; a nonexistent `catalogRoot`
  returns `[]`.
- `catalog-static.test.ts`: serves a file under `catalogRoot` with the
  right content-type per extension; 404s a nonexistent file; 404s (not
  throws) a path-traversal attempt (`../`); returns `false` for a URL that
  doesn't start with `/catalog/` at all.
- `config.test.ts`: `loadConfig` reads `PORT`/`CATALOG_ROOT`/
  `HOST_REASSIGN_GRACE_MS` from `process.env` when set, and falls back to
  the documented defaults (8080, `./catalog`, 120000) when unset.
- One test file per remaining handler (`session-create`, `session-join`,
  `part-select`, `readiness-update`, `host-remove-participant`,
  `playback-control`, `lobby-cursor-set`, `song-select`), each covering:
  the handler's host-only check where one exists (same pattern as
  `spotlight-mode-set.test.ts`), its core state mutation, and its
  broadcast. `playback-control` covers all four actions
  (`start`/`pause`/`resume`/`stop`/`seek`) including the
  `lobbyCursorTick`/`spotlightMode` reset on `start`.

## Complexity Tracking

None — every test in this plan follows the fake-object/real-store pattern
`spotlight-mode-set.test.ts` already established; no new test-double
library, no `jsdom`, no snapshot testing.

## Open Questions

- **DOM/alphaTab/WebSocket-coupled client modules are out of scope for
  this pass** (`tab-renderer.ts`, `headless-player.ts`, `lyrics-overlay.ts`,
  `playback-engine.ts`, `ws-client.ts`, `store.ts`, `main.ts`). Testing
  these meaningfully would need either a real browser environment
  (`jsdom` can't render alphaTab's canvas/SVG output or play audio) or
  heavy mocking that risks testing the mock instead of the behavior. If
  full coverage is wanted here, it likely needs its own plan scoped around
  what testing strategy to use (e.g. Playwright component tests, or
  extracting more pure logic out of `playback-engine.ts` first) rather
  than being folded into this vitest-based backfill.

## Production Annotation Summary

None anticipated — this plan adds no new production code paths.
