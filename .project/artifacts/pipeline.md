---
name: pipeline
status: stable
last_updated: 2026-07-19
---

# Lyrics Extraction Pipeline

## Overview

An offline preprocessing pipeline scoped to **lyrics only**. Tab rendering
is no longer a pipeline concern — the source `.gp` file is published as-is
and rendered live, client-side, by `@coderline/alphatab` (infrastructure.md).
The pipeline's job is to turn a Guitar Pro source file's embedded lyrics
(when present) into what the app serves for a song: a raw `.lrc` file, and
a pointer (`lyricsTrackIndex` + `lyricsLineIndex` + `lyricLineBreaks`) at
which GP track/channel carries the lyrics and how its syllable stream
regroups into lines — not
a precomputed tick map, since the client derives syllable tick positions
live from the same parsed `.gp` file it already loads (datamodel.md,
constitution Principle V). It also validates/publishes the `.gp` file
itself alongside those outputs. The pipeline runs ahead of time, not at
request time; the server only ever serves its output.

This artifact exists separately from infrastructure.md because the pipeline
has its own lifecycle (run per-song, offline, source-controlled inputs/
outputs) distinct from the always-on client/server runtime, and its own
quality bar — the prior implementation's pipeline was where most of the
constitution's "No Dead Architecture" violations were found (stale README
claims, an unused virtualenv, a vendored dependency with its own nested
`.git`, a `package.json` pointing at scripts that didn't exist), so it
warrants explicit specification rather than being a subsection of
infrastructure.md.

## Pipeline Stages

