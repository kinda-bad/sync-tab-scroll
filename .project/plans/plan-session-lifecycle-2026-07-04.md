---
status: approved
branch: session-lifecycle-6876
created: 2026-07-04
features: []
---

# Plan: Session Lifecycle Robustness (loading feedback + leave session)

## Goal

Fix a silent tab/lyrics render failure after joining a session and picking
a part, and add a "leave session" control so a participant can clear local
session state and join a different session without a manual workaround.

## Scope

**In scope:**
- An explicit "still loading" UI state that stays visible until the
  engine's tab/lyrics render actually completes, replacing the current
  silent gap where nothing indicates work is still happening.
- A fix for the underlying race that causes the render to sometimes never
  happen without a refresh (see Technical Approach — this is a real bug,
  not just a missing spinner).
- A "leave session" control (Landing/Lobby/Playback, wherever the persistent
  Bar or nav is reachable) that clears local session identity and returns
  to the Landing view's chooser.

**Out of scope:**
- Any server-side "graceful leave" broadcast/notification to other
  participants (e.g. an explicit "X left" toast) — the existing
  disconnect-driven participant removal (already used for tab-close) is
  reused as-is; this plan only adds a client-initiated way to trigger it
  deliberately instead of only via tab close.
- The separate "playback tempo slow" bug and the lobby-cursor rapid-click
  bug — tracked in sibling feedback files, not this plan.

## Technical Approach

### Silent render failure

Traced the current flow (`client/src/playback-engine.ts`,
`client/src/tab-renderer.ts`): `ensurePlaybackEngine()` creates the
alphaTab instance while still in the Lobby (tab container hidden via
`display:none`, per the persistent-engine design in
`tasks-live-rendering-pivot-d9c2.md`). `tab-renderer.ts`'s own
`scoreLoaded` handler unconditionally calls `api.render()` — if that fires
while the container is still hidden (`width=0`), alphaTab silently skips
the paint and never repaints on its own. `renderNowVisible()`
(`playback-engine.ts`) is the intended fix for this: called on the
Lobby→Playback transition, it forces a real render, but only if
`state.scoreLoaded` is already `true` by then — otherwise it's a no-op
based on the comment's own stated assumption that "the engine's own
scoreLoaded render will succeed on its own once it fires, since the
container is visible by then."

That assumption is the likely bug: it holds only if `scoreLoaded` fires
*after* the container becomes visible. If the GP file fetch/parse is slow
enough that `scoreLoaded` fires in a narrow window *around* the
Lobby→Playback transition (e.g. the same tick, or a tick where Svelte's
reactive class update hasn't yet been reflected in a layout the render
call can see), the render can be silently dropped with **no subsequent
trigger to retry it** — `scoreLoaded` only fires once per load, and
`renderNowVisible()` is only called once, at the transition. A refresh
"fixes" it because on reload the container is visible from the very start
of the load, avoiding the race entirely.

Fix: make the render self-healing rather than assumption-based —
`renderNowVisible()` should be re-armed to retry (e.g. via a
`requestAnimationFrame` after the visibility flip, or by checking
`container.clientWidth > 0` before trusting `scoreLoaded`'s own render,
and forcing one more `api.render()` if it wasn't actually visible at that
time) so there's no window where both the scoreLoaded-triggered render and
the transition-triggered render can miss each other. Exact mechanism is an
implementation-time decision (Open Questions).

### Loading state UI

`ui.md`'s States section already establishes a per-participant Lobby
loading/readiness state (`readiness-update` messages, `ReadinessBadge`),
but that only covers the Lobby. Once Start is clicked and the view
switches to Playback, there is currently no visible indicator that the
tab/lyrics render is still in flight — the user sees a blank area. Add an
explicit loading indicator in the Playback view (instrument and lyrics
parts both), shown from view-transition until `scoreLoaded`/render-visible
actually completes, consistent with the "show a loading/readiness state...
rather than blocking" principle already established for the Lobby.

### Leave session

No server message type exists for a self-initiated leave (`messages.ts`
has `host-remove-participant` — host-initiated only). Existing behavior:
closing the tab/WS disconnects and the server presumably removes/marks the
participant already (same path a network drop takes) — reuse this rather
than inventing a new protocol message. Client-side "leave" should:
1. Close the current WS connection (`ws-client.ts`).
2. Clear `session-persistence.ts`'s stored `{code, displayName,
   participantId}` (`localStorage.removeItem(STORAGE_KEY)`), so a refresh
   doesn't silently rejoin the session just left.
3. Reset `clientStore`'s session/selfParticipantId/view state back to its
   initial values.
4. Navigate to the Landing view's chooser.

Confirm during implementation whether the server's disconnect handler
already fully cleans up (readiness/host-succession) on an abrupt close, or
whether a clean close needs the same handling explicitly invoked — check
`server/src/` for the WS close handler before assuming parity.

## Phase Breakdown

### Phase 1: Leave session control
- [artifacts: ui] Add a "Leave session" control (persistent Bar or
  settings modal — pick whichever matches existing placement conventions
  for session-scoped, always-reachable controls, e.g. the theme toggle's
  placement) that performs the four steps above. Revise `ui.md`'s Lobby
  View / Playback View sections to document the control's location and
  behavior. [feedback: feedback-session-lifecycle-6876.md]
- Write a test first (Principle VII) covering: clicking it clears
  `localStorage`, resets the store, and returns to the Landing chooser.

### Phase 2: Loading-state fix for the silent render failure
- Reproduce the race with a deliberately slow-loading fixture (throttled
  fetch or an artificial delay before `api.load()`) so the fix has a
  reliable red test before touching production code (Principle VII).
- Fix `renderNowVisible()`/`scoreLoaded` interaction per the Technical
  Approach above so the render can never be silently dropped.
- Add a loading indicator to the Playback view (instrument + lyrics parts)
  shown until render/init actually completes. Revise `ui.md`'s States
  section to document it. [feedback: feedback-session-lifecycle-6876.md]

### Phase 3: Regression pass
- Run `pnpm --filter client test`, `test:ct`, and `test:e2e`; confirm no
  regressions in the persistent-engine/Lobby→Playback transition tests
  already covering this path (`tasks-live-rendering-pivot-d9c2.md`).

## Complexity Tracking

| Deviation | Justification |
|---|---|
| No new server message type for "leave" | Reuses the existing disconnect-driven cleanup path rather than adding a parallel one for a case (self-leave) that's behaviorally identical to a dropped connection from the server's point of view. |

## Open Questions

- Exact mechanism for making the render self-healing (rAF retry vs.
  visibility-check-before-render vs. a small polling guard) — left to
  implementation-time judgment; whichever is chosen must not reintroduce
  a race window.
- Whether the server's WS-close handler already fully parallels a clean
  "leave" (readiness reset, host-succession if the leaver was host) or
  needs an explicit invocation on a deliberate leave vs. an abrupt drop.
- Where exactly the "Leave session" control should live in the UI (Bar vs.
  Settings modal) — no strong existing convention pins this down; pick
  based on Phase 1 implementation review against `brand.md`.

## Production Annotation Summary

None anticipated — both items are correctness/UX fixes with no shortcuts
expected.
