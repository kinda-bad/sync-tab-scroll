---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: explicit-readiness
created: 2026-07-19
features: [explicit-participant-readiness]
surfaced-defects: []
---

# Plan: Explicit participant readiness + start negotiation

## Goal

Add a human-confirmed readiness stage (loaded vs ready) with a
clock/check Bar control, and a server-coordinated start negotiation —
host "start anyway?" confirmation and participant "are you ready?"
modals that auto-dismiss on the host's answer.

## Scope

**In** (feature `explicit-participant-readiness`; artifact design
applied this run to datamodel/infrastructure/ui):
- Shared `ReadinessStatus` gains `'loaded'`: `no-part | loading |
  loaded | ready`. `loaded` = assets done (the state formerly called
  ready); `ready` = human-confirmed via the new `ready-set` message.
  Transitions back into `no-part`/`loading` clear the confirmation.
- Server: `ready-set` handler (like `readiness-update`); start
  negotiation per infrastructure.md's new Start Negotiation section —
  hold `playback-control start` when any connected participant isn't
  `ready`, send `start-confirmation-needed {notReadyCount}` to the
  host and `host-start-pending` to each not-ready participant, resolve
  on the host's confirm/cancel with `host-start-resolved {started}`;
  one pending negotiation per session (a new start replaces it), host
  disconnect cancels it. Happy path (everyone ready) starts exactly as
  today with no new round-trips.
- Client: every site that currently flips readiness to `'ready'` on
  asset completion now flips to `'loaded'`; the Bar's readiness
  indicator becomes the participant's own ready control (clock icon =
  loaded, click to confirm; check icon = ready, click to un-ready;
  accessible names per the Bar's standing a11y rule + the a11y-sweep
  CT); participants list rows show clock vs check; the two negotiation
  modals per ui.md (dismissible, Esc = no action, participant modal
  auto-dismissed by `host-start-resolved`).
- Full-suite updates: every existing test/CT that asserts `'ready'`
  from asset loading moves to `'loaded'`; new tests for the enum, the
  negotiation flow (server), and the modals/control (CT).

**Out:**
- Any persistence of readiness (in-memory session state like all
  session fields).
- Auto-ready heuristics (e.g. auto-confirm after N seconds) — not
  designed; capture as future feedback if wanted.
- The remaining backlog (`sync-tabs-to-real-audio`,
  `host-mandated-bars-per-row-layout`).

## Technical Approach

The seams all exist: `ReadinessStatus` is one named shared type
(constitution Principle VI — the enum change is one source of truth);
`readiness-update` is the handler pattern for `ready-set`;
`playback-control` already authorizes host-only actions; modals follow
the existing idiom. Server-side the negotiation is a small in-memory
field on `Session` (e.g. `pendingStart: { notReadyIds: string[] } |
null` — exact shape implementation judgment) plus three server→client
messages; participant "I'm ready" during the window is an ordinary
`ready-set` whose `session-state` broadcast updates the host's modal
count live. Client-side the Bar indicator reuses the Button/iconOnly +
tooltip idiom (clock/check lucide icons). TDD throughout (Principle
VII): shared type change is compile-enforced; server flow gets
handler-level tests (happy path unchanged, hold/confirm/cancel/replace/
host-disconnect); client gets CT for the control states, list badges,
and both modals including auto-dismiss.

## Phase Breakdown

**Phase 1 — Shared enum + loaded/ready split.** `ReadinessStatus` gains
`'loaded'`; client flips asset-completion to `loaded`; `ready-set`
message type + server handler + broadcast; Bar control (clock/check) +
participants-list badges. All existing tests migrated.

**Phase 2 — Start negotiation (server).** Depends on 1. Hold-start
logic, the three messages, one-pending-per-session semantics, host
disconnect cancel; handler tests for every branch.

**Phase 3 — Negotiation modals (client).** Depends on 2. Host
confirmation modal, participant are-you-ready modal with auto-dismiss,
live count updates; CT coverage.

**Phase 4 — Live verification + close-out.** Depends on 1–3. Two-client
real-browser pass: loaded→ready control round-trip, host start with a
not-ready member (both modals, "I'm ready" during window, start-anyway,
cancel, auto-dismiss), happy path unchanged; diagrams left stale for a
later /ardd-diagram pass; STATUS handoff.

## Open Questions

1. Should the host's own not-ready state count toward `notReadyCount`
   (host started, so arguably they're implicitly ready)? Default: the
   host is exempted from the count (starting IS their confirmation) —
   their `readiness` flips to `ready` on start.
2. Disconnected participants never count toward the negotiation
   (default: only connected, not-ready participants are counted and
   messaged) — confirm.
3. When a negotiation is cancelled, do the not-ready participants'
   "I'm ready" answers given during the window persist? Default: yes —
   they were ordinary `ready-set`s, no rollback.
