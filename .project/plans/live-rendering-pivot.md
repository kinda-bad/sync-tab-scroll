---
name: live-rendering-pivot
status: draft
last_updated: 2026-06-30
---

# Plan: Live Client-Side Rendering Pivot

## Motivation

The old pipeline pre-rendered tab SVGs offline and shipped a separately
computed `LayoutMap` for cursor positioning. The cursor overlay (the exact
beat being played, not generic scrolling) could drift from the actual staff
because it was reconstructed from a `LayoutMap` computed in a different pass
than the one that drew the staff. Rendering the tab live, client-side, via
`@coderline/alphatab` — the same render pass that draws the staff also drives
the cursor — eliminates this reconciliation-bug class structurally, not by
patching the sync logic.

## Decisions made this session

1. **Lyrics-part participants run a headless alphaTab instance.** They render
   no visible tab, but alphaTab still owns their playback clock, drift
   correction, and metronome/count-in audio — the same mechanism as
   instrument participants, not a second bespoke sync path. This keeps "one
   sync mechanism, one audio engine" true for every participant regardless of
   selected part.
2. **Canonical position unit switches from beats to alphaTab's native units**
   (MIDI ticks for score position, seconds for wall-clock/audio sync). This
   removes a conversion layer at the alphaTab boundary since alphaTab's clock,
   `tickPosition`/`timePosition`, and cursor are all native-unit. It's a real
   schema change: `PlaybackState.beatPosition`, `LyricSyllable.beatPosition`,
   and `Session.lobbyCursorBeat` all move off "beats."
3. **`@coderline/alphatab` moves from a pipeline-time devDependency to a
   client runtime dependency**, along with a SoundFont asset for audio
   playback. Both are loaded/shipped by the client, not the server.
4. **Render settings (layoutMode, staveProfile, rhythmMode, suppressed
   notation elements, `display.resources` palette) move from the pipeline
   (`01-render-svg.mjs`-equivalent) into infrastructure.md**, since they're
   now a client-runtime concern (how the client initializes alphaTab), not an
   offline pipeline stage.

## File-by-file changes

### `pipeline.md`
- Rewrite Overview: pipeline's only remaining output is lyrics data
  (`lyricsLrc` + `LyricBeatMap`, position field renamed per decision 2). It no
  longer renders tabs, produces SVGs, or produces a `LayoutMap`. The `.gp`
  source file itself is published as the asset the client loads into
  alphaTab at runtime.
- Remove **Stage 1 (Render)** entirely. Renumber lyric extraction (primary)
  and lyrics fallback as stages 1–2.
- Stage 2 (was 3, "Lyrics fallback"): unchanged in substance, renumber only.
- **Publish** stage: drop SVG/LayoutMap outputs; publishes the `.gp` file
  (or a validated copy of it) + `.lrc` + `LyricBeatMap`.
- **Dependencies `[OPEN]`**: resolve — the vendored GP-to-tab conversion tool
  is no longer needed; the pipeline still needs *a* way to parse GP files for
  embedded lyrics, but that's a much smaller dependency than a full rendering
  tool. Replace the open question with this narrower one, or resolve it if a
  library is already known.
- **Re-running the pipeline `[OPEN]`**: reshape — re-render-on-alphaTab-bump
  is now moot (rendering isn't pipeline's concern), so this only needs to
  re-run on new song ingestion or lyric-extraction logic changes. Likely
  resolvable to a direct answer rather than staying open.
- **Resolve the stale comment/code contradiction** carried over from the old
  `01-render-svg.mjs` (comment claims "keep EffectTempo," suppression list
  actually hides it) as part of writing the render-settings section that
  moves to infrastructure.md — decide the actual intended behavior once, here.
- Inputs & Outputs `[OPEN]`: narrow to just `.gp` sources + `.lrc`/beat-map
  outputs (no SVG/layout output directories to define).

### `datamodel.md`
- **Remove `LayoutMap` entity entirely** (including implied `MeasureLayout`).
- **`CatalogPart`**: remove `svgByDensity` and `layoutMapByDensity`; replace
  with a single `gpFilePath` (or similar) the client passes to alphaTab.
  Density-variant rendering (bars-per-row) becomes a client-side alphaTab
  setting, not a set of pre-rendered variants — one file serves all
  densities.
- **Position unit migration (decision 2)**: `PlaybackState.beatPosition` →
  native alphaTab position field(s); `LyricSyllable.beatPosition` → same;
  `Session.lobbyCursorBeat` → same. Update every cross-reference to "beat" in
  Normalization Rules and other entities' Notes columns.
- **`PlaybackState.serverTimestamp`**: clarify in Notes that this now drives
  periodic correction of alphaTab's `tickPosition`/`timePosition` specifically
  (not a generic "reconcile local timer" description).
