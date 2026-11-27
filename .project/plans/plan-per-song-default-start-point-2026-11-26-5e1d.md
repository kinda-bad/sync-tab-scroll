---
status: approved
branch: feat/per-song-default-start-point
created: 2026-11-26
features: [per-song-default-start-point]
surfaced-defects: []
---

# Plan: Per-song default start point

## Goal

Let a song's `meta.json` name the bar a run-through starts at, so selecting
the song (and every Stop afterward) parks everyone at that bar instead of
bar 1. The host can still click anywhere, including back to bar 1, before
pressing Start. First user: Smashing Pumpkins – 1979, bar 9.

## Scope

**In:**
- An optional `defaultStartBar` (1-based bar number, positive integer) in
  `meta.json`, read by `catalog-loader.ts` and published on `CatalogSong`.
  An invalid value is logged and dropped; the song still loads.
- Server `song-select` resets `playbackState.tickPosition` to 0 on a
  genuine song change, so one song's start point never leaks into the next.
- The host's client converts the bar to a playback tick and seeds it with
  the existing `playback-control seek`.
- `correctDrift`'s stopped-state reset parks at `playbackState.tickPosition`
  (not literal 0), so the seeded position, and any host click while stopped,
  is visible to everyone before Start.
- Specs (`datamodel.md`, `ui.md`) and a hand-patch note in
  `docs/catalog-patches.md`.

**Out:**
- Any new message type or Session field. No UI for editing the field: it is
  set by hand, like the part names.
- Pipeline support. `extract-lyrics` rewrites `meta.json` from scratch, so
  the field has to be reapplied after a regenerate (documented).
- 1979's recording. Recording-mode playback from the seeded tick relies on
  alphaTab's own backing-track mapping and can't be checked end to end until
  1979 has a `recording.mp3`.

## Technical Approach

**Which state is seeded: `PlaybackState.tickPosition`.** `runStartFlow`
(server) flips status to `running` and nulls `lobbyCursorTick`; it never
touches `tickPosition`. On the client, `correctDrift`'s running branch seeks
to `playbackState.tickPosition` and plays. So `tickPosition` is where
playback actually starts. `lobbyCursorTick` is only a marker (and a
Spotlight force-follow target), so seeding it would change nothing about
where playback begins.

**Bar → tick happens on the host's client.** The server never parses the
`.gp`, so it can only carry the bar number. Once the host's engine is ready
for playback, `defaultStartTick()` maps the bar through alphaTab's own
`api.tickCache.getMasterBarStart(masterBar)` (the playback tick of the bar's
first occurrence, repeat-aware; Principle V), falling back to
`masterBar.start`. An out-of-range bar yields no seed.

**When the host seeds.** While stopped, with `playbackState.tickPosition`
still 0, once per "stopped stretch" per song: the arm is consumed by every
client at that moment (so a participant who later becomes host doesn't
re-seed over the old host's choice) and re-armed whenever the session leaves
`stopped`. That gives: song select → seed; Stop (or early-stop) → seed again;
host click (to bar 1 or anywhere) → not overridden; engine rebuild (part or
source switch) → not re-seeded; host reload at a non-zero position → not
re-seeded.

**Stopped-state park.** Today `correctDrift` resets every client to tick 0 on
every store update while stopped, which would stomp the seed (and already
stomps a host click: the click goes to the server, but the cursor snaps back
to bar 1 until Start). It now parks at `playbackState.tickPosition`, and only
when that target changes (or the engine first becomes ready), not on every
store update. Edge-triggering keeps a host click from being snapped back
before its debounced seek round-trips, and avoids the backing-track
re-seek loop (alphaTab's tick↔time conversion doesn't round-trip exactly)
at a mid-song target. A Stop still sends everyone to 0 first, as before.

**Recording mode.** No new code: the start branch assigns `api.tickPosition`
and alphaTab maps it through the score's sync points to the recording time.

**Lyrics ticker.** Both lyric views are position-driven (the overlay picks
the last syllable at or before the tick; the full-lyrics view matches lines
by `currentTime`), and the park fires `playerPositionChanged`, so a
mid-song start shows the right place without changes. A CT check covers it.

## Phase Breakdown

### Phase 1 — Contract [artifacts: datamodel, ui]
- [x] `datamodel.md`: `CatalogSong.defaultStartBar`; note `song-select` resets
      `PlaybackState.tickPosition`.
- [x] `ui.md`: default start point behavior; host seek works while stopped.

### Phase 2 — Loader and server (test-first)
- [x] `catalog-loader` reads/validates `defaultStartBar`.
- [x] `song-select` resets `playbackState.tickPosition` on a genuine change.

### Phase 3 — Client (test-first)
- [x] `defaultStartTick()` pure helper.
- [x] `correctDrift` parks at `playbackState.tickPosition`, edge-triggered.
- [x] Host seeding in `playback-engine.ts`.

### Phase 4 — Data and docs
- [x] Set `defaultStartBar: 9` in 1979's `meta.json` (catalog is gitignored).
- [x] `docs/catalog-patches.md` section.

## Revision 2026-11-27 — session start marker

User's answers: bar 9 for 1979; "as long as the default start marker hasn't
been cleared for the session, stop should return there. host should control
it. it should be clearable." Changes from the approach above:

- **The start position is a session-level start marker,
  `Session.startMarkerBar`** (a bar, held in server state so every client
  agrees). A genuine `song-select` sets it from the song's
  `defaultStartBar` (null when absent); a same-song re-select leaves it, so
  a cleared marker stays cleared. New host-only `start-marker-set { bar }`
  sets it (validated: whole number ≥ 1) or clears it; clearing while
  stopped also resets `playbackState.tickPosition` to 0. Settings → Session
  tab gets a "Start marker" readout for everyone and host-only
  input/Set/Clear, mirroring the early-stop control (in bars, not ticks).
  The early-stop scrim isn't reused: it's a fixed gradient, not positioned
  at a tick, so it has nothing to offer a marker.
- **The seeder follows the marker, not the song field**: one seek per
  (song, marker) per stopped stretch, so song select, every Stop, and a
  marker change while stopped all move everyone there; a cleared marker
  never seeks. The "only from tick 0" condition is gone (a marker change
  must move a non-zero position); the cost is that a host reload while
  stopped returns to the marker.
- **The stopped park is level-triggered again**, like the original reset,
  with a 35 ms tolerance. Edge-triggering missed alphaTab's late seek event
  after a Stop's `pause()`, which left the cursor (and, broadcast as a host
  seek, the session's stopped position) on a stray tick. Two companions:
  - a host seek is broadcast only after alphaTab's `beatMouseDown` (a real
    click), so internal seek events never reach the server;
  - the host holds its clicked tick as its local park target until the
    server echoes it, so the level-triggered park doesn't snap the click back.
- Host clicks while stopped moving everyone's cursor: kept (the user: "host
  should control it"); `ui.md` says so.

## Complexity Tracking

None. One optional field, one helper, a retargeted reset, and a small
seeding gate; no new messages or session state.

## Open Questions

- ~~Bar 9 for 1979~~: confirmed by the user (2026-11-27).
- ~~Stop returns to the default start~~: yes, while the session's start
  marker is set; once cleared, bar 1 (2026-11-27).
- Recording-mode start at bar 9 is unverified on 1979 itself until it has a
  recording (verified on the skewed fixture).
- Should the pipeline keep hand-set `meta.json` fields (`defaultStartBar`,
  `syncPoints`) when it regenerates the file? Unanswered.