1. **Lyric extraction (primary path)** — read lyrics embedded directly in
   the source `.gp` file (GP's own lyric-line format, attached to a
   track's beats, indexed by lyric line/channel rather than by syllable —
   GP supports multiple simultaneous lyric channels, e.g. a main vocal
   line alongside a harmony line), which carries per-syllable timing but
   doesn't always carry line-break placement. When the GP file has lyrics
   at all, this step always produces `CatalogSong.lyricsTrackIndex` (which
   track's beats carry the lyrics), `CatalogSong.lyricsLineIndex` (which
   channel within those beats to read — the first non-empty one, almost
   always `0`, decided here rather than left for the client to guess),
   and `CatalogSong.lyricLineBreaks` (syllable-count-per-line, so the
   client can regroup the flat per-beat syllable stream it reads live
   from the parsed score into the same lines as `.lrc` — no tick
   positions are published; the client reads those directly off the
   track's beats via alphaTab at render time, datamodel.md) and a derived
   `CatalogSong.lyricsLrc`. Since feedback F001
   (`feedback-lyrics-dispatch-root-cause-f0f6.md`) this step also
   extracts the **raw track-level lyric line** — the un-dispatched
   `<Lyrics dispatched="true"><Line><Text>` CDATA on the lyrics track in
   `score.gpif` (`readRawLyricsLine`, the same lightweight zip+XML read
   used for line breaks) — and publishes it as
   `CatalogSong.lyricsRawLine` (plus `lyricsRawLineStartBar` when the
   line's `<Offset>` is non-zero; omitted otherwise). Songs with no
   track-level line (no lyrics, or true per-beat lyrics) omit the field.
   When the raw line exists, syllable placement for `.lrc` generation is
   done by **re-dispatching it with GP's own semantics** (the shared
   `dispatchLyrics`, chunked by alphaTab's own `at.model.Lyrics`
   chunker) rather than trusting alphaTab's per-beat `beat.lyrics`:
   alphaTab's `applyLyrics` dispatch diverges from Guitar Pro's — and
   for GP7/8 files carrying per-beat `<Lyrics>` XML it never even runs
   (the importer displays the file's hand-placed per-beat lyrics
   verbatim, which can themselves be stale/misaligned author data —
   Creep's end at written bar 72 while the song's vocals end at bar
   89). The complete adopted rule set (tasks-creep-dispatch-3477,
   empirically fitted against user-supplied measure anchors for Creep
   and re-validated on TIRO): a **non-empty chunk** skips *unsingable*
   beats — rests, tie destinations, grace beats, and shift-slide-out
   beats (`note.slideOutType === Shift`) — and lands on the next
   singable beat; a **whitespace-only chunk** (a standalone `+` hold
   marker) consumes one singable beat, emitting nothing; an **empty
   chunk** consumes the very next beat of any kind, emitting nothing.
   Validated ground truths: TIRO "be" at bar 14 beat 1, "this?" at bar
   69 beat 1, bar 102 beat 1 holding "ground"; Creep "You" (of "You
   float") active exactly from tick 59040 (bar 16), "In a beau-ti-ful
   world" in bar 18, bar 19 empty, and the stream's final "here" on
   the song's last vocal note (bar 89). Known accepted residual:
   Creep's "She's / ru- / She" land one bar early around bars 60–62 —
   recorded as a transcription defect in the source tab (a missing
   melisma note in the bars-58–60 vocal run), not a dispatcher rule.
   `walkSyllables` over `beat.lyrics`
   remains the fallback when no raw line exists. GP
   syllable timing is the reason `.lrc` is generated from GP rather than
   taken from lrclib directly: it lets each `.lrc` line carry an accurate
   *end* timestamp — taken from the timing of that line's last syllable —
   not just a start timestamp. End timestamps are encoded as an extra LRC
   line at that time with no lyric text (a blank-content "gap" entry), e.g.:
   ```
   [00:12.340]I'm a creep
   [00:14.870]
   ```
   - If the GP file's lyrics already carry line-break positions, those are
     used directly — lrclib.net is not consulted. **Validated**: this
     placement is not exposed by alphaTab's public API at all — alphaTab
     only surfaces per-beat dispatched syllables, and internally discards
     the raw whole-track lyrics text (with the author's own `\n` line
     breaks, when present) once dispatched per-beat data exists, which is
     the normal case for modern GP7/8 exports. Recovering GP's own line
     breaks requires reading `score.gpif`'s Track-level
     `<Lyrics><Line><Text>` directly from the `.gp` file's zip contents —
     a lightweight raw XML read, separate from using alphaTab for
     beat/tick timing.
   - **Also validated**: GP's own line breaks aren't universal — one of 5
     real files checked (a GP8 export) had zero `\n` line breaks in its
     raw lyrics text despite carrying full lyric content, confirming this
     path is genuinely needed, not just theoretical.
   - If the GP file's lyrics lack line-break placement (syllables present,
     but no marked line boundaries, per the raw-XML check above), lrclib.net
     is queried and its own **timestamps** are used to place line
     boundaries in the GP syllable stream (`extractLyrics`'s
     `parseLrclibLinesWithTimestamps(lrclibResult.syncedLyrics)` +
     `alignLinesByTimestamp`): each lrclib line's `[mm:ss.xx]` timestamp is
     converted to a tick (`buildMsToTick`, the inverse of `buildTickToMs`'s
     tempo-segment walk) and matched to the closest GP syllable-stream tick
     — the gap between consecutive matched indices becomes that line's
     syllable count. This replaced an earlier word-count-proportional
     estimate (`distributeByWordCount`) that assumed lrclib's line text and
     GP's own syllable text agreed word-for-word; they don't always (one
     real song's lrclib line read "And you will be the death of me" vs. GP's
     own "You will be the death of me" — an extra leading word
     word-count-proportional placement had no way to account for, and which
     measurably drifted line timing). Tick-proximity matching is immune to
     this kind of textual disagreement since it never compares text at all.
     The actual start/end timestamps written into the `.lrc` are still
     always taken from GP's own per-syllable timing (`buildLrc`), never
     from lrclib's timestamps directly — only the *line-boundary counts*
     come from this timestamp-alignment step. `lyricLineBreaks` records the
     resulting per-line syllable counts (whichever source decided the line
     breaks) so the client can regroup the same way at render time.
2. **Lyrics fallback (lrclib.net)** — only runs when the GP file has no
   embedded lyrics at all (distinct from stage 1's narrower lrclib use,
   which only supplies line-break positions for GP lyrics that already
   exist). In this fallback, lrclib.net's synced lyrics become
   `CatalogSong.lyricsLrc` directly, end timestamps included. **None of
   `lyricsTrackIndex`, `lyricsLineIndex`, or `lyricLineBreaks` is produced
   in this fallback** — there's no GP track to point at, and lrclib's data
   is word/line-level,
   not GP's per-syllable timing. A song can therefore end up in any of
   three states: both `lyricsLrc` and the GP-track pointer set (GP-embedded
   lyrics, with or without lrclib-assisted line breaks), `lyricsLrc` only
   (lrclib fallback, no GP lyrics at all), or neither (no lyrics found
   anywhere). See datamodel.md and ui.md, which gate the primary lyrics
   view and the in-tab overlay independently for exactly this reason.
3. **Publish** — write the validated `.gp` file (`CatalogSong.gpFilePath` —
   one multi-track file per song, datamodel.md) plus whatever lyrics
   artifacts were produced (`.lrc`, `lyricsTrackIndex`, `lyricsLineIndex`,
   `lyricLineBreaks`) to the location the server reads the catalog from.
   No tab rendering or
   tick-map computation happens here or anywhere else in the pipeline — the
   published `.gp` file is rendered live, client-side, by alphaTab
   (infrastructure.md), which also derives lyric syllable tick positions
   directly from it.

**Resolved**: a single consolidated script runs extraction → fallback →
publish in sequence for a song, rather than separate per-stage scripts
driven by a shell orchestrator. The old pipeline's 4-5-script-plus-shell
structure matched a much heavier pipeline (render, extract, fallback,
publish, each with real independent tooling); at 2-3 lightweight steps
with no heavy per-stage tooling of its own (`@coderline/alphatab` plus a
small XML read, per Dependencies below), separate files/processes would
add indirection without a real benefit. Name the script for what it does
(e.g. `extract-lyrics`), not a leftover from the render-era naming.

### Legacy GP3–5 Raw-Line Extraction

GP7/8 files carry the raw track-level lyric line in `Content/score.gpif`
(read via the zip+XML mechanism in Dependencies, below). Legacy GP3–5
binary files (`FICHIER GUITAR PRO…` header — e.g. the catalog's
Supermassive Black Hole) have no zip and no gpif; their lyrics live in
the GP5 lyrics block near the file header: the lyric track number
followed by five `{start-measure int32, length-prefixed string}` lines
(`gp5-raw-lyric-line-extraction`). The pipeline reads line 1 of that
block with a small binary parse (no new dependency) and publishes the
same `CatalogSong.lyricsRawLine`/`lyricsRawLineStartBar` `meta.json`
fields the GP7/8 path writes — everything downstream (chunking, the
shared GP-semantics dispatcher, the client overlay, `.lrc` generation)
is format-agnostic past that point. A GP3–5 file with no lyrics block
(or an empty line) simply omits the field, keeping the
`beat.lyrics`-trusting fallback exactly as for any other song without a
raw line.

## Source Format

Guitar Pro (`.gp`) files are the only source format read by the pipeline.
GP files carry fingering, string-assignment, track-name, and embedded-lyric
data that other formats (e.g. MIDI) can't represent — the lyric extraction
stages depend on this, and the published `.gp` file is what the client's
alphaTab instance renders directly (infrastructure.md), so GP fidelity
matters end-to-end, not just during preprocessing. A prior version of this
pipeline read MIDI as its source format; that approach is fully replaced,
not kept as a fallback or alternate path.

## Inputs & Outputs On Disk

**Resolved**: one directory per song (e.g. `catalog/<song-slug>/`)
containing the source `.gp` file — which is what gets published/served
as-is, no separate transformed copy — together with its generated `.lrc`
and a small metadata file (e.g. `meta.json`) holding `lyricsTrackIndex`,
`lyricsLineIndex`, `lyricLineBreaks`, and (when a raw track-level lyric
line exists) `lyricsRawLine` / `lyricsRawLineStartBar`. "What's the current output for
song X" is just "look in that song's directory"; adding or removing a
song is one directory operation, not a cross-reference between separate
input and output trees. No intermediate/scratch output is written to this
tree — the prior pipeline's stale leftover `.mid` files (from the
no-longer-used MIDI approach) are the cautionary example this avoids.

