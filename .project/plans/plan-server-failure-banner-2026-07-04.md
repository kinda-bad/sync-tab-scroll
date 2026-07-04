---
status: draft
branch: server-failure-banner
created: 2026-07-04
features: []
---

# Plan: Server-unreachable connection banner

## Goal

When the client can't reach the server (down at load, or the connection
drops mid-session), show a persistent banner explaining this and keep
retrying automatically — clearing the banner the moment contact is
restored, without the user needing to reload.

## Scope

**In scope**:
- Tracking real WS connection state (`connecting` / `connected` /
  `disconnected`) — currently untracked anywhere; `ws-client.ts` has no
  `error`/`close` listeners at all.
- Automatic reconnect with retry, reusing the *existing*
  reconnect-by-participantId mechanism (`session-join.ts`'s `existing`
  branch, already used for page-refresh reconnects) rather than building a
  second one — a dropped-then-restored connection re-sends `session-join`
  with the stored `code`/`participantId` exactly like a refresh does.
- A persistent, non-dismissing banner, visible in every view (including
  Landing — the bug reproduces there specifically: `Landing.svelte`'s
  `onMount` auto-connects from a stored session on load, and if the server
  is down at that moment, nothing ever tells the user why nothing is
  happening).

**Out of scope**:
- The render-readiness loading banner being added concurrently on another
  branch (`worktree-agent-a3742a2bf2ac7cfe1`'s `ClientState.engineReady`
  banner in `Playback.svelte`) — different concern (alphaTab render
  finishing vs. WS connectivity), different trigger, not yet merged to
  `main`. This plan's banner should stay visually consistent with it once
  it lands, but does not depend on or modify it.
- Exponential backoff/jitter, or a "give up after N attempts" state — see
  Open Questions.
- The metronome-per-participant reconsideration in
  `feedback-settings-modal-followup-d914.md` (still open, unrelated,
  blocked on a separate human confirmation) — deliberately not folded into
  this plan.

## Technical Approach

**Root cause confirmed by reading, not assumed**: `client/src/ws-client.ts`
registers `open`/`message` listeners only — no `error`, no `close`. If the
server is unreachable, the browser fires both silently; nothing observes
them. `send()` already queues outbound messages in a `pending` array while
`readyState !== OPEN`, but nothing ever retries opening a new socket.
`Landing.svelte`'s `onMount` (`if (stored) connect(stored.displayName,
stored.code, stored.participantId)`) is the exact path that goes silent —
`view` never leaves `'landing'` because no `session-state` ever arrives,
and there's nothing on screen indicating why.

**Constitution Principle V check (library idioms before custom
mechanism)**: confirmed no existing dependency provides WS auto-reconnect
— this project uses the native browser `WebSocket` (not `socket.io` or a
reconnecting-websocket wrapper), a deliberate existing choice
(`infrastructure.md`). A hand-built retry loop is the correct call here,
not a shortcut around a library feature that already exists.

**Connection state** (Principle VI, one named type): add
`export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';`
to `ws-client.ts` (the module that owns connection lifecycle), and a
`connectionStatus: ConnectionStatus` field to `ClientState`
(`store.ts`), defaulting to `'connecting'`.

**Reconnect mechanism**, inside `createWsClient`/`connect()` (Principle
III — this logic belongs with the one connection entry point, not
duplicated per-caller):
- On `error`/`close`: set `connectionStatus: 'disconnected'`, start a
  fixed-interval retry (proposed 2s — see Open Questions) that attempts a
  fresh `new WebSocket(url)` until one successfully opens.
- On the *first* successful open (server was down at load, message never
  sent): the original `session-join`/`session-create` message is still
  sitting in `pending` (never removed, since it was never sent) — it
  flushes automatically via the existing `open` handler, no new logic
  needed for this case.
