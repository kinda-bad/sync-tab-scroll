---
status: approved
branch: feat/per-song-default-start-point
created: 2026-11-27
features: [default-to-recording-source]
surfaced-defects: []
---

# Plan: Default to the recording when a song has one

## Goal

Selecting a song that ships a recording puts the session on the recording
source; a song without one stays on synth. The host can still choose synth.

## Scope

**In:** `song-select` sets `Session.playbackSource` from the new song
(`isRecordingCapable`) on a genuine change; specs (`datamodel.md`, `ui.md`,
`infrastructure.md`) and the shared type's doc comment.

**Out:** any new message or field; per-participant source (still rejected,
`research-recording-mode-drift-2026-07-19-b7c2.md`); remembering a host's
synth choice across songs.

## Technical Approach

`song-select` already reset the source on every genuine song change
(unconditionally to synth). It now resets it to the new song's default:
`isRecordingCapable(song) ? 'recording' : 'synth'`. A new session has no
song, so it starts on synth and its first song-select applies the default;
nothing changes in `session-create`.

**Host's synth choice is per song, not kept across songs.** Nothing in the
code or specs argues for carrying it over: the source was already reset on
every song change, and a choice about one song's recording says nothing
about another's. A same-song re-select is a no-op, as before, so it keeps
the host's choice.

**Interplay checked:**
- Count-in: `applyPlaybackSettings` already forces `countInVolume` to 0 in
  recording mode, so a recording-defaulted song starts with no count-in even
  with the host's toggle on; the toggle applies again on synth.
- Start marker: covered by the recording-mode default-start CT test; the
  host's client seeks to the marker and alphaTab maps it through the sync
  points. Because the default is set in the same `song-select` broadcast,
  each participant's first engine is already a backing-track engine; no
  rebuild, so no extra seek.

## Phase Breakdown

### Phase 1 — Contract [artifacts: datamodel, ui, infrastructure]
- [x] Record the reversal and the per-song rule in the three specs.

### Phase 2 — Server (test-first)
- [x] `song-select` defaults the source from the new song.

### Phase 3 — Client check
- [x] CT through the real App: a recording-defaulted session builds a
      backing-track engine, ignores the count-in, and still offers Synth.

## Complexity Tracking

None: one expression in `song-select`.

## Open Questions

None.
