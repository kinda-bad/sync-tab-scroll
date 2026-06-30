---
name: pipeline
status: draft
last_updated: 2026-06-30
---

# Tab Rendering Pipeline

## Overview

An offline preprocessing pipeline that turns a Guitar Pro source file into
everything the app serves as static assets for a song: per-part tab SVGs at
multiple density levels, a `LayoutMap` per SVG (beat → coordinate), and
lyrics data in both its raw and pipeline-derived forms (`lyricsLrc`,
`LyricBeatMap` — see datamodel.md). The pipeline runs ahead of time, not at
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

1. **Render** — read the source `.gp` (Guitar Pro) file per part, produce a
   tab SVG per density variant (see `CatalogPart.svgVariants` in
   datamodel.md — multiple bars-per-row layouts so a part can be re-rendered
   denser/sparser without recomputing beat alignment from scratch) plus a
   `LayoutMap` for each variant (beat → x/y/width/row in SVG coordinates).
   Uses `@coderline/alphatab` for SVG generation.
2. **Lyrics sourcing** — look up synced lyrics for the song from lrclib.net,
   producing the raw `.lrc` file (`CatalogSong.lyricsLrc`). If lrclib has no
   match, the song has no lyrics — `lyricsLrc` and `lyricBeatMap` both stay
   null, and the lyrics pseudo-part isn't selectable for that song (ui.md).
3. **Lyric beat-mapping** — derive `LyricBeatMap` (syllable-level, beat-
   positioned) from the source `.gp` file's own timing, not from the `.lrc`
   file's coarser line-level timestamps. This keeps lyric-to-beat alignment
   consistent with however the GP file defines timing, independent of
   lrclib's granularity (datamodel.md's Normalization Rules).
4. **Publish** — write all generated assets (SVGs, layout maps, `.lrc`,
   `LyricBeatMap`) to the location the server reads the catalog from.

Each stage is a separate script/step, run in order by a single orchestration
entry point — not one undifferentiated script. [OPEN: exact script
boundaries and orchestration mechanism — keep a shell script driving
per-stage Node/Python scripts, or consolidate into one tool? The prior
implementation used 4-5 separate scripts driven by a shell script; that
stage boundary was sound, but file/script naming should describe what each
stage *does*, not survive as leftover names from an earlier MIDI-based
approach.]

## Source Format

Guitar Pro (`.gp`) files are the only source format read by the pipeline.
GP files carry fingering, string-assignment, and track-name data that other
formats (e.g. MIDI) can't represent, which the tab rendering depends on. A
prior version of this pipeline read MIDI as its source format; that
approach is fully replaced, not kept as a fallback or alternate path.

## Inputs & Outputs On Disk

[OPEN: directory layout for pipeline inputs (source `.gp` files) and
outputs (rendered SVGs, layout maps, lyrics data) — needs a structure that
makes "what's the current output for song X" unambiguous, with no
leftover artifacts from intermediate runs checked in. The prior pipeline
left stale `.mid` files in both an input directory and an intermediate
output directory from the no-longer-used MIDI approach; whatever structure
this pipeline uses, intermediate/scratch output should not be committed.]

## Dependencies

[OPEN: the prior pipeline vendored a third-party GP-to-tab conversion tool
as a subdirectory carrying its own nested `.git` (a direct violation of the
constitution's Quality Standards). Decide: is an equivalent tool still
needed given `@coderline/alphatab` handles rendering directly, and if a
third-party tool is needed, is it added as a real package dependency, a
proper git submodule, or vendored as plain committed files with provenance
noted — never silently nested.]

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

[OPEN: when does the pipeline need to re-run for a song — only on new
song ingestion, or also when `@coderline/alphatab`'s rendering output
changes (e.g. a dependency bump)? Affects whether published output is
treated as a build artifact (regenerable, not source-of-truth) or as
checked-in source-of-truth that's manually updated.]