- **Normalization Rules**: rewrite the density-independence paragraph — it
  currently justifies beats via "same beat maps across differently-dense SVG
  renders"; with one `.gp` file per part and alphaTab handling density
  live, this justification changes shape (position is still render-agnostic,
  but for a different reason — alphaTab computes screen position from score
  position at render time, there's no stored per-density map to reconcile
  against at all). Remove the "`LayoutMap` is not an independent schema
  choice" paragraph entirely — there's no `LayoutMap` to justify.
- Note explicitly that lyrics-part participants (decision 1) still read
  `Session.playbackState` the same way instrument participants do — their
  headless alphaTab instance is the thing that consumes it, not a separate
  code path.

### `ui.md`
- **Playback View**: rewrite "synchronized scroll of that part's tab SVG" to
  describe live alphaTab rendering with its native cursor overlay
  (`.at-cursor-bar`/`.at-cursor-beat`) as the thing showing the exact beat
  being played — not a separately computed overlay.
- **Metronome**: rewrite "optional visual + audible metronome" to reference
  alphaTab's native metronome/count-in (`metronomeVolume`, `countInVolume`),
  and note explicitly that lyrics-part participants get this from their
  headless alphaTab instance (decision 1) — same audio, no tab visible.
  Ties in with the corresponding infrastructure.md sync-model section.
- **Loading state**: rewrite "tab SVG load is async per part" — there's no
  separate SVG asset; loading now means alphaTab initializing and rendering
  the `.gp` file (plus SoundFont load for audio). Lyrics-part participants
  also have a load step now (headless alphaTab init), not "ready as soon as
  `.lrc` is fetched" as currently written.
- Leave the brand.md pointer sentence as-is — theming mechanism (CSS classes
  for cursor/highlight vs. `display.resources` API for notation glyphs) is an
  infrastructure/rendering concern, not a ui.md concern; not touching
  brand.md in this pass.

### `infrastructure.md`
- **Overview**: flip the "Tab SVGs are not rendered at runtime" claim — tabs
  now render at runtime, client-side, via alphaTab from the published `.gp`
  file. The offline pipeline's scope shrinks to lyrics only.
- **Stack**: add `@coderline/alphatab` as a client runtime dependency, and
  note the SoundFont asset the client loads for audio playback (real,
  multi-MB asset — affects load-state design, not just a stack bullet).
- **Session & Real-Time Sync**: rewrite the "clients reconcile... snapping
  when drift exceeds a threshold" language to describe the adopted model —
  playback start is synchronized across participants, each client's alphaTab
  instance (visible or headless, per decision 1) drives its own local
  clock/cursor, and the server's `PlaybackState.serverTimestamp` is used to
  periodically correct `tickPosition`/`timePosition` rather than continuously
  driving playback from the server. This is the section most load-bearing to
  the whole pivot — write it precisely.
- **Tab Rendering Pipeline** section: rename/reframe (it's no longer "point
  to pipeline.md for rendering," since rendering isn't pipeline's job). New
  content: describes the client-side alphaTab render settings — layoutMode
  (Page, auto-wrap, no `barsPerRow` pin), staveProfile, rhythmMode
  (`ShowWithBars` explicit, not `Automatic`), suppressed notation elements,
  and the `display.resources` palette API for theme colors (replacing the
  old sentinel-color-then-CSS-fill-match hack, which is no longer needed
  since live SVG is directly CSS-reachable and resources can be set at
  render time). Still points to pipeline.md for the lyrics-only stages that
  remain there.

## Sequencing

1. `datamodel.md` first — it's the schema every other artifact's language
   depends on (position unit rename, `LayoutMap`/`svgByDensity` removal).
2. `pipeline.md` — scope shrink follows directly from datamodel's field
   removal.
3. `infrastructure.md` — sync model + render settings depend on datamodel's
   final field names.
4. `ui.md` — describes user-facing behavior; last since it's the least
   structurally coupled to the others.
5. Flip `status` back to what it was before only if no `[OPEN]` items remain
   in a given file after rewrite; otherwise leave/set `status: draft` and
   flag the remaining opens. (Per ADD convention — a rewrite that introduces
   new opens shouldn't masquerade as `stable`.)
6. After all four are rewritten: `/ardd-analyze` to catch any remaining
   cross-artifact inconsistency, then `/ardd-render` to refresh diagrams
   (all four currently carry `diagram_stale: true` except pipeline.md, which
   has no diagram).

## Open items carried into the rewrite (to resolve while writing, not deferred)

- EffectTempo comment/code contradiction in the old render settings —
  resolve to one behavior, document why, in infrastructure.md's new render-
  settings section.
- Exact orchestration mechanism for the now-two-stage pipeline (was already
  `[OPEN]`, scope just shrank).
- Exact on-disk input/output layout for the now lyrics-only pipeline (was
  already `[OPEN]`, scope just shrank).
