---
plan: plan-explicit-readiness-2026-07-19-841d.md
generated: 2026-07-19
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Shared enum + loaded/ready split

- [ ] T001 [artifacts: constitution, datamodel] Extend the shared
  `ReadinessStatus` type (`packages/shared/src/index.ts`) to
  `'no-part' | 'loading' | 'loaded' | 'ready'` and add the new client
  message type `ready-set { ready: boolean }` to
  `packages/shared/src/messages.ts` (named types, Principle VI). Let
  the compiler surface every affected site; test-first where behavior
  changes: client sites that flip readiness to `'ready'` on asset
  completion (score render + SoundFont, `client/src/readiness.ts` /
  playback-engine wiring) now flip to `'loaded'`; migrate every
  existing test/CT asserting `'ready'`-from-loading to `'loaded'`.
  Semantics per datamodel.md: any transition back into
  `no-part`/`loading` (part/song change, reconnect) clears the human
  confirmation. Rebuild shared dist; all suites green.
- [ ] T002 [artifacts: infrastructure, datamodel] Test-first server
  handler for `ready-set` (new file
  `server/src/handlers/ready-set.ts`, routed in `dispatch.ts`,
  modeled on `readiness-update.ts`): sets the participant's readiness
  `loaded → ready` (or `ready → loaded` on un-ready), rejects when
  the participant isn't in a ready-able state (`no-part`/`loading` —
  terse error like other handlers), broadcasts `session-state`.
  Handler tests for all branches.
- [ ] T003 [artifacts: ui] Test-first client control: the Bar's
  readiness indicator becomes the participant's own ready control —
  clock icon (lucide `clock`) while `loaded` with accessible name/
  tooltip like "I'm ready — click to confirm", check icon (lucide
  `check` or `check-square`) while `ready` with "Ready — click to
  un-ready"; sends `ready-set`; loading/no-part states render as
  today (non-interactive). Participants-list rows show the same
  clock-vs-check distinction per member. CT: control states +
  round-trip, list badges, a11y-sweep still green (accessible names).

## Phase 2: Start negotiation (server)

- [ ] T004 [artifacts: infrastructure, datamodel] Test-first server
  start-negotiation per infrastructure.md's Start Negotiation section:
  when the host sends `playback-control start` and every connected
  participant is `ready`, start exactly as today (assert no new
  messages on the happy path). Otherwise hold the start and open a
  negotiation: per plan defaults — the host is EXEMPT from the count
  (starting is their confirmation; flip the host's readiness to
  `ready`), only CONNECTED not-ready participants count and are
  messaged. Send `start-confirmation-needed { notReadyCount }` to the
  host and `host-start-pending` to each counted participant; store one
  pending negotiation on the session (a second host start while
  pending replaces it — recount + re-message). New host message (e.g.
  `start-confirmation-answer { proceed: boolean }`): proceed → run the
  normal start flow and send `host-start-resolved { started: true }`
  to the pending participants; cancel → no start,
  `host-start-resolved { started: false }`. Host disconnect while
  pending cancels (resolved false). `ready-set` answers given during
  the window persist regardless of outcome (no rollback). Add the new
  server→client message types to shared messages. Handler tests for
  every branch (happy path, hold, confirm, cancel, replace,
  host-disconnect, participant-readies-during-window count change).

## Phase 3: Negotiation modals (client)

- [ ] T005 [artifacts: ui] Test-first client modals (existing modal
  idiom — dismissible, Esc = no action): host modal on
  `start-confirmation-needed` ("N participants are not yet ready,
  start anyway?" with Start anyway / Cancel wired to
  `start-confirmation-answer`; N updates live from `session-state`
  broadcasts as participants ready up); participant modal on
  `host-start-pending` ("Host wants to start, are you ready?" with an
  "I'm ready" action sending `ready-set`), auto-dismissed by
  `host-start-resolved` either way. CT: both modals' render/actions,
  live count update, auto-dismiss on resolved true and false, Esc on
  the host modal counts as cancel-nothing (no answer sent — the
  negotiation stays pending until answered or replaced; assert that
  explicitly).

## Phase 4: Live verification + close-out

- [ ] T006 Live two-client verification in a real browser (own
  server+client on non-default ports, scratch public catalog; two
  browser contexts — host + member): (a) member loads a part →
  indicator shows clock; click → check; un-click → clock; host's
  participant list mirrors it; (b) host starts with the member
  not-ready → host sees the "1 participant is not yet ready" modal,
  member sees "Host wants to start" modal; member clicks I'm ready →
  host's count drops live; (c) repeat with host clicking Start anyway →
  playback starts, member modal auto-dismisses; (d) repeat with Cancel
  → nothing starts, member modal auto-dismisses; (e) all-ready start →
  no modals, starts immediately. Record outcomes in a tasks-file note;
  clean up processes. Leave the three stale diagrams for a later
  /ardd-diagram pass (note it).
