---
plan: plan-session-empty-ttl-2026-07-19-ce83.md
generated: 2026-07-19
status: completed   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: TTL + pause-on-empty (server)

- [x] T001 [artifacts: constitution, infrastructure] Test-first (red):
  in `server/src/session-store.test.ts` (fake timers) and
  `server/src/config` tests, add failing tests for: (a)
  `ServerConfig.sessionEmptyTtlMs` parsed from env
  `SESSION_EMPTY_TTL_MS` with default 43_200_000 (12h), mirroring the
  `hostReassignGraceMs`/`HOST_REASSIGN_GRACE_MS` pattern
  (`server/src/config.ts:54`); (b) `SessionStore` takes the TTL as a
  constructor param — a session with all participants disconnected
  survives past 30s and past 4h, and is destroyed only after the
  configured TTL (test with a small injected value); any existing test
  pinned to the 30s `GRACE_PERIOD_MS` updated to inject its own
  duration; (c) pause-on-empty — when the last connected participant
  disconnects while `playbackState.status === 'running'`, the status
  becomes `'paused'` before the empty timer arms. Use `it.fails`
  markers on the red commit per the pre-commit-hook convention.
- [x] T002 [artifacts: infrastructure] Implement: replace the hardcoded
  `GRACE_PERIOD_MS = 30_000` (`server/src/session-store.ts:3`) with a
  constructor-injected duration; add `sessionEmptyTtlMs` to
  `server/src/config.ts` (env `SESSION_EMPTY_TTL_MS`, default
  43_200_000) and add the key to `server/.env.example` (Principle VIII
  parity — the pre-commit `check:env` must stay green); pass it through
  at `server/src/server.ts:33`; add the pause-on-empty guard in the
  disconnect path (`server/src/disconnect.ts`) alongside the existing
  `markPossiblyEmpty` call. Remove the `it.fails` markers; full server
  suite green.

## Phase 2: Absent-host rejoin reassignment

- [x] T003 [artifacts: infrastructure] Test-first fix for the
  pre-existing edge a 12h TTL amplifies: a member (re)joining a session
  whose `hostId` points at a `disconnected` participant currently
  leaves that absent host in place forever (`scheduleHostReassignment`
  fires only on host disconnect — `server/src/host-succession.ts`, and
  the timer isn't rescheduled after an empty period). Red test in the
  join/reclaim path: member joins an empty session with a disconnected
  host → host reassignment gets scheduled → after the existing
  `hostReassignGraceMs` the longest-tenured connected participant is
  promoted (reuse `promoteNextHost`). Host reclaiming their own
  identity must still cancel reassignment as today
  (`session-join.ts:50`). Implement minimally in `session-join.ts`
  (schedule if host disconnected and no timer pending); suite green.

## Phase 3: Artifact revision + close-out

- [x] T004 [artifacts: infrastructure] Revise infrastructure.md's
  session-lifecycle text (feedback
  `feedback-session-expiry-question-8f83.md` F001): the "grace-period
  timer destroys empty sessions" wording becomes the configurable
  `SESSION_EMPTY_TTL_MS` idle TTL (default 12h) with rationale
  (resumable-vs-abandoned via time-since-empty; codespace-pollution
  reason for not going indefinite — cite
  `research-session-expiration-2026-07-19-9b87.md`), plus the
  pause-on-empty guard and the join-time host-reassignment check. Stamp
  `last_updated` via `ardd-state.sh stamp`. No code in this task.
- [x] T005 Quick live sanity check (real server, small injected TTL via
  env): create a session, disconnect all tabs, verify it survives past
  30s and dies after the injected TTL; rejoin within the window and
  verify the session resumes with playback paused. Record the outcome
  in a tasks-file note.

> **T005 note (2026-07-19):** Live check ran against a real server
> (`tsx src/index.ts`, PORT=6199, `SESSION_EMPTY_TTL_MS=35000`) driven
> by a scripted `ws` client: host created session `ETLR`, started
> playback, disconnected. Rejoin at t≈31s (past the old 30s grace)
> returned `session-state` with `playbackState.status: 'paused'`
> (pause-on-empty confirmed). After disconnecting again and waiting
> past the 35s TTL, rejoin returned `session-not-found`. All four
> checks passed; server process cleaned up afterward.
