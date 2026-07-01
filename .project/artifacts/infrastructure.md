---
name: infrastructure
status: stable
last_updated: 2026-06-30
diagram_stale: false
---

# Infrastructure

## Overview

Real-time client-server sync over WebSocket: a session host controls
playback (start/pause/resume/seek), and the server is the authoritative
clock, broadcasting position updates to all participants in a session. Tabs
are rendered live, client-side, by `@coderline/alphatab` from the published
`.gp` source file — not pre-rendered offline. The offline pipeline
(pipeline.md) is scoped to lyrics extraction only; it does not produce or
serve any rendering output.

Stack: pnpm workspace monorepo (`client`/`server`/`packages/shared`), Node
+ `ws` for the WebSocket server, **Svelte + Vite** for client
reactivity/templating (plain Svelte, not SvelteKit — the app is one page
with view-state switching between landing/lobby/playback handled by the
client store, not separate routes, so SvelteKit's routing/SSR machinery
isn't needed). `@coderline/alphatab` is a client runtime dependency (not
just a pipeline-time tool) — it both renders the tab and plays audio,
requiring a SoundFont asset (multi-MB) that the client loads for playback.
This is a real load-state concern, not just a stack bullet: an instrument
part's "loading" state (ui.md) spans both the `.gp` file parse/render and
the SoundFont load, whichever finishes last. alphaTab is also a pipeline
dependency (pipeline.md) — it's usable in Node, not just the browser, and
the lyrics-extraction pipeline reuses the same package server-side for
per-beat lyric/tick data, rather than adding a second GP-parsing library.

## Session & Real-Time Sync

The server owns session state (participants, selected song/part, playback
clock) and is the source of truth for "what tick position are we on right
now" (`PlaybackState.tickPosition`, datamodel.md). Playback start is
synchronized across participants when the host starts/resumes/seeks; from
that point, each participant's own alphaTab instance drives its local
clock and cursor independently, rather than the server continuously
pushing position and the client snapping to it. The server still broadcasts
`PlaybackState` periodically (`tickPosition` + `serverTimestamp`), and each
client uses that broadcast to correct its alphaTab instance's
`tickPosition`/`timePosition` if it has drifted — a periodic correction,
not a continuous drive. This applies uniformly to every participant: an
instrument-part participant's visible alphaTab renderer and a lyrics-part
participant's headless alphaTab instance (ui.md) both consume
`PlaybackState` the same way and both expose the same `tickPosition`/
`timePosition` properties to correct against.

Sessions are server-memory-only: a grace-period timer destroys empty
sessions, and a server restart drops active ones. No durable backing
store for session state.

## Tab Rendering

Tabs are rendered live, client-side, from the published `.gp` file
(`CatalogSong.gpFilePath` — one multi-track file per song, loaded once and
shared across parts via `CatalogPart.trackIndex`, datamodel.md) using
`@coderline/alphatab`. There is no offline render stage or per-density
asset — bars-per-row density is a live alphaTab display setting, not a
stored variant (datamodel.md Normalization Rules). Default render
settings, carried forward from the prior pipeline's proven configuration
and now applied at client render/init time instead of offline:

```js
// isPercussion is read from the parsed score's track data
// (track.percussionArticulations / instrument metadata), not stored in
// the datamodel — alphaTab already exposes this natively (constitution
// Principle V).
const settings = new at.Settings();
settings.core.engine = 'svg';
settings.display.layoutMode = at.LayoutMode.Page;
// No settings.display.barsPerRow pin — auto-wrap by default (someday:
// host-mandated bars-per-row and participant-preferred horizontal layout
// are deferred future direction, not built now).
settings.display.staveProfile = isPercussion ? at.StaveProfile.Score : at.StaveProfile.TabMixed;
// TabRhythmMode.Automatic silently falls through to Hidden for TabMixed — must be explicit.
if (!isPercussion) settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;

// Colors: brand.md's token values (Tab Notation & Playback Cursor), set
// directly via the resources API — no sentinel-then-CSS-fill-match
// indirection needed, unlike the old static-SVG pipeline.
const r = settings.display.resources;
r.mainGlyphColor      = 'var(--tab-foreground-dim)';
r.secondaryGlyphColor = 'var(--tab-foreground-dim)';
r.staffLineColor      = 'var(--tab-ruling-dim)';
r.barSeparatorColor   = 'var(--tab-ruling-mid)';
r.barNumberColor      = 'var(--tab-foreground-dim)';
r.scoreInfoColor      = 'var(--tab-foreground-dim)';

// Hide score header fields — the app renders title/artist/part in HTML.
// Keep EffectMarker (section labels); suppress free text annotations and
// EffectTempo (tempo is shown in the app's own transport UI, not inline
// in the score — the old pipeline's code suppressed EffectTempo despite a
// comment claiming it was kept; suppressing it is the resolved, intended
// behavior).
const NE = at.NotationElement;
[
    NE.ScoreTitle, NE.ScoreSubTitle, NE.ScoreArtist, NE.ScoreAlbum,
    NE.ScoreWords, NE.ScoreMusic, NE.ScoreWordsAndMusic, NE.ScoreCopyright,
    NE.GuitarTuning, NE.TrackNames, NE.EffectText, NE.EffectLetRing, NE.EffectTempo, NE.EffectPalmMute,
].forEach(el => settings.notation.elements.set(el, false));
```

