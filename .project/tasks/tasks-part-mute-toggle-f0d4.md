---
plan: plan-part-mute-toggle-2026-07-14-6b68.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Persisted mute preference module

- [ ] T001 [artifacts: ui] [parallel] Write a failing unit test first
  (mirroring `client/src/metronome-preference.test.ts`'s conventions if
  present, else the general vitest pattern used across `client/src/*.test.ts`)
  for a new `client/src/track-mute-preference.ts`: `loadStoredTrackMute(songId:
  string, trackIndex: number): boolean` (returns `false` when no matching
  `localStorage` key exists — default unmuted) and `persistTrackMute(songId:
  string, trackIndex: number, muted: boolean): void`, using the storage key
  shape `sync-tab-scroll:mute:<songId>:<trackIndex>`. Confirm the test fails,
  then implement the module to make it pass. Mirrors
  `client/src/metronome-preference.ts`'s exact shape (same load/persist pair
  pattern), but keyed per song+track instead of one global flag — a mute
  choice for "Bass" on one song must not carry over to a different song's
  differently-indexed "Bass" track.

## Phase 2: Engine wiring

- [ ] T002 [artifacts: ui] Write a failing test first (extend
  `client/src/playback-engine.test.ts` if it exists, else the CT-spec
  convention used for `playback-engine.ct.spec.ts`) asserting a new
  `setEngineTrackMute(trackIndex: number, muted: boolean): void` exported
  from `client/src/playback-engine.ts` calls
  `state.api.changeTrackMute([track], muted)` on the currently loaded
  engine's score track matching `trackIndex`, and no-ops safely (does not
  throw) when no engine exists yet or the score hasn't loaded. Confirm RED,
  then implement, mirroring `setEngineMetronome`'s exact existing shape
  (`if (!state) return;` guard at ~L469-472) — add an equivalent guard for
  `state.score` being unset, since `changeTrackMute` needs real `Track`
  objects that only exist once `scoreLoaded` has fired. Depends on T001
  (imports its types only).
- [ ] T003 [artifacts: ui] Write a failing test first asserting that once
  `ensurePlaybackEngine`'s `api.scoreLoaded.on((score) => {...})` handler
  fires (where `state!.score = score` is already set,
  `client/src/playback-engine.ts`), every track in the loaded score whose
  `loadStoredTrackMute(song.id, track.index)` returns `true` has
  `changeTrackMute([track], true)` applied to it automatically — i.e. a
  participant's previously-muted parts stay muted across a reload/rejoin,
  not just within the same engine instance. Confirm RED, then add this
  application loop inside the existing `scoreLoaded` handler, right after
  `state!.score = score` is set. Depends on T001, T002.

## Phase 3: Preferences UI

- [ ] T004 [artifacts: ui] Write a failing CT test first (new spec or an
  addition to `client/src/components/SettingsModal.ct.spec.ts`, following
  its existing mount/props conventions) asserting: the Preferences tab
  renders one mute toggle button per entry in a multi-part
  `session.availableParts` fixture, each toggle's initial `variant`/label
  reflects its stored mute state, and clicking a toggle flips its own
  visible on/off state. Confirm RED, then implement in
  `client/src/components/SettingsModal.svelte`: add a "Mute parts" section
  directly below the existing Metronome toggle block in the Preferences
  tab, iterating `session.availableParts` (already available in this
  component via the existing "Playing: X" derivation at ~L118). One toggle
  button per part, `variant`/`label` pattern mirroring the Metronome
  button (`variant={muted ? 'riot' : 'ghost'}`, label combining the part's
  `instrumentName` with its on/off state), calling `persistTrackMute` then
  `setEngineTrackMute` on click — mirrors `toggleMetronome`'s existing
  two-call shape (~L72-75) exactly. Add a hint paragraph below the section
  ("Only you don't hear muted parts — everyone else still does."),
  matching the existing Metronome hint's markup pattern (~L191). Depends
  on T001, T002, T003.
- [ ] T005 [artifacts: ui] Write a failing CT test first asserting the
  persisted-preference round-trip: after clicking a mute toggle in the
  mounted `SettingsModal`, `loadStoredTrackMute(songId, trackIndex)`
  reflects the new value (confirming T004's click handler actually calls
  `persistTrackMute`, not just updating local component state). Confirm
  RED, then wire/fix as needed so it passes — this should already be
  satisfied by T004's implementation if done correctly; if it fails, the
  fix belongs in T004's handler, not a new mechanism. Depends on T004.

## Phase 4: Self-mute confirmation

- [ ] T006 [artifacts: ui] Write a test (unit or CT, whichever fits — a CT
  test extending T004's spec is simplest) confirming a participant CAN
  mute the part they currently have selected/rendered (`Participant.selectedPart`
  matching the toggled part's `trackIndex`) — i.e. assert there is no
  restriction anywhere in T001-T004's code path preventing this, per
  `ui.md`'s explicit "no restriction" decision (Preferences tab, Mute
  parts subsection). This is a regression guard, not new functionality —
  if the test passes without any code change, that confirms the guard;
  do not add a restriction to make a differently-designed test pass.
  Depends on T004, T005.
