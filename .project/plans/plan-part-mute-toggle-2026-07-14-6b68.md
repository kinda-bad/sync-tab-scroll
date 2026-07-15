---
status: approved
branch: part-mute-toggle
created: 2026-07-14
features: [part-mute-toggle]
surfaced-defects: []
---

# Plan: Per-participant part mute toggle

## Goal

Let each participant individually mute any part of the song within their
own already-playing full multi-track mix, personal and client-local only.

## Scope

**In scope**: a new client-local, per-song-and-track "mute" preference
(mirroring `metronome-preference.ts`'s shape exactly), a "Mute parts"
section in the Settings modal's Preferences tab (mirroring the existing
Metronome toggle), and wiring that preference to alphaTab's own
`api.changeTrackMute()` against the participant's already-loaded score.

**Out of scope**: any server/session state (confirmed in
`research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md` — mute is
provably personal, like the metronome, not session-broadcast like
count-in); any change to what's loaded or rendered (the full mix already
plays for everyone today — this plan only adds a way to selectively
silence tracks within it, not a way to add or remove tracks from the load).

## Technical Approach

Per the research doc (`research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md`),
every participant's alphaTab instance already plays the full multi-track
mix — `[trackIndex]` on `api.load()` only scopes rendering, not playback.
This means the feature is pure UI + a persisted preference + one alphaTab
API call; no changes to `tab-renderer.ts`'s or `headless-player.ts`'s load
calls.

New module `client/src/track-mute-preference.ts`, same shape as
`client/src/metronome-preference.ts`: a `localStorage`-backed
load/persist pair, but keyed per `(songId, trackIndex)` rather than one
global flag — a mute choice for "Bass" on one song must not carry over to
an unrelated song's differently-indexed "Bass" track. Storage key shape:
`sync-tab-scroll:mute:<songId>:<trackIndex>`.

`playback-engine.ts` gains a `setEngineTrackMute(trackIndex, muted)`
function mirroring `setEngineMetronome`'s exact shape (`if (!state)
return;` guard, then act on `state.api`), calling
`state.api.changeTrackMute([state.score.tracks[trackIndex]], muted)`. At
engine creation (`ensurePlaybackEngine`), after `scoreLoaded` fires and
`state.score` is populated, apply every persisted mute preference for the
current song's tracks in one pass — mirrors how `metronomeVolume` is set
at creation (`api.metronomeVolume = loadStoredMetronome() ? 1 : 0`), but
per-track rather than a single scalar, and must wait for `scoreLoaded`
since `changeTrackMute` needs real `Track` objects from the loaded score
(`metronomeVolume` needs no such wait — it's a plain property).

`SettingsModal.svelte`'s Preferences tab gains a "Mute parts" section
below the existing Metronome toggle, listing `session.availableParts`
(same source the existing "Playing: X" label / Participants row already
read) with one toggle button per part, mirroring the Metronome button's
exact `variant`/`label` pattern. Each toggle calls `persistTrackMute` then
`setEngineTrackMute`, exactly mirroring `toggleMetronome`'s two-call
shape. A one-line hint under the section states the personal scope
("Only you don't hear muted parts — everyone else still does."), matching
the Metronome hint's existing pattern.

`ui.md` changes (already applied, per the confirmed proposal — Playback
View gains the full-mix clarification; Preferences tab gains the Mute
Parts subsection) are the design of record for the rest of implementation.

## Phase Breakdown

### Phase 1: Persisted mute preference module

- T001 — `client/src/track-mute-preference.ts`: `loadStoredTrackMute(songId,
  trackIndex): boolean` and `persistTrackMute(songId, trackIndex,
  muted: boolean): void`, `localStorage`-backed, key shape
  `sync-tab-scroll:mute:<songId>:<trackIndex>`, default `false` (unmuted)
  when no key is present — same default-off-if-absent shape as
  `loadStoredMetronome`. `[artifacts: ui]` [parallel]

### Phase 2: Engine wiring

- T002 — `client/src/playback-engine.ts`: add `setEngineTrackMute(trackIndex:
  number, muted: boolean): void`, mirroring `setEngineMetronome`'s exact
  shape (`if (!state) return;` guard; then
  `state.api.changeTrackMute([state.score!.tracks[trackIndex]], muted)` —
  guard on `state.score` being populated too, since it's only set once
  `scoreLoaded` fires; no-op if absent). Depends on T001 (imports its
  types only, no runtime dependency — safe to build in parallel with T001
  itself, but review after both land).
- T003 — `client/src/playback-engine.ts`: in `ensurePlaybackEngine`'s
  `api.scoreLoaded.on((score) => { ... })` handler (where `state!.score =
  score` is already set), after that assignment, iterate
  `score.tracks` and apply each track's persisted mute preference
  (`loadStoredTrackMute(song.id, track.index)`) via
  `state!.api.changeTrackMute([track], muted)` for every track whose
  stored preference is `true` — mirrors how `metronomeVolume` is applied
  at creation, but deferred to `scoreLoaded` since track objects don't
  exist before then. Depends on T001, T002.

### Phase 3: Preferences UI

- T004 — `client/src/components/SettingsModal.svelte`: add a "Mute parts"
  section to the Preferences tab, directly below the existing Metronome
  toggle block. Iterate `session.availableParts` (already available in
  this component per the existing "Playing: X" derivation at ~L118); one
  toggle button per part, `variant`/`label` pattern mirroring the
  Metronome button (`variant={muted ? 'riot' : 'ghost'}`, label showing
  the part's `instrumentName` + on/off state), calling `persistTrackMute`
  then `setEngineTrackMute` on click — mirrors `toggleMetronome`'s
  two-call shape exactly. Add the hint paragraph ("Only you don't hear
  muted parts — everyone else still does.") below the section, matching
  the Metronome hint's existing markup pattern. Depends on T001, T002, T003.
- T005 — Test-first (Principle VII) CT spec (`SettingsModal.ct.spec.ts` or
  a new harness-driven spec, following this repo's existing CT-testing
  convention for `SettingsModal`): mount with a multi-part
  `session.availableParts` fixture, assert (a) one mute toggle renders per
  part, (b) clicking a toggle flips its own visible on/off state, and (c)
  the persisted preference round-trips (`loadStoredTrackMute` reflects the
  new value after a toggle). Write and confirm this fails before T004's
  UI exists, per Principle VII. Depends on T001; can be written in
  parallel with T004 as its RED half, then confirmed GREEN once T004
  lands. [parallel with T004's initial RED-writing, not with its GREEN]

### Phase 4: Self-mute confirmation

- T006 — Regression test (unit or CT, whichever fits the existing
  `playback-engine`/`SettingsModal` test convention) confirming a
  participant CAN mute their own currently-selected/rendered part — no
  code-level restriction exists anywhere in T001–T004's design, so this
  is a guard against a future accidental restriction being added, per
  `ui.md`'s explicit "no restriction" decision. Depends on T004, T005.

## Open Questions

None — both open questions from the research doc were resolved during
artifact design: self-muting is explicitly allowed (`ui.md`, applied
above); the full-mix-already-plays fact is now documented in `ui.md`'s
Playback View section rather than left implicit.