**Optional recording assets** (`sync-tabs-to-real-audio`). A song
directory may additionally hold a `recording.mp3` — an operator-supplied
real recording of the song — alongside a `syncPoints` array in the same
`meta.json`, holding alphaTab's own `FlatSyncPoint` shape verbatim
(datamodel.md). Both are optional and independent of every existing
pipeline stage: the pipeline neither generates nor validates them, and a
song without them behaves exactly as today. A `recording.mp3` present
*without* `syncPoints` is treated as recording-less by the loader, since
an unanchored recording can't be aligned to the score at all.

For the MVP, sync points are authored **externally** — alphatab.net hosts
a Media Sync Editor whose export is the same `FlatSyncPoint` structure
(`Score.exportFlatSyncPoints()`), so the operator's hand-off is a
copy-paste into `meta.json` rather than a translation. In-app sync-point
authoring is deliberately out of scope here and is a natural later
addition to the phase-2 in-app authoring surface (infrastructure.md).
[OPEN: confirm the Media Sync Editor's exported JSON is byte-compatible
with the `FlatSyncPoint[]` we store, rather than a near-miss needing a
small adapter — verify against a real export during the plan's diagnosis
phase.]

Licensing of a supplied recording is the operator's responsibility, the
same posture the project already takes toward song files themselves; the
existing consent gate (below) governs public serving unchanged.

