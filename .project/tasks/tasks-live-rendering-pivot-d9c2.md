---
plan: plan-live-rendering-pivot-2026-07-01.md
generated: 2026-07-01
status: in-progress
---

# Tasks

## Phase 1: Monorepo Scaffolding

- [x] T001 [artifacts: constitution, infrastructure] Set up the pnpm workspace root: `pnpm-workspace.yaml` listing `client`, `server`, `packages/shared`; root `package.json`, root `tsconfig.json`, `.gitignore`. No business logic in any of these files — bootstrap/config only (Principle III).
- [x] T002 [artifacts: infrastructure, datamodel] [parallel] Scaffold `packages/shared`: a TypeScript package exporting datamodel.md's entities as pure types/interfaces — `Session`, `Participant`, `CatalogSong`, `CatalogPart`, `PlaybackState`, and the `ReadinessStatus` union — no runtime logic, types only.
- [x] T003 [artifacts: infrastructure] [parallel] Scaffold the `server` package: Node + `ws` WebSocket server skeleton. Entry point (`index.ts`) only reads config, constructs dependencies, and starts listening (Principle III) — accepts connections and logs, no message handling yet.
- [x] T004 [artifacts: infrastructure, ui] [parallel] Scaffold the `client` package: Svelte + Vite, plain Svelte (no SvelteKit). One reactive client store holding view state (Principle I). Empty placeholder components for Landing/Lobby/Playback views, wired to the store's view-state field only.

**Test requirement**: `pnpm install` succeeds at the workspace root; `pnpm -r build` succeeds across all three packages with no business logic present yet.

## Phase 2: Lyrics Extraction Pipeline

- [x] T005 [artifacts: pipeline, datamodel, infrastructure] Create the pipeline package and the consolidated `extract-lyrics` script (single script, not per-stage scripts — per pipeline.md's resolved orchestration decision). Given a source `.gp` file path, parse it via `@coderline/alphatab` in Node to locate the lyrics-bearing track: walk each track's beats, find the one where `Beat.lyrics` is populated, and determine `lyricsLineIndex` (the first non-empty index in a lyric-bearing beat's array — almost always `0`, per this session's empirical validation against 5 real `.gp` files).
- [x] T006 [artifacts: pipeline] Implement the raw zip + XML read of `score.gpif`'s Track-level `<Lyrics><Line><Text>` (via Node's built-in zip handling or a minimal zip library — not a full GP-parsing library) to recover GP's own explicit line-break placement when the author included it. This is not exposed by alphaTab's public API (validated this session) — must be read independently of the alphaTab-based beat walk in T005.
- [x] T007 [artifacts: pipeline] When T006 finds no explicit line breaks (confirmed empirically to happen — one of 5 real test files had zero), query lrclib.net **only** for line-break placement, discarding lrclib's own timestamps entirely — all timing in the output must come from GP.
- [x] T008 [artifacts: pipeline, datamodel] Implement the lrclib.net **fallback** path (distinct from T007's narrower line-break-only use): when the `.gp` file has no embedded lyrics at all, query lrclib.net for full synced lyrics and write `.lrc` directly. No `lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks` are produced in this path.
- [x] T009 [artifacts: pipeline, datamodel] Implement `.lrc` generation for the GP-embedded path: per-line start timestamps from GP syllable timing, plus a blank-content "gap" line encoding each line's end timestamp (taken from that line's last syllable). Compute `lyricLineBreaks` (syllable-count-per-line) as a byproduct of the same line-segmentation logic used for `.lrc`.
- [x] T010 [artifacts: pipeline, datamodel] Implement the Publish step: write a `catalog/<song-slug>/` directory containing the validated `.gp` file (served as-is, no transformed copy), the generated `.lrc`, and a `meta.json` holding `lyricsTrackIndex`, `lyricsLineIndex`, and `lyricLineBreaks` (or nulls, per whichever path ran).

