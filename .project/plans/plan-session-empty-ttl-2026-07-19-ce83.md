---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: session-empty-ttl
created: 2026-07-19
features: []
surfaced-defects: []
---

# Plan: Configurable empty-session TTL (12h default)

## Goal

Replace the hardcoded 30-second empty-session destroy timer with an
env-configurable idle TTL defaulting to 12 hours, with a pause-on-empty
guard so long-dormant sessions rejoin cleanly.

## Scope

**In** (from `feedback-session-expiry-question-8f83.md` F001, grounded in
`research-session-expiration-2026-07-19-9b87.md`):
- `SESSION_EMPTY_TTL_MS` env var (config.ts, `.env.example` parity),
  **default 12 hours** (user decision 2026-07-19, overriding the
  research doc's 4h suggestion), threaded into `SessionStore` as a
  constructor param replacing the hardcoded `GRACE_PERIOD_MS = 30_000`
  (`server/src/session-store.ts:3`) — the existing
  `markPossiblyEmpty`/`markActive` machinery is already an idle TTL;
  only the duration and its configurability change.
- Pause-on-empty guard: when a disconnect leaves zero connected
  participants and `playbackState.status === 'running'`, set it to
  `'paused'` so a much-later rejoin doesn't drift-correct against a
  stale `serverTimestamp`.
- Fix/verify the pre-existing absent-host edge the longer TTL amplifies
  (research Open Question 2): a member rejoining an empty session leaves
  the disconnected host as `hostId` indefinitely because
  `scheduleHostReassignment` fires only on host disconnect — on a rejoin
  into a session whose host is disconnected, (re)schedule host
  reassignment so the existing 120s promotion path applies.
- Test updates anywhere the 30s value is load-bearing
  (`session-store.test.ts`, disconnect tests, any CT specs riding
  `session-not-found` timing).
- Artifact revision: infrastructure.md's session-lifecycle text (the
  "grace-period timer destroys empty sessions" line and Production
  Posture) gains the configurable TTL + pause-on-empty + rejoin
  reassignment semantics.

**Out:**
- Ghost-participant pruning (research recommendation "optional/low
  priority" — revisit only if lobby-list noise is observed in practice).
- Two-tier drive-by-session handling, DB persistence, park/resume UI,
  activity-based expiry (all rejected in the research doc).
- Any client-side UX change — the existing `session-not-found` terminal
  path is the expiry UX and stays as-is.

## Technical Approach

Mirror the `hostReassignGraceMs`/`HOST_REASSIGN_GRACE_MS` config pattern
exactly (`server/src/config.ts:54`): parse `SESSION_EMPTY_TTL_MS` with a
12h (43_200_000) default, pass into `new SessionStore(...)` at
`server/src/server.ts:33`, and use it where `GRACE_PERIOD_MS` is used
today. Pause-on-empty lives in the same code path that calls
`markPossiblyEmpty` (`server/src/disconnect.ts`) — one status check
before arming the timer. The host-reassign-on-rejoin check goes in
`session-join.ts`'s reclaim/join path: if the session's `hostId` points
at a `disconnected` participant and no reassign timer is pending,
schedule one (reusing `host-succession.ts`'s existing machinery).
TDD per constitution Principle VII with the store's existing fake-timer
tests.

## Phase Breakdown

**Phase 1 — TTL + guard (server).** Test-first: config parsing +
default, store constructor param, pause-on-empty, timer behavior at the
new duration; fix any tests pinned to 30s.

**Phase 2 — Absent-host rejoin reassignment.** Depends on 1 (same
files). Test-first: member rejoins empty session with disconnected host
→ reassignment scheduled → existing promotion path fires.

**Phase 3 — Artifact revision + close-out.** Depends on 1–2.
infrastructure.md lifecycle text updated (feedback F001); `.env.example`
parity check green; STATUS handoff.

## Open Questions

1. None blocking — TTL default fixed at 12h by user decision; remaining
   choices (ghost pruning, drive-by tiering) are explicitly out of
   scope with the reasoning recorded in the research doc.