`mainGlyphColor` above sets one base color; brand.md's fret-number-text
and bend/slur-geometry overrides are applied on top via direct CSS
selectors targeting alphaTab's actual SVG element types, since the
`resources` API itself only allows one color per role (brand.md has the
full color reasoning and values — this section is implementation
mechanism only).

Cursor and highlight overlays (`.at-cursor-bar`, `.at-cursor-beat`,
`.at-highlight`) remain genuinely CSS-class-driven, styled by brand.md —
unlike the notation glyphs above, which alphaTab only exposes through the
`display.resources` API, not CSS. `NE.ScoreWords` above suppresses
alphaTab's own native lyric-text rendering deliberately — the in-tab
lyrics overlay is custom client logic (below), not alphaTab's built-in
lyrics display. Pipeline stages, source format, on-disk layout, and
lyric-extraction dependency handling remain owned by `pipeline.md`, not
this artifact — this section only covers what happens to the published
`.gp` file once the client has it.

### In-Tab Lyrics Overlay

The overlay (ui.md) is derived live from the same parsed `.gp` file, not
from a pipeline-published tick map (constitution Principle V; datamodel.md
Normalization Rules): the client reads `CatalogSong.lyricsTrackIndex` to
find the track whose beats carry lyrics, walks that track's beats in
order, and regroups the resulting flat syllable stream into lines using
`CatalogSong.lyricLineBreaks` (syllable-count-per-line) so line boundaries
match `.lrc`. Because tick position is score-global, not per-track, this
works regardless of which instrument track the viewing participant
actually has rendered — the lyrics-bearing track need not be the one
on screen, or even a selectable `CatalogPart` at all.

`Beat.lyrics` is **not** a flat per-beat syllable array — it's indexed by
lyric line/channel number (GP allows multiple simultaneous lyric channels,
e.g. main vocal vs. a harmony line spanning the whole song), so a beat's
array typically looks like `['word', '', '', '', '']` with the real
syllable at index 0 and the rest empty. The walk reads
`CatalogSong.lyricsLineIndex` to know which channel index to use (almost
always `0`, unless a song has multiple non-empty channels — a rare case
the pipeline detects and chooses from explicitly, datamodel.md, rather
than the client guessing), filtering to beats where that index is a
non-empty string — the default is `null`, and rests never get populated.
**Empirically validated** against 5 real `.gp` files (1202 lyric-bearing
beats across 4 songs): index 0 held in 100% of cases, exactly one
lyrics-bearing track per song, rest beats always null — no multi-channel
lyrics encountered in practice, though the field-level handling stays in
case one exists.

Known upstream caveat (alphaTab GitHub issue #2727, open as of v1.8.1):
tied/continuation beats aren't skipped consistently by alphaTab's own
lyric renderer on some inputs, which could shift a syllable one position
off. Validation against the 5 real files found this **not reachable** for
modern GP7/8 exports specifically: those files carry pre-dispatched
per-beat lyrics in their XML, which sets alphaTab's internal
`_skipApplyLyrics` flag and bypasses the vulnerable code path entirely.
The bug is only live for legacy binary GP3-5 files or synthetic inputs —
worth a defensive note in the walk's implementation, not a primary design
concern.

## Production Posture

Self-hosted / small-group tool: no auth, no rate limiting. Session/
auth-adjacent code should still resolve "who is this participant" in one
place rather than scattering that assumption across handlers, so that
adding auth later is additive rather than a rewrite — but auth and rate
limiting themselves are out of scope for this build.
