---
status: approved
branch: lobby-cursor-modes
created: 2026-07-03
features: []
---

# Plan: Spotlight-Mode-Gated Lobby Cursor

## Goal

The host's lobby-cursor pointer only forces every participant's view to
follow it while an explicit, host-only "Spotlight mode" is on;
otherwise each participant is free to browse their own rendered tab
independently.

## Scope

**In scope:**
- A new host-only `Session.spotlightMode` toggle (default off), same
  pattern as the existing `metronomeEnabled`/`countInEnabled` fields.
- Gating the lobby cursor's force-follow effect on that toggle.
- Building the force-follow effect itself — see Technical Approach; it
  does not actually exist in the running app yet (see below).
- `spotlightMode` auto-resets to `false` when playback starts,
  mirroring `lobbyCursorTick`'s existing reset-to-`null` behavior.
- Revising `datamodel.md`, `ui.md`, and `features.md`'s "Lobby cursor"
  entry to describe the conditional behavior (this plan's answer to the
  open feedback item, `.project/feedback/feedback-lobby-cursor-mode-e13b.md`).

**Out of scope:**
- Any pointer/cursor-sync concept in the Playback view — `lobbyCursorTick`
  and this plan are both pre-playback (Lobby) only, matching the existing
  field's documented scope. Nothing here touches the live playback cursor.
- Syncing a freely-set participant pointer back to the server. Confirmed
  with the user: outside Spotlight mode, a participant's own browsing
  position is local UI state only, never broadcast or stored per
  participant.
- `host-delegation`/`request-to-become-host` (separate backlogged
  features, unrelated).

## Technical Approach

**Finding from code inspection, not assumed**: the lobby cursor's "force"
behavior described in `ui.md`/`features.md` ("all participants see the
same pointer") isn't actually implemented today. The only client-side
consumer of `Session.lobbyCursorTick` is `Lobby.svelte`'s plain text
readout ("Host is pointing at tick N") — nothing currently moves any
participant's rendered alphaTab view to that tick. This plan both adds
the Spotlight-mode gate *and* builds the force-follow effect it gates,
rather than modifying an existing mechanic.

**Data model** (`datamodel.md`, `packages/shared/src/index.ts`):
`Session.spotlightMode: boolean`, alongside the existing
`lobbyCursorTick`. No new entity — this is a session-wide flag, same
shape as `metronomeEnabled`/`countInEnabled`.

**Message + handler** (`packages/shared/src/messages.ts`,
`server/src/handlers/`): a new `ClientMessage` variant,
`{ type: 'spotlight-mode-set'; enabled: boolean }`, host-only
(same authorization check as `lobby-cursor-set`/`playback-control`:
`session.hostId !== conn.participantId` → error toast). The handler sets
`session.spotlightMode` and broadcasts `session-state` as normal — no
new sync mechanism, this follows the exact pattern every other
host-only session-setting change already uses.

`server/src/handlers/playback-control.ts`'s `start` case (which already
resets `lobbyCursorTick` to `null`) also resets `spotlightMode` to
`false` in the same edit — one place, matching precedent.

**Client force-follow effect** (`client/src/App.svelte` or
`playback-engine.ts`, wherever the persistent per-participant alphaTab
instance lives, per the existing T011c persistent-engine design): a
`clientStore` subscription reacts to `session.lobbyCursorTick` changes
*only* while `session.spotlightMode` is `true`, and sets that
participant's `api.tickPosition` to the new value — snapping their view
to match the host's. While `spotlightMode` is `false`, this subscription
does nothing; a participant's own scroll/interaction with their rendered
tab is alphaTab's default, already-free behavior — there is no "local
pointer" state to build, since the current absence of forcing *is* the
free-browsing behavior. The host's own view moves because they're the
one setting the cursor, not because anything forces it back.

**UI** (`client/src/views/Lobby.svelte`): a host-only Spotlight-mode
toggle button, placed alongside the existing "Set lobby cursor"/"Clear"
controls it gates.

## Phase Breakdown

### Phase 1: Data model + shared types
- Add `Session.spotlightMode: boolean` (`packages/shared/src/index.ts`, `datamodel.md`).
- Add `{ type: 'spotlight-mode-set'; enabled: boolean }` to `ClientMessage` (`packages/shared/src/messages.ts`).
- **[artifacts: datamodel]** Revise `datamodel.md`'s `Session.lobbyCursorTick` Notes and add the new `spotlightMode` field, per this plan and the confirmed feedback override.

### Phase 2: Server
- `server/src/handlers/spotlight-mode-set.ts`: host-only handler, mirrors `lobby-cursor-set.ts`'s authorization/broadcast pattern.
- Wire into `server/src/dispatch.ts`'s switch.
- `playback-control.ts`'s `start` case resets `spotlightMode` to `false` alongside the existing `lobbyCursorTick = null`.
- Test: scripted WS test — non-host `spotlight-mode-set` gets the host-only error, no state change; host toggling it broadcasts the updated flag; `start` resets it.

### Phase 3: Client — force-follow effect + toggle UI
- `clientStore` subscription (wherever the persistent alphaTab instance lives) applies `session.lobbyCursorTick` to `api.tickPosition` only while `session.spotlightMode` is true.
- `Lobby.svelte`: host-only Spotlight-mode toggle button next to the existing lobby-cursor controls.
- Test: real browser session, two tabs, both with a part selected (so both have a rendered/persistent alphaTab instance per T011c) — Spotlight mode **off**: host sets the lobby cursor, the other participant's view does not move; Spotlight mode **on**: host sets the lobby cursor, the other participant's view snaps to match. Host clicks Start; confirm Spotlight mode auto-resets (verify via a subsequent Stop → Lobby round-trip that it's back off).

### Phase 4: Remaining artifact revisions
- **[artifacts: ui]** Revise `ui.md`'s Lobby View section: describe the Spotlight-mode toggle and that the lobby cursor only forces participant views while it's on.
- **[artifacts: features]** Revise `features.md`'s "Lobby cursor" entry to describe the conditional behavior; this is the resolution of `feedback-lobby-cursor-mode-e13b.md`'s Reconsidered item.

## Complexity Tracking

None — this follows existing patterns end-to-end (a session-wide boolean
flag like `metronomeEnabled`, a host-only message/handler like
`lobby-cursor-set`, a `clientStore` subscription like the existing
drift-correction/theme ones).

## Open Questions

None outstanding — the three design questions (override confirmation,
toggle shape, free-pointer scope) were resolved with the user before
drafting this plan. Naming settled on "Spotlight mode" over the
initially-drafted "presentation mode."

## Production Annotation Summary

None anticipated — no shortcuts expected; this is a small, precedent-following addition.