**Test requirement**: run `extract-lyrics` against the 5 real `.gp` files used for validation this session (Creep, Time Is Running Out, Lazy Eye, Last Nite, Teenagers — available at `~/Downloads/gp`). Assert: the 4 vocal songs produce a non-null `lyricsTrackIndex`/`lyricsLineIndex` pointing at the correct track (index 0 in all 4 cases, per this session's empirical findings) and a non-empty `lyricLineBreaks`; Lazy Eye (instrumental, no embedded lyrics) produces `lyricsLrc: null` and no pointer; the Muse file (zero native `\n` line breaks in its raw text) still produces a correctly line-broken `.lrc` via the lrclib-assisted path, proving T007 actually engages when needed.

## Phase 3: Server Session/Catalog + WebSocket Protocol

- [ ] T011 [artifacts: infrastructure, datamodel] Implement the in-memory session store: `Session` entities keyed by join code, a grace-period timer that destroys empty sessions. No durable backing store (annotate this as a known production posture per constitution.md, not a shortcut to silently fix later).
- [ ] T012 [artifacts: pipeline, datamodel] [parallel] Implement the catalog loader: scans `catalog/<song-slug>/` directories at server startup, reads each `meta.json`, and builds in-memory `CatalogSong`/`CatalogPart[]` entries.
- [ ] T013 [artifacts: infrastructure, constitution] Implement WebSocket message dispatch decomposed by message type (Principle IV — no single large switch statement). One named handler per type: session-create, session-join, part-select, readiness-update, host-remove-participant.
- [ ] T014 [artifacts: infrastructure, datamodel] Implement host playback controls (start/pause/resume/seek): update `Session.playbackState` and broadcast `PlaybackState` (`tickPosition` + `serverTimestamp`) periodically to all participants in the session.

**Test requirement**: two WebSocket clients join the same session by code; one selects an instrument part and the other selects `'lyrics'`; both see the other's readiness update within one broadcast cycle; a host seek command updates both clients' local `PlaybackState` copies.

## Phase 4: Client alphaTab Integration (Dark Mode)

- [ ] T015 [artifacts: infrastructure, datamodel] Implement client-side `.gp` loading: fetch `CatalogSong.gpFilePath`, parse via alphaTab, select the track for the current part via `CatalogPart.trackIndex`.
- [ ] T016 [artifacts: infrastructure] Implement alphaTab render settings exactly per infrastructure.md's Tab Rendering code block: `core.engine = 'svg'`, `layoutMode = Page` with no `barsPerRow` pin (auto-wrap default), `staveProfile` chosen from the parsed track's own percussion metadata (`track.percussionArticulations`/instrument data — not a stored datamodel field, per constitution Principle V), `rhythmMode = ShowWithBars`, and the full notation-element suppression list (including `EffectTempo`, resolving the old pipeline's stale comment/code contradiction as documented).
- [ ] T017 [artifacts: brand, infrastructure] Wire dark-mode theming into the same settings object from T016: set `display.resources` to brand.md's harvested dark-mode token values, then add CSS overrides targeting the live SVG's real element types (text nodes for fret numbers, path elements for bend/slur geometry) to reproduce the 3-way glyph-color split that `resources` alone can't express.

**Test requirement**: rendering a known `.gp` file (e.g. Creep) produces a visible tab with alphaTab's native cursor element present in the DOM (`.at-cursor-bar`/`.at-cursor-beat`); fret-number text is visually distinguishable in color from default stem/beam strokes, confirming the CSS override in T017 actually applied rather than just the base resource color.

## Phase 5: Playback Sync

- [ ] T018 [artifacts: infrastructure, datamodel] Implement client-side periodic drift correction: on each `PlaybackState` broadcast, compare `tickPosition`/`serverTimestamp` against the local alphaTab instance's own `tickPosition`/`timePosition`; correct only when drift exceeds a threshold, never a continuous drive.
- [ ] T019 [artifacts: infrastructure, ui] [parallel] Implement the headless alphaTab instance for `Participant.selectedPart === 'lyrics'`: same alphaTab API and the same drift-correction logic from T018, but with no visible render target — audio and clock only.
- [ ] T020 [artifacts: datamodel, ui] Wire `Session.metronomeEnabled`/`countInEnabled` to alphaTab's native `metronomeVolume`/`countInVolume` settings, applied identically whether the participant's alphaTab instance is visible (T016) or headless (T019).

**Test requirement**: simulate two clients (one instrument, one headless-lyrics) joining playback at staggered times; after one drift-correction cycle, both report `tickPosition` within the correction threshold of the server's authoritative value.

## Phase 6: In-Tab Lyrics Overlay + Primary Lyrics View

- [ ] T021 [artifacts: infrastructure, datamodel] Implement the live beat-walk: given `CatalogSong.lyricsTrackIndex`/`lyricsLineIndex`, walk that track's beats in the loaded score, filter to beats where `Beat.lyrics[lyricsLineIndex]` is a non-empty string, and build a flat syllable + tick-position stream. Include a defensive comment citing alphaTab GitHub issue #2727 (tied/continuation-beat drift, legacy GP3-5 only per this session's validation — not reachable for modern GP7/8 dispatched-lyrics files).
- [ ] T022 [artifacts: infrastructure, ui] Regroup the flat syllable stream from T021 into lines using `CatalogSong.lyricLineBreaks`, then drive an `.at-highlight`-styled overlay positioned by each syllable's tick position — toggle-able on top of any instrument part's rendered tab, independent of which track the overlay's lyrics came from (per infrastructure.md's cross-track note).
- [ ] T023 [artifacts: ui, brand] [parallel] Implement the primary full-screen lyrics view (for `Participant.selectedPart === 'lyrics'`): large-font line display driven by `.lrc` line timestamps, with a line-to-line highlight/transition animation, using brand.md's active/base lyric colors (pink=active, yellow=base).

**Test requirement**: on a song with GP-embedded lyrics (e.g. Creep), toggling the in-tab overlay during playback highlights syllables in the correct order and in sync with the corresponding `.lrc` line timestamps (cross-check against `.lrc`'s own timestamps as an approximate oracle).

## Phase 7: Light Mode + Remaining UI Polish

- [ ] T024 [artifacts: brand, infrastructure] Implement the light-mode theming toggle: swap `display.resources` values and CSS custom properties to brand.md's light-mode table. Annotate this code as using first-pass, not production-validated values (per the plan's Production Annotation Summary) — a future visual QA pass is expected.
- [ ] T025 [artifacts: ui] [parallel] Implement the Loading state: per-participant readiness reflecting both `.gp` parse/render completion and SoundFont load completion (whichever finishes last), for both instrument and headless-lyrics participants.
- [ ] T026 [artifacts: ui] [parallel] Implement the Empty and Error states: catalog picker only when no song is selected; toast-based errors for invalid/expired join code, part-not-found, and not-host action attempts.
- [ ] T027 [artifacts: datamodel, ui] Implement the lobby cursor: host sets `Session.lobbyCursorTick` pre-playback, visible to all participants via the same tick-to-screen-position mechanism alphaTab already provides for the live playback cursor.

**Test requirement**: toggling light/dark mode updates notation glyph colors, staff/barline colors, and cursor color without a page reload; a host setting the lobby cursor is visible to a second connected participant within one state broadcast.
