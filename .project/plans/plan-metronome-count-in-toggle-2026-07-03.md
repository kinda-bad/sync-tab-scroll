---
status: approved
branch: metronome-count-in-toggle
created: 2026-07-03
features: [metronome-toggle, count-in-toggle]
---

# Plan: Metronome & Count-in Toggles

## Goal

Let the host turn the session's metronome and pre-playback count-in on or
off, wiring `Session.metronomeEnabled`/`countInEnabled` (already read by
`playback-sync.ts`, but never settable) to a real message/handler/UI path.

## Scope

**In scope:**
- Two new `ClientMessage` variants, `metronome-set` and `count-in-set`
  (each `{ enabled: boolean }`), and their server handlers.
- Host-only authorization on both, matching `spotlight-mode-set`'s pattern
  exactly.
- Two new host-only toggle controls in `SettingsModal.svelte`'s
  Participants tab, below the existing lobby-cursor/Spotlight-mode
  controls.
- The constitution Principle V research this plan's own features.md
  entries required before designing anything (see Technical Approach) —
  now done, documented here rather than left as a standing question.

**Out of scope:**
- Any change to `playback-sync.ts` itself — it already reads
  `session.metronomeEnabled`/`countInEnabled` and applies them to
  `api.metronomeVolume`/`countInVolume` correctly (infrastructure.md); this
  plan only adds the missing way to *set* those fields.
- No new `Session` fields — `metronomeEnabled`/`countInEnabled` already
  exist in datamodel.md.
- No `infrastructure.md` change — that artifact describes the WS
  mechanism generally and doesn't enumerate every message type, so two
  more messages following an already-documented pattern don't require an
  edit there.

## Technical Approach

**Principle V research (done, not deferred):** checked alphaTab's public
API (`@coderline/alphatab` v1.8.3 type definitions) for
`metronomeVolume`/`countInVolume`. Both are plain numeric get/set
properties on the player API instance — alphaTab exposes no toggle UI, no
"enabled" boolean, and (unsurprisingly, since alphaTab has no concept of a
multi-client session at all) no session-sync mechanism of any kind. The
existing code's approach — `playback-sync.ts` mapping a boolean session
flag to `0`/`1` on the numeric property — is already the idiomatic use of
alphaTab's actual surface. There is nothing to defer to; the gap this
plan closes (a message + handler to let the host set that boolean) is
this app's own domain, not a duplicated library concern. This closes the
open research question both features' `Why:` notes raised.

**Message/handler shape:** two separate messages, `{ type:
'metronome-set'; enabled: boolean }` and `{ type: 'count-in-set'; enabled:
boolean }`, each with its own handler — mirroring `spotlight-mode-set`
(`server/src/handlers/spotlight-mode-set.ts`) exactly: look up the
connection and session, reject with an `error` message if the sender
isn't `session.hostId`, otherwise set the field and broadcast
`session-state`. This was a real decision, not a given — a single
combined `session-settings-set { metronomeEnabled?, countInEnabled? }`
message was considered, since features.md's own note frames these as
sharing "the same session-settings message/handler shape." Two
single-purpose messages was chosen instead specifically to match that
existing shape (one message type per boolean toggle, as `spotlight-mode-
set` and `lobby-cursor-set` both already do) rather than introducing a
new combined-settings shape with no precedent elsewhere in the message
protocol — "same shape" is satisfied by both messages being structurally
identical to each other and to the established one-flag-per-message
convention, not by merging them into one. Constitution Principle IV
(dispatch decomposed by concern) also favors two named handlers over one
handler branching on which optional field was sent.

**UI placement:** both toggles go in `SettingsModal.svelte`'s
Participants tab, immediately below the Spotlight-mode toggle — see the
`ui.md` edit this plan already applied (step 3d). Rationale recorded
there: these are host-controlled, broadcast-to-everyone *session*
settings, the same category as Spotlight mode and the lobby cursor
already in that tab, not personal display preferences like the Settings
tab's theme control.

## Phase Breakdown

### Phase 1 — Shared message types
1. `[artifacts: datamodel]` **[T-shape]** Add `'metronome-set'` and
   `'count-in-set'` variants to `ClientMessage`
   (`packages/shared/src/messages.ts`), each `{ enabled: boolean }`,
   alongside the existing `spotlight-mode-set` variant.

### Phase 2 — Server handlers (depends on Phase 1)
2. `[parallel]` Write a failing server test for `metronome-set`: non-host
   sender gets an `error` message and `session.metronomeEnabled`
   unchanged; host sender flips the flag and triggers a `session-state`
   broadcast. Mirror the existing `spotlight-mode-set.test.ts` structure.
3. Implement `server/src/handlers/metronome-set.ts` per the Technical
   Approach above, and register it in `server/src/dispatch.ts`. Make the
   Phase 2 test pass.
4. `[parallel]` Write a failing server test for `count-in-set`, same
   shape as task 2 but for the `countInEnabled` field.
5. Implement `server/src/handlers/count-in-set.ts`, register it in
   `dispatch.ts`. Make the task 4 test pass.

### Phase 3 — Client UI (depends on Phase 2)
6. Add "Metronome" and "Count-in" host-only toggle `Button`s to
   `SettingsModal.svelte`'s Participants tab, below the Spotlight-mode
   toggle, sending `metronome-set`/`count-in-set` on click — same
   conditional-rendering (`{#if isHost}`) and `variant={enabled ? 'riot' :
   'ghost'}` pattern as the existing Spotlight-mode button.
7. `[parallel]` Add or extend a component test confirming both buttons
   render only for the host, reflect `session.metronomeEnabled`/
   `countInEnabled`'s current state in their variant/label, and send the
   correct message on click (mirroring however the existing Spotlight-mode
   button is/isn't already covered by `SettingsModal`'s test coverage —
   check first rather than assuming a test file exists to extend).

### Phase 4 — Verification (depends on Phase 3)
8. Run the full test suite (server + client unit + client component
   tests) to confirm no regressions.
9. Live-check in a real session (per the project's established live-
   browser-verification practice, `STATUS.md`): as host, toggle both
   settings and confirm a second participant's audio actually reflects
   the change.

## Complexity Tracking

None. Both new messages/handlers are structurally identical to an
existing, already-accepted pattern (`spotlight-mode-set`); no new
abstraction or mechanism is introduced.

## Open Questions

- None blocking. One assumption made autonomously during this plan
  (per this run's operating constraints, no user available to ask
  directly): that "Metronome"/"Count-in" toggles belong in the
  Participants tab rather than Settings, and that non-host participants
  get no visible readout of these settings' current state (matching
  Spotlight mode's existing precedent exactly). If this assumption is
  wrong, it's a one-tab UI move, not a data-model or protocol change —
  low risk to revisit later via `/ardd-feedback` if the placement feels
  off once live.

## Production Annotation Summary

None — no production shortcuts introduced; this follows an already-
production pattern (`spotlight-mode-set`) verbatim.
