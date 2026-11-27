---
status: approved
branch: fix/lyrics-timing-and-repeats
created: 2026-11-27
features: []
surfaced-defects: []
---

# Plan: Fix lyrics time base (lrclib LRC) and lyrics after repeat signs

## Goal

Two lyric-timing bugs, both "lyrics compared against the wrong timeline":

1. **lrclib LRC times are recording time, compared against tab time.** The
   lyrics-part view (full lyric sheet, active line, gap indicators) compares
   each `.lrc` line's time with alphaTab's `playerPositionChanged`
   `currentTime`. That is the tab's own synth timeline in both playback
   modes (in backing-track mode alphaTab converts the audio position through
   the sync points, `mainTimePositionFromBackingTrack`). A tab-sourced
   `.lrc` (`lyricsTrackIndex` set) is generated from tab ticks, so it is
   already tab time. An lrclib-sourced `.lrc` (`lyricsTrackIndex: null`) is
   studio-recording time. For a song with a recording and `syncPoints`
   (Lazy Eye), convert each line through the sync points.
2. **Lyrics after a repeat sign run early.** Syllable ticks are written
   (notation) ticks; the playback tick keeps counting through the repeat.
   The in-tab ticker and the pipeline's `.lrc` both drift by the repeated
   length after the first repeat (Dirty Little Secret: 3 bars early from
   bar 94 on, and nothing shown again for the second pass of bars 90–92).

Side fix: the tab-sourced `.lrc`'s line text is the raw GP lyric line
(`+` holds, `-` syllable joins), shown verbatim by the lyric sheet.

## Scope

**In scope:**
- Client: convert lrclib `.lrc` times to tab time via the song's
  `syncPoints` (both synth and recording mode), feeding the active-line
  match and the gap indicators from the same converted list.
- Client: place the ticker's syllables and measure markers on the playback
  timeline via alphaTab's `MidiTickLookup.masterBars` (`api.tickCache`), so
  a repeated bar's syllables show again on each pass.
- Pipeline: generate `.lrc` from the same repeat-aware placement.
- Client: strip `+` holds and join `-` syllables in the lyric sheet's line
  text when the `.lrc` line text came from the raw GP line.
- Spec updates: ui.md, pipeline.md, infrastructure.md, datamodel.md.

**Out of scope:**
- Regenerating any catalog `.lrc` (catalog is read-only here; songs that
  need it are listed in the tasks file).
- Songs with neither a lyric track nor a recording (Cracker – Low,
  Supermassive Black Hole): there are no anchors to convert lrclib time to
  tab time. Left unchanged and documented.
- `alignLinesByTimestamp`'s lrclib-to-tick heuristic (line-break placement
  for tab-sourced songs with a single raw line) and `computeGapTiming`'s
  written-order bar walk: both approximate, neither is in either bug.

## Technical Approach

- **LRC origin**: already on the wire. `CatalogSong.lyricsTrackIndex` is
  null exactly when the `.lrc` came from lrclib (pipeline extract-lyrics),
  and `CatalogSong.syncPoints` already reaches the client. No new field.
- **Conversion**: alphaTab's `MidiFileGenerator.generateSyncPoints(score)`
  yields the same `BackingTrackSyncPoint` list (`syncTime` recording ms,
  `synthTime` tab ms) the player uses. The flat points are applied to the
  score only for that call and the score's previous sync points restored,
  so a synth-mode score stays untouched. A pure
  `recordingMsToTabMs(points, ms)` mirrors `mainTimePositionFromBackingTrack`:
  linear inside each segment, the first segment extrapolated before the
  first point, clamped to the last point's synth time after it (alphaTab's
  last point is the song end, so its own tail maps to the end too).
- **Repeat mapping**: shared, pure `unrollSyllables(syllables,
  masterBarStarts, plays)` where `plays` is alphaTab's playback order
  (`MidiTickLookup.masterBars`: one entry per played bar, repeats and
  alternate endings expanded). Each syllable is re-emitted once per play of
  its bar at `play.start + (tick - masterBar.start)`. GP's dispatch assigns
  one syllable set per written bar (`dispatchLyrics` walks beats in written
  order), so a repeated bar shows the same syllables on each pass.
  Client: `api.tickCache` after `midiLoaded`. Pipeline: the
  `MidiFileGenerator` it already runs for the tempo map.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file.

**Phase 1 — Repeat-aware placement** (shared + client ticker + pipeline).
**Phase 2 — lrclib time base** (client lyric sheet + gaps).
**Phase 3 — Raw-line text cleanup** (client lyric sheet).
**Phase 4 — Specs and verification.**
**Phase 5 — Ticker follow-ups (user request, 2026-11-27).** Highlight the
current bar's measure marker (brighter, `--ink`), following the playback
order; clear the sung syllable's highlight when playback enters a bar that
starts no syllable (no per-syllable end times, per the user: a bar that
only sustains a held or tied syllable counts as wordless). Bar numbers
appear only in the in-tab ticker's measure markers; the lyric sheet shows
none.
**Phase 6 — Top ticker takes its own space (user request, 2026-11-27).**
Reserve the strip's space at the top of the tab view (the overlay
container moves first in the tab view's flow and is sized to the strip's
bottom edge) and set alphaTab's `player.scrollOffsetY` to minus that edge,
so auto-scroll lands the current row beneath the strip. A ResizeObserver
keeps both in step with the strip's height. The tab stays in the page's
own scroll (an inner scroll container would also move the Lobby, which
shows the tab under its own content). Bottom position unchanged.

## Open Questions

- None blocking. lrclib's timestamps are assumed to match the song's
  `recording.mp3` (both the studio recording); not verified by ear.
