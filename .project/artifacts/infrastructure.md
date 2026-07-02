---
name: infrastructure
status: stable
last_updated: 2026-07-01
diagram_status: stale
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

A closed socket triggers an immediate `session-state` broadcast to the
rest of the session (`server/src/server.ts`'s `close` handler, right
after marking the participant `disconnected`) — remaining participants
see connectivity changes right away rather than waiting for the next
periodic `PlaybackState` broadcast to happen to carry the updated
participant list along with it.

## Reconnect By Identity

A client persists `{code, displayName, participantId}` (e.g. to
localStorage) once a session exists, and passes `participantId` back on
`session-join`. If it matches an existing participant in that session,
the server reclaims that participant (updates `displayName`/
`connectionStatus`, resets `readiness` since the reconnecting client's
renderer/headless instance is gone after a fresh page load) instead of
minting a new one — `id`, `role`, and `joinedAt` are preserved. Without
this, a refreshing host would lose host control permanently: `Session.
hostId` would keep pointing at an old participant id no socket can ever
reclaim.

## Host Succession

If the participant holding `Session.hostId` disconnects, a grace-period
timer (2 minutes) starts. If they reconnect within it (Reconnect By
Identity, above, matching on `Session.hostId`), the timer is cancelled
and nothing changes. If the timer expires with no reconnect, the
longest-tenured currently-connected participant (by `Participant.
joinedAt`, excluding the outgoing host) is promoted: `Session.hostId`
moves to them, their `role` becomes `'host'`, and the outgoing host's
`role` becomes `'member'` (they keep their seat and can still rejoin
later, just without host privileges). If no other participant is
connected when the timer fires, nothing is promoted — an empty-of-
connections session is already covered by the session-destruction grace
timer above.

This grace period is configurable (`ServerConfig.hostReassignGraceMs`,
env `HOST_REASSIGN_GRACE_MS`) — mainly so it can be shortened for tests;
production default is 2 minutes.

## Song Catalog Delivery

The catalog (`CatalogSong[]`, loaded once at startup by `catalog-loader.ts`,
datamodel.md) is server-global — it isn't part of any one `Session` and
isn't re-scanned per request. A client receives the full catalog once,
right after its `session-create`/`session-join` succeeds, as its own
message distinct from `session-state` (which only ever carries one
session's state, not the server-wide catalog).

Catalog file assets (`CatalogSong.gpFilePath`, `CatalogSong.lyricsLrc`)
live on the server's disk under `catalog/<song-slug>/` (pipeline.md), but
`CatalogSong` as published to a client carries a client-fetchable URL, not
that disk path — the server exposes the catalog root as static HTTP
content (e.g. `/catalog/<song-slug>/<file>`), and `catalog-loader.ts`
rewrites each on-disk path to its corresponding URL before the loaded
`CatalogSong[]` is ever handed to a socket. This is the first HTTP surface
this server exposes — until now it was WebSocket-only (`ws`) with no
static-file serving at all; the WebSocket upgrade and the static catalog
route share the same underlying `http.Server` instance rather than
running as two separate listeners on two ports.

Song selection is host-only, following the same authorization check as
`playback-control` (host id vs. the connection's participant id): the
host picks a `CatalogSong.id`, which sets `Session.selectedSong` and
`Session.availableParts` and is broadcast to all participants via the
normal `session-state` broadcast — no separate message type is needed for
the result, only for the host's selection action.

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
settings.core.fontDirectory = '/font/'; // Bravura assets served as a static client asset — see Font & Worker Setup below
// Verified during implementation: alphaTab's web-worker auto-detection
// silently fails under Vite's ESM dev/build output (render() was a no-op
// with workers enabled); main-thread rendering works immediately.
settings.core.useWorkers = false;
settings.display.layoutMode = at.LayoutMode.Page;
// No settings.display.barsPerRow pin — auto-wrap by default (someday:
// host-mandated bars-per-row and participant-preferred horizontal layout
// are deferred future direction, not built now).
settings.display.staveProfile = isPercussion ? at.StaveProfile.Score : at.StaveProfile.TabMixed;
// TabRhythmMode.Automatic silently falls through to Hidden for TabMixed — must be explicit.
if (!isPercussion) settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;

// Colors: brand.md's token values (Tab Notation & Playback Cursor),
// applied by client/src/tab-renderer.ts's applyThemeColors() — not CSS
// variables (alphaTab's RenderingResources fields are typed as Color
// objects, not strings). applyThemeColors() assigns at.model.Color
// instances (RGBA) from client/src/brand-colors.ts's darkTabColors/
// lightTabColors, selected by the theme parameter passed into
// createTabRenderer/setTheme — no sentinel-then-CSS-fill-match
// indirection needed, unlike the old static-SVG pipeline.

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

**Revised during implementation**: `mainGlyphColor` is a flat value, not a
base color with CSS overrides layered on top as originally planned.
Verified empirically (live-rendered SVG DOM inspected in a real browser):
alphaTab's SVG output carries no per-glyph-type class — every glyph
(fret numbers, stems, beams, bend/slur geometry) is a `<text>` element
distinguishable only by its resource-assigned `fill`, so there is no CSS
selector that can split `mainGlyphColor` into sub-roles. brand.md has the
full color reasoning and values, and documents a feature request filed
with alphaTab requesting finer-grained resource colors or semantic
classes, which would let this be revisited if it lands upstream.

### Font & Worker Setup

Three more implementation-verified deviations from what the render-settings
block above might suggest at a glance:

- `@coderline/alphatab`'s Vite plugin (`@coderline/alphatab/vite`) is
  broken in the installed 1.8.3 release — it references a nested build
  file (`dist/vite/alphaTab.vite.mjs`) that doesn't exist in the published
  package. Font assets (Bravura, OFL-licensed) are instead committed
  directly to the client's static assets and served from `/font/`, with
  `core.fontDirectory` pointed at that path — a manual substitute for
  what the plugin would otherwise automate, not a design choice.
- `core.useWorkers` must be `false` (see code block above) — alphaTab's
  web-worker script auto-detection assumes a single bundled script file,
  which doesn't hold under Vite's ESM module output. Main-thread
  rendering works without issue at the scale this app needs.
- `settings.core.scriptFile = new URL('/alphaTab.worker.js', location.origin).href`
  (`client/src/tab-renderer.ts:51`) — a distinct setting from
  `core.useWorkers` above. alphaTab's audio player spawns its own worker
  independent of the render worker `core.useWorkers` controls, and that
  player worker needs a classic (non-ESM) script it can load, since
  auto-detection fails under Vite's ESM output the same way the render
  worker's did. A classic build copy is served as a static client asset
  at that path for this.

The audio side of tab rendering also deviates from a bare visual-only
setup: `settings.player.enablePlayer = true` and `settings.player.soundFont
= '/soundfont/sonivox.sf2'` (`client/src/tab-renderer.ts:68-69`) wire up
alphaTab's audio engine (ui.md), using the Apache-2.0-licensed Sonivox
soundfont alphaTab ships rather than sourcing or licensing a separate
SoundFont asset.

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
