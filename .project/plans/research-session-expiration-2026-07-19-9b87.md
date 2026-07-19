---
topic: session expiration — persistence implications and resumable-vs-abandoned distinction
date: 2026-07-19
status: complete
---

# Research: Session Expiration

## Question

Do host-created (music) sessions need to expire? What are the
implications of letting a session persist longer or indefinitely, and can
the system distinguish a session that was navigated away from (but might
be resumed) from one that is truly abandoned?
(From `feedback-session-expiry-question-8f83.md`.)

## Findings

### Today's lifecycle — sessions already expire, aggressively

- **A session dies 30 seconds after its last connected participant
  disconnects.** `GRACE_PERIOD_MS = 30_000` is hardcoded (not
  env-configurable) at `server/src/session-store.ts:3`;
  `markPossiblyEmpty()` (session-store.ts:96-108) arms a 30s timeout
  when a disconnect leaves zero `connectionStatus === 'connected'`
  participants, and deletes the session (plus its `keyUnlocked` set) on
  expiry. Any rejoin cancels it via `markActive()`
  (`session-join.ts:66`).
- This is separate from host reassignment (`HOST_REASSIGN_GRACE_MS`,
  default 120s, `config.ts:54` → `host-succession.ts:30-49`), which only
  promotes a connected non-host.
- Expiry UX already exists and works: a rejoin against a dead code gets
  `session-not-found`; the client toasts, returns to landing, and clears
  the stored identity (`ws-client.ts:136-161`).
- Join-code collision is handled at create
  (`session-store.ts:36-37`; codespace 32^4 ≈ 1.05M).
- Participants are never *removed* on disconnect — only marked
  `disconnected` (`disconnect.ts:17`; removal only via host kick). This
  ghost accumulation is bounded today solely by the 30s reaper.

So the band-on-a-break case is **broken today in the opposite direction
from the feedback's worry**: if everyone closes their tabs for >30
seconds, the session is destroyed and every stored identity invalidated.

### Implications of longer/indefinite persistence

- **Memory: negligible.** ~2–5 KB per idle session, no per-session
  intervals (one global 1s broadcast loop skips non-running sessions).
  Even 10k abandoned sessions ≈ tens of MB; deploys wipe everything
  anyway (memory-only posture is a documented decision,
  session-store.ts:13-18).
- **Codespace pollution is the real long-run cost of "indefinite":** with
  N live sessions, a typo'd join code lands in a *stranger's* session
  with probability N/1.05M — at thousands of accumulated sessions this
  slowly becomes a privacy leak (their unlocked catalogues visible).
- **Ghost participants** would accumulate visibly in the lobby and in
  every broadcast without the reaper — UX noise more than resources.
- **Stale rejoin**: server restores everything (selectedSong,
  playbackState, unlocks); nothing breaks structurally, but a
  `'running'` playbackState with an ancient `serverTimestamp` would make
  drift correction snap wildly — worth a pause-on-empty guard if the TTL
  grows.
- **Accounts**: no durable record references a live session; nothing
  outside the store's Map and clients' localStorage points at one.

### Resumable vs. abandoned — the signals already exist

- **Live**: any participant `connected`.
- **Resumable**: all disconnected but recently; any client holding
  `{code, displayName, participantId}` in localStorage auto-resumes on
  next page load with no user action (`session-persistence.ts`,
  `Landing.svelte:15-18`). The server can't see localStorage, but
  time-since-empty is a faithful proxy.
- **Abandoned**: all disconnected for > T. Deliberate leaving already
  self-distinguishes on the client: `leaveSession` clears localStorage,
  so a leaver never auto-resumes. The server lacks only *intent*, and
  time-since-empty is the standard, adequate substitute for it.

## Recommendation

**Keep expiry; lengthen the fuse dramatically; don't go indefinite.**

1. Make the empty-session TTL env-configurable —
   `SESSION_EMPTY_TTL_MS`, default **4 hours** (covers meal breaks,
   brief outages, resume-after-lunch; total emptiness never spans a real
   practice day). Mechanically a near-one-line change mirroring
   `hostReassignGraceMs`: `session-store.ts` constant → constructor
   param, `config.ts` env var, `server.ts:33` pass-through, plus timer
   tests. The existing markPossiblyEmpty/markActive machinery *is* an
   idle-TTL implementation already.
2. When the last participant disconnects, set a `'running'`
   playbackState to `'paused'` — a defensive guard so an hours-later
   rejoin doesn't drift-correct against a stale `serverTimestamp`.
3. No participant-facing warning semantics needed — expiry only fires
   with nobody connected; the existing `session-not-found` terminal path
   is the expiry UX and already works.
4. Optional/low-priority: prune participants disconnected > TTL on the
   same pass (ghost cleanup); skip two-tier drive-by-session handling
   unless litter is actually observed.

Route: **`/ardd-plan`** — small, well-understood, and it fixes a real
present-day defect (30s is far too short for the resume case the
feedback worried about), so it's worth planning directly rather than
backlogging. The TTL decision (and the pause-on-empty guard) should also
be recorded in infrastructure.md's Session & Real-Time Sync / Production
Posture sections via the plan's artifact-revision task.

## Rejected Alternatives

- **Never expire / restarts-as-GC**: memory is fine but codespace
  pollution slowly turns typos into join-a-stranger's-session leaks, and
  session lifetime becomes deploy-dependent (unpredictable).
- **Absolute lifetime (e.g. 24h from creation)**: worst cost asymmetry —
  kills a live all-day session mid-use; idle-based is strictly better
  and already implemented.
- **DB persistence for cross-restart resumability**: contradicts the
  documented memory-only decision, and the account DB is optional so
  sessions can't depend on it.
- **Activity-based TTL (expire connected-but-idle)**: a connected socket
  is liveness; a projector showing a tab for hours is legitimate use.
- **Explicit park/resume feature**: UI + protocol for what a longer
  timer gives free at this scale.

## Open Questions

1. Desired TTL default — 2h vs 4h vs 12h (research default: 4h).
2. Pre-existing edge a longer TTL makes more visible: a member rejoining
   an empty session leaves the absent host as `hostId` indefinitely
   (`scheduleHostReassignment` only fires on host *disconnect*, and the
   reassign timer isn't rescheduled later). Worth a test + possibly a
   reassign-on-rejoin check in the plan.
3. Whether/when to prune ghost disconnected participants.
4. Check existing tests pinned to the 30s value
   (`session-store.test.ts`, ws-client CT specs on `session-not-found`
   paths) when changing it.
