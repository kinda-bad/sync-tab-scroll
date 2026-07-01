---
status: approved
branch: live-rendering-pivot
created: 2026-07-01
---

# Plan: Live Client-Side Tab Rendering (alphaTab pivot)

## Goal

Build sync-tab-scroll from scratch per the six stable artifacts: a
real-time session app where tabs render live client-side via alphaTab
(no offline SVG pipeline), playback stays synchronized across
participants via periodic drift correction, and a custom lyrics overlay
tracks the exact syllable being sung — all themed per brand.md's
harvested/validated color system.

## Scope

**In scope:**
- pnpm workspace scaffolding (`client`/`server`/`packages/shared`)
- Lyrics extraction pipeline (lyrics-only, per pipeline.md): GP-embedded
  extraction, lrclib.net fallback, per-song catalog directory publish
- Server session/catalog model and WebSocket protocol (datamodel.md
  entities, decomposed message dispatch per constitution Principle IV)
- Client alphaTab integration: live rendering, native cursor, theming
  (brand.md tokens + resources API + CSS overrides), audio/metronome
- Playback sync: host-controlled start/pause/resume/seek, periodic
  `tickPosition`/`serverTimestamp` correction, headless alphaTab for
  lyrics-part participants
- In-tab lyrics overlay (live beat-walk) and the primary full-screen
  lyrics view
- Light/dark theming, loading/empty/error UI states, lobby cursor

**Out of scope** (per constitution.md and brand.md, not deferred silently):
- Auth and rate limiting (Production Posture — self-hosted/small-group)
- Host-mandated bars-per-row and participant-preferred horizontal layout
  (ui.md's "someday" future direction)
- Pixel-perfect light-mode color tuning (brand.md's light-mode table is
  an explicitly lower-confidence first pass, not production-validated)

## Technical Approach

Reference artifact decisions rather than repeating them:
- **Data model**: datamodel.md's `Session`/`Participant`/`CatalogSong`/
  `CatalogPart`/`PlaybackState` entities, MIDI-tick position throughout,
  no `LayoutMap` equivalent.
- **Pipeline**: pipeline.md's single consolidated script
  (`extract-lyrics`), per-song `catalog/<song-slug>/` directories,
  `@coderline/alphatab` in Node for beat/tick data + raw zip/XML read for
  GP's native line breaks, lrclib.net fallback — all validated against 5
  real `.gp` files this session.
- **Rendering & sync**: infrastructure.md's Tab Rendering settings block
  (verbatim starting point for client alphaTab init), Session & Real-Time
  Sync's periodic-correction model, and the In-Tab Lyrics Overlay's
  beat-walk mechanics (including the `lyricsLineIndex`/tied-beat caveats).
- **Views**: ui.md's three-view flow and Playback View's dual rendering
  (visible vs. headless alphaTab).
- **Theming**: brand.md's token tables (dark: harvested/validated; light:
  first-pass) plus the CSS-override mechanism for the 3-way glyph split.
- **Constitution**: Principle V governs implementation-time judgment
  calls — check alphaTab's actual API before building a custom mechanism,
  same discipline that shaped every artifact this session.

## Phase Breakdown

1. **Monorepo scaffolding** — pnpm workspace (`client`, `server`,
   `packages/shared`), Svelte + Vite client skeleton, Node + `ws` server
   skeleton, shared package holding datamodel.md's TypeScript types.
   Bootstrap/entry files wire dependencies only (Principle III).
   *Demonstrable*: workspace installs and boots; server accepts a raw WS
   connection; client renders a blank shell page.

2. **Lyrics extraction pipeline** — the consolidated `extract-lyrics`
   script: GP-embedded extraction (alphaTab in Node + raw XML line-break
   read), lrclib.net fallback, per-song catalog directory publish.
   *Demonstrable*: running the pipeline against the 5 real sample `.gp`
   files already used for validation this session produces correct
   `catalog/<song>/` output (`.gp`, `.lrc`, `meta.json`) — a direct,
   ready-made test fixture set.