A song's directory can additionally live one level deeper, under a
catalogue directory (`catalog/<catalogue-slug>/<song-slug>/`,
`catalog-activation-key-access` — datamodel.md's `Catalogue`) — the
pipeline's extraction/fallback/publish logic is completely unaware of
this nesting and needs no code change for it: an operator just passes
`catalog/<catalogue-slug>` as `<catalogRoot>` instead of `catalog`
directly. A song with no catalogue directory (today's existing flat
layout) belongs to the implicit `"default"` public catalogue.
`create-catalogue` (below) is the only new pipeline surface this feature
adds.

## Consent Recording (Public Deployment Only)

Additive, optional step in the same one-directory-per-song model above —
not a second ingestion path. The pipeline's extraction/fallback/publish
logic (Pipeline Stages, above) is unchanged and has no awareness of
consent at all; a song intended for an operator's public deployment
(infrastructure.md's Song Consent Gate) additionally gets a small
companion CLI invocation writing the Consent Record (datamodel.md) into
its existing `catalog/<song-slug>/` directory, alongside the `.gp`/`.lrc`/
`meta.json` outputs already documented below. A song's directory with no
consent record behaves exactly as it does today (fully supported, no
gate) unless the operator has opted into `REQUIRE_SONG_CONSENT`.

## Catalogue Creation (Public Deployment Only)

Additive, optional step, same operator-driven CLI model as Consent
Recording above — not a web form (constitution Principle V spirit: no new
mechanism where the existing shape already covers it). A small CLI,
`create-catalogue <catalogRoot> <catalogue-slug> <name> <public|private>
[key]`, writes:
- for a public catalogue: nothing beyond the directory itself existing —
  presence of a catalogue directory with no `catalogue.json` already
  means public (datamodel.md's `Catalogue.public`);
- for a private catalogue: `catalogue.json` (datamodel.md's Catalogue
  Activation Key) into `catalog/<catalogue-slug>/`, computing the salt
  and `crypto.scrypt` hash from the operator-supplied `key` argument at
  creation time — the raw key is never written anywhere; the CLI's own
  output is the only place the operator sees it again, to relay to
  whoever should be able to unlock that catalogue.

Run once per catalogue, before `extract-lyrics`/`record-consent` are ever
pointed at its subdirectory — creating the catalogue directory is a
prerequisite for populating it with songs, not the other way around.

**Additive entry point as of Phase 2 (in-app authoring, constitution
v1.6.0):** an authenticated owner can also create a catalogue and add songs
from the web UI (infrastructure.md's In-App Authoring section), writing the
same on-disk shape this CLI writes — one format, two entry points. This
CLI is **not replaced or deprecated**: it remains the only path for a
fresh or self-hosted deployment with no account layer configured, and
stays the simpler choice for an operator seeding a catalog in bulk.

## Dependencies

The prior pipeline vendored a third-party GP-to-tab conversion tool as a
subdirectory carrying its own nested `.git` (a direct violation of the
constitution's Quality Standards). That tool is no longer needed at all —
tab rendering moved entirely to the client via `@coderline/alphatab`
(infrastructure.md), so the pipeline has no rendering dependency to vendor
or install. **Resolved, validated against 5 real `.gp` files**: no separate
GP-parsing library is needed. Two lightweight mechanisms cover the whole
extraction, both confirmed working directly against real files:
`@coderline/alphatab` itself (already a project dependency, and usable in
Node, not just the browser) for per-beat lyric text and tick/timing data;
and a plain zip + XML read of `score.gpif`'s Track-level
`<Lyrics><Line><Text>` for GP's own line-break placement, which alphaTab
doesn't expose on its public API. No new heavy dependency to add or
vendor — this closes the open question rather than just narrowing it.

## Constitution Compliance

Per "No Dead Architecture" (constitution.md principle II): this directory
contains only the current GP-based approach. No unused virtual
environments, no scripts referenced by `package.json` that don't exist on
disk, no README claims about preserved/reference directories that aren't
actually present, no leftover intermediate files from a prior approach
committed to the repo. `package.json`'s `name` and `scripts` must describe
what's actually here (the prior pipeline's `package.json` was still named
`tab-renderer` with a `render` script pointing at a file that no longer
existed).

## Re-running The Pipeline

The pipeline only needs to re-run on new song ingestion or a change to the
lyric-extraction logic itself (e.g. fixing a line-break heuristic). It no
longer needs to re-run when alphaTab's rendering changes (a dependency
bump, a new alphaTab version) — rendering happens live at request time in
the client, not offline in this pipeline, so an alphaTab upgrade is a
client-side concern only (infrastructure.md). Published output
(`.lrc`, the `lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks`
pointer, the validated `.gp` copy) is therefore a build artifact
regenerable from source `.gp`
files at any time, not hand-maintained source-of-truth.