- On a *later* successful reopen after a session was already established
  (server dropped mid-session): `pending` is empty (that message already
  sent and consumed by the server once already) — explicitly re-send
  `session-join` with the current `clientStore`'s `session.code`/
  `selfParticipantId` (same values `session-persistence.ts` already
  persists for the refresh-reconnect case) so the server's existing
  `existing` participant-reclaim branch reattaches this connection to the
  same participant, instead of silently staying joined-to-nothing.
- Set `connectionStatus: 'connected'` once the reopened socket's `open`
  fires (both cases).

**Banner component**: new `ConnectionBanner.svelte`, always mounted in
`App.svelte` (same pattern as `Toasts.svelte` — rendered unconditionally,
not gated on `view`), visible whenever
`$clientStore.connectionStatus !== 'connected'`. Unlike toasts, it does
not auto-dismiss — it's driven purely by `connectionStatus`. Fixed-position
banner at the top of the viewport (Toasts/Bar already own the bottom;
Landing has no Bar at all per `ui.md`, so top placement is the only spot
visible across every view). Styled with `--riot`/`--riot-dim` (brand.md's
existing error-accent token, already used for the toast's left-border) at
`z-index: 1010`+ to clear alphaTab's `.at-cursors` (1000) and
`lyrics-overlay` (1001), matching the existing convention in
`Modal.svelte`/`Toasts.svelte`.

## Phase Breakdown

1. **Connection status tracking** (test-first, vitest): `ConnectionStatus`
   type, `ClientState.connectionStatus`, `ws-client.ts` sets it correctly
   on `open`/`error`/`close` — no retry yet, just accurate reporting.
2. **Reconnect with retry + session reattachment** (test-first, vitest):
   fixed-interval retry until reopen succeeds; explicit `session-join`
   resend for the already-established-session case, verified against a
   fake/mock WS server the same way `ws-client.ct.spec.ts` already does
   (real `WebSocketServer({port: 0})`, not a full e2e round-trip, for this
   layer).
3. **`ConnectionBanner.svelte`** (test-first, CT): renders iff
   `connectionStatus !== 'connected'`; mounted in `App.svelte`.
4. **e2e coverage**: a real scenario driving the server down (point the
   client at a nonexistent/killed port, or use the existing `sendAsParticipant`-style
   raw-WS pattern in `e2e/helpers.ts` in reverse — close the real test
   server mid-test) then restored, asserting the banner appears and then
   disappears without a page reload.
5. **Artifact updates** — the feedback's own tags:
   - `ui.md` [artifacts: ui]: extend the **States** section's documented
     Error handling to cover total server unreachability (persistent
     banner, not a toast) alongside the existing WS-message-level Error
     state.
   - `infrastructure.md` [artifacts: infrastructure]: document the
     reconnect-with-retry mechanism and its reuse of the existing
     reconnect-by-participantId path (`session-join.ts`), alongside the
     current Session & Real-Time Sync section.

Addresses `feedback-server-failure-banner-f225.md`'s single Bug item —
tagged `[artifacts: ui, infrastructure]` there, split into phase 5 above.

## Complexity Tracking

None — a hand-built fixed-interval retry is the simplest mechanism that
satisfies the requirement given no existing dependency provides one
(Principle V check above), not an unjustified addition.

## Open Questions

- **Retry interval**: proposing a fixed 2s interval (no exponential
  backoff/jitter) — matches this project's self-hosted/small-group scale
  (`constitution.md`'s Project Scope & Intent); flag if a future
  public-deployment posture wants backoff instead. Not blocking —
  implement with the fixed interval unless told otherwise.
- **Give-up behavior**: proposing the retry never gives up (keeps trying
  indefinitely) rather than surfacing a permanent "couldn't reconnect"
  dead-end — the user can always reload manually. Not blocking.
- **Exact banner copy**: deferred to implementation, matching the existing
  toast/UI voice (brand.md) — not a design blocker for this plan.

## Production Annotation Summary

None. The simple fixed-interval retry (no backoff) is a deliberate
simplicity choice consistent with the documented deployment scale, not a
shortcut requiring a production annotation.