3. **Server session/catalog + WebSocket protocol** — in-memory session
   store, catalog loader (reads pipeline output), decomposed message
   handlers (Principle IV) for session create/join, song/part selection,
   readiness, host controls. No rendering yet.
   *Demonstrable*: two clients join the same session by code, pick
   parts, and see each other's readiness update live.

4. **Client alphaTab integration (dark mode)** — live tab rendering from
   `CatalogSong.gpFilePath`, infrastructure.md's render settings, native
   cursor, dark-mode theming via `display.resources` + CSS overrides for
   the glyph-color split.
   *Demonstrable*: selecting an instrument part renders its tab live,
   correctly themed, with alphaTab's native cursor visible.

5. **Playback sync** — host start/pause/resume/seek, periodic
   `PlaybackState` broadcast, client-side `tickPosition`/`timePosition`
   drift correction, metronome/count-in, headless alphaTab instance for
   lyrics-part participants.
   *Demonstrable*: multiple clients (mixed instrument/lyrics parts) stay
   in sync through a full playback run; the lyrics-part participant
   hears the metronome with no visible tab.

6. **In-tab lyrics overlay + primary lyrics view** — live beat-walk
   (`lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks`) driving
   `.at-highlight`; full-screen karaoke-style view for the lyrics part
   driven by `.lrc` timestamps.
   *Demonstrable*: the overlay highlights the correct syllable in time
   with playback on an instrument part; the lyrics part shows
   line-by-line highlighting matching audio.

7. **Light mode + remaining UI polish** — light theme toggle (notation +
   chrome), loading/empty/error states, lobby cursor pointer.
   *Demonstrable*: full light/dark toggle works end-to-end; loading state
   correctly reflects both `.gp` parse and SoundFont load; lobby cursor
   visible to all participants pre-playback.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| CSS overrides on top of `display.resources` for a 3-way glyph color split (fret-number text vs. default strokes vs. bend/slur geometry) | `resources` only allows one color per role; this is the only way to reproduce the harvested, production-validated dark-mode look exactly (brand.md). |
| `@coderline/alphatab` used in both the browser (client) and Node (pipeline) | Avoids adding a second GP-parsing dependency — empirically validated this session that alphaTab's Node usage covers everything except raw line-break text (pipeline.md Dependencies). |
| Headless alphaTab instance for lyrics-part participants (full engine + SoundFont load, no visible render) | Keeps one sync/audio mechanism uniform across every participant rather than a bespoke lighter clock — avoids a second, divergent sync implementation (infrastructure.md, ui.md). |

## Open Questions

None block starting implementation (all six artifacts are stable with
zero open items). Surfaced during planning, to resolve during
implementation rather than before:
- Exact lrclib.net integration details (rate limits, auth if any) —
  not yet exercised against the live API.
- SoundFont asset selection: exact file, license terms, and hosting
  approach (self-hosted static asset vs. CDN) — infrastructure.md
  establishes it's needed and multi-MB, not which one.
- Real-world validation of the periodic drift-correction model's actual
  correction cadence/threshold under real network conditions — the
  artifacts establish the mechanism, not the tuned parameters.

## Production Annotation Summary

- No auth, no rate limiting (constitution.md Production Posture —
  explicit, not a shortcut needing a future fix, but still worth a code
  comment where a handler assumes a trusted client).
- In-memory-only session store, no durable backing (infrastructure.md) —
  annotate at the store's definition site.
- brand.md's light-mode color values are a first pass, not
  production-validated like dark mode — annotate in the CSS/token
  definitions so a future visual QA pass is expected, not assumed done.
- alphaTab GitHub issue #2727 (tied-beat lyric drift) — annotate the
  lyrics beat-walk code with the legacy-GP3-5-only caveat from
  infrastructure.md, so it isn't rediscovered as a mystery bug later.
