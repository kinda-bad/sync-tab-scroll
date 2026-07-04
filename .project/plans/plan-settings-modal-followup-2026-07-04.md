---
status: approved
branch: settings-modal-followup-d914
created: 2026-07-04
features: []
---

# Plan: Settings modal follow-up (lobby-cursor layout + labeling)

## Goal

Regroup the Participants tab's single, overcrowded "lobby cursor" control
row into two clearly-labeled, related groups, and clarify the
relationship between the lobby cursor and Spotlight mode in the UI copy
itself (not just in `ui.md`).

## Scope

**In scope**: `SettingsModal.svelte`'s Participants-tab layout below the
participant list — splitting `.cursor-controls` into two sections, and
adding clarifying hint copy. Updating `ui.md` to match.

**Not in scope**: the Reconsidered item (metronome should be
per-participant, not host-forced) — see Open Questions. No new top-level
Settings-modal tab is introduced; both groups stay in the existing
Participants tab, preserving `ui.md`'s established Participants
(host-broadcast session settings) vs. Settings (personal display
preference) split — the feedback item's phrase "split across
related/grouped tabs" is interpreted here as *grouped sections within the
tab*, not new top-level tabs, since introducing new top-level tabs for
two small control clusters would fragment a already-small modal and
contradicts the documented two-tab structure without any stated reason to
revisit it.

## Technical Approach

Confirmed via reading `client/src/components/SettingsModal.svelte`
(lines 90-117): today, six controls — the tick-position `<input>`, "Set
lobby cursor", "Clear", "Spotlight mode" toggle, "Metronome" toggle, and
"Count-in" toggle — all live in one `.cursor-controls` div
(`display: flex`, no wrap, line 160-164), which is exactly the "crammed
onto one line, very wide" the feedback describes. Metronome/Count-in
ended up in this same row purely because the `metronome-count-in-toggle`
feature reused the existing div rather than adding its own section — they
have no functional relationship to the lobby cursor or Spotlight mode.

Split into two sibling sections, each with its own `.section-label`
(reusing the existing pattern already used for "Participants" and "Lobby
cursor" above it):

1. **"Lobby cursor" section** (existing label, unchanged position): tick
   input, "Set lobby cursor", "Clear", "Spotlight mode" toggle. Add a
   one-line hint directly under the controls, host-only, replacing
   reliance on `ui.md` prose the UI itself never surfaced:
   *"Spotlight mode forces every participant's view to follow the lobby
   cursor. Off: it's just a marker — cursor position and Spotlight state
   both reset when playback starts."*
   This makes the on/off consequence and the playback-start reset legible
   without opening the modal's tooltip-free UI and guessing.

2. **"Playback audio" section** (new label): "Metronome" and "Count-in"
   toggles, moved out of `.cursor-controls` into their own flex row.

`.cursor-controls`'s CSS class is reused for the "Lobby cursor" group's
row (now only 3 controls, no longer overflowing) and duplicated (or
renamed to something shared like `.control-row`) for the new "Playback
audio" row — trivial CSS, no new component needed.

## Phase Breakdown

### Phase 1: Split the control row
- [ ] T001 [artifacts: ui] In `client/src/components/SettingsModal.svelte`,
  split the single `.cursor-controls` div (lines 97-116) into two: the
  existing "Lobby cursor" `.section-label` keeps only the tick input, "Set
  lobby cursor", "Clear", and "Spotlight mode" toggle; add a new
  `.section-label` "Playback audio" immediately after, containing the
  Metronome and Count-in toggle buttons in their own row.
- [ ] T002 [artifacts: ui] Add the host-only hint paragraph clarifying the
  Spotlight-mode/lobby-cursor relationship (exact copy in Technical
  Approach above) under the Lobby cursor group's controls, styled with the
  existing `.hint` class.
- [ ] T003 Update `SettingsModal.ct.spec.ts` (and
  `SettingsModalHarness.svelte` if selectors change) to match the new
  section structure — confirm existing assertions still locate the
  Metronome/Count-in/Spotlight/lobby-cursor controls correctly under their
  new groupings, and add an assertion the new hint text renders when host.
- [ ] T004 [artifacts: ui] Revise `ui.md`'s Participants-tab description
  (lines 110-131) to describe the two separate groups ("Lobby cursor +
  Spotlight mode" and "Playback audio: Metronome + Count-in") instead of
  "one row of controls... all side by side," and note the in-UI hint text
  now carries the Spotlight-mode explanation directly (reducing reliance
  on this artifact as the only place that relationship is explained).
  Bump `last_updated`; diagram_status stays as currently set (no new
  view/state introduced, layout-only change).

## Complexity Tracking

None — this is a straightforward layout split with no new abstractions,
consistent with `constitution.md`'s simplicity principle.

## Open Questions

- **[BLOCKS metronome-per-participant scope only, not this plan]**
  `feedback-settings-modal-followup-d914.md`'s Reconsidered item asks for
  metronome to be toggleable per participant instead of host-forced.
  Current documented decision, `datamodel.md` line 52-54: `metronomeEnabled`
  is a `Session`-level `boolean` field, explicitly "same pattern as
  `spotlightMode`" (a host-only, session-wide broadcast setting). `ui.md`
  lines 124-131 currently states Metronome/Count-in are "visible and
  interactive only for the host, with no separate readout shown to
  non-host participants... Grouped here rather than in the Settings tab
  because, like Spotlight mode and the lobby cursor, they're host-controlled
  *session* settings broadcast to everyone, not a personal display
  preference." Reversing this is a real schema change (moving
  `metronomeEnabled` from `Session` to per-`Participant`, plus a new
  message/handler shape, plus UI exposing the toggle to every participant
  rather than host-only) — not a copy or layout tweak. **This plan does
  not implement it and does not modify `datamodel.md`/`ui.md`'s current
  text on this point.** Needs the user's explicit confirmation before any
  plan touches it: is per-participant metronome control worth the schema
  change, given it was explicitly designed host-wide originally (see
  `tasks-metronome-count-in-toggle-eb7d.md`)? Until confirmed,
  `feedback-settings-modal-followup-d914.md`'s Reconsidered item stays
  unresolved and that file's `status` stays `open`.

## Production Annotation Summary

None — no shortcuts introduced by this plan.
