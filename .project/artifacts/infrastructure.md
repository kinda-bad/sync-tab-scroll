---
name: infrastructure
status: stable
last_updated: 2026-07-14
diagram_type: graph TD
render_section: Infrastructure
diagram_status: current
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
clock) but is **not** the source of truth for "what tick position are we
on right now" — it structurally can't be, since it never parses the
published `.gp` file (no tempo/PPQ knowledge) and so has no way to compute
tick position from elapsed wall-clock time itself. Instead, the host's
client is the functional authority: while playback is `'running'`, the
host's own alphaTab instance already tracks an accurate,
continuously-advancing `api.tickPosition`, and periodically self-reports
it to the server via a `playback-tick-report` message (roughly every
second). The server just stores whatever the host last reported
(`Session.playbackState.tickPosition`) and refreshes
`serverTimestamp = Date.now()` alongside it — it doesn't recompute or
extrapolate the value on its own.

Playback start is synchronized across participants when the host
starts/resumes/seeks; from that point, each participant's own alphaTab
instance drives its local clock and cursor independently, rather than the
server continuously pushing position and the client snapping to it. The
server still broadcasts `PlaybackState` periodically (`tickPosition` +
`serverTimestamp`) — unchanged, existing mechanism — and each client uses
that broadcast to correct its alphaTab instance's `tickPosition`/
`timePosition` if it has drifted against the host's last-reported value —
a periodic correction, not a continuous drive. This applies uniformly to
every participant, including the host itself (whose own client both
reports and receives-and-corrects-against the same value): an
instrument-part participant's visible alphaTab renderer and a lyrics-part
participant's headless alphaTab instance (ui.md) both consume
`PlaybackState` the same way and both expose the same `tickPosition`/
`timePosition` properties to correct against.

`serverTimestamp`-based extrapolation on the receiving end — compensating
for host→server→client propagation latency by projecting `tickPosition`
forward from `serverTimestamp` rather than using it as-is — is a deferred
future refinement, not part of the current mechanism. Accepted as a
manageable, minor imprecision for now, consistent with the existing
50-tick drift tolerance and this app's small-scale self-hosted trust
model.

Realtime session state is server-memory-only: a grace-period timer destroys
empty sessions, and a server restart drops active ones. **No durable backing
store for *session state*** — this remains true after the accounts addition
(constitution v1.5.0). The durable Postgres store introduced for user accounts
holds only identity / catalogue-membership / auth-session records (User
Accounts, below; datamodel.md's Account Layer); live `Session`, `Participant`,
and `PlaybackState` are never persisted, and the server runs unchanged with no
database configured.

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

## Connection Loss & Retry

`client/src/ws-client.ts` tracks real WS connection state via
`ConnectionStatus` (`'connecting' | 'connected' | 'disconnected'`,
constitution Principle VI — one named type, not re-typed at each call
site), stored on `ClientState.connectionStatus`. Previously the client
registered only `open`/`message` listeners; a server-down-at-load or a
mid-session drop went completely silent — `send()` already queued
outbound messages while `readyState !== OPEN`, but nothing ever retried
opening a new socket, and nothing told the user why the app appeared
stuck. `ui.md`'s persistent connection-lost banner is driven directly by
this field.

On `error`/`close`, the client sets `connectionStatus: 'disconnected'`
and starts a fixed-interval retry (2s, no exponential backoff/jitter —
this project's self-hosted/small-group scale doesn't warrant it, same
reasoning as elsewhere in this doc) that keeps attempting a fresh
`new WebSocket(url)` until one opens. On success, `connectionStatus`
flips back to `'connected'`. This reuses the same reconnect-by-identity
mechanism above rather than adding a second one: if a session was
already established before the drop (`ClientState.session`/
`selfParticipantId` already set — distinguishing this from the very
first connection, where the original `session-join`/`session-create`
message is still sitting unsent in `pending` and flushes automatically
once the socket opens), the client explicitly re-sends `session-join`
with the persisted `code`/`participantId` on the new socket, hitting the
same server-side reclaim-by-id branch a page refresh already uses. The
retry never gives up — no "couldn't reconnect, give up" dead-end state;
the user can always reload manually.

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

**Catalogue unlock re-derives on host change.** Whenever `Session.hostId`
changes — succession here, or an explicit Host Transfer (below) — the
membership-derived slice of `Session.unlockedCatalogueIds` (datamodel.md) is
recomputed from the *new* host's durable `CatalogueMembership` set, not left
intact. A private catalogue unlocked *only* because the departed host was a
member re-locks if the new host isn't a member (and no one typed its key this
session); a catalogue unlocked by a key typed this session stays unlocked
(that's a session fact, tied to no user). This keeps host-only auto-unlock
coherent — private content never outlives the authenticated host that granted
it, closing the leak an all-anonymous post-succession session would otherwise
carry (accounts design §13 S4). With accounts disabled (no DB), there is no
membership-derived slice and this recomputation is a no-op.

## Host Transfer

Besides Host Succession's disconnect-triggered fallback (above), a
currently-connected host can also move `Session.hostId` deliberately,
through two entry points that share one underlying mechanism rather than
each reimplementing it:

- **Direct delegation** — the host picks a specific connected participant
  and hands off immediately, no consent step. Message: `host-delegate
  { targetParticipantId }`, host-only (same authorization pattern as
  `playback-control`/`song-select`: host id checked against the
  connection's participant id). Rejected if the target isn't an existing,
  currently-connected participant, or is the sender themselves (a no-op,
  rejected rather than silently ignored so the UI can surface it as an
  error).
- **Participant-initiated request** — a non-host participant asks first,
  and the host explicitly grants or declines. Message: `request-host` (no
  payload beyond connection identity) sets `Session.pendingHostRequest`
  (datamodel.md) to the requester's `Participant.id`, rejected if the
  sender is already host or a different request is already pending — one
  outstanding request at a time, first-come-first-served. The host
  declines with `host-request-decline` (host-only, rejected if nothing is
  pending), which just clears `pendingHostRequest` with no transfer.
  Granting a pending request is **not** a separate accept message — the
  host grants it by sending `host-delegate` targeting the requester, the
  same message Direct Delegation uses. This is deliberate, not an
  oversight: once a request is pending, "delegate to that participant" and
  "accept their request" are the same action with the same effect, so
  giving them separate messages would mean two code paths producing an
  identical `hostId`/`role` outcome — exactly the duplication constitution
  Principle II exists to prevent. `host-delegate`'s handler clears
  `pendingHostRequest` to null as part of its transfer whenever the target
  it just promoted matches the pending requester (a no-op if there was no
  pending request, or if the host delegated to someone other than the
  requester — in which case the original request is simply left pending,
  still awaiting an explicit grant or decline).
- **Shared transfer mechanics**: both entry points, and Host Succession's
  own disconnect-triggered promotion, perform the identical field swap
  (`Session.hostId` moves to the new host, their `role` becomes `'host'`,
  the outgoing host's `role` becomes `'member'`, seat/`joinedAt` otherwise
  unchanged) through one function (`transferHost(session, toParticipantId)`
  in `server/src/host-succession.ts`, exported and reused by
  `host-delegate`'s and Host Succession's own promotion handler alike) —
  not three independently hand-written copies of the same swap.
  `host-request-decline` never calls it, since declining performs no
  transfer.

If the requesting participant disconnects while their request is still
pending, the server clears `Session.pendingHostRequest` as part of the
same disconnect handling that marks them `disconnected` — an unreachable
participant shouldn't remain as a live pending request the host could
still act on. If the *host* disconnects while a request is pending,
`pendingHostRequest` is left as-is and Host Succession's own promotion
logic proceeds independently on its own schedule, regardless of
`pendingHostRequest`'s value — the newly-promoted (or reconnected
original) host can still grant or decline the same pending request
afterward. No timeout auto-clears an unanswered request; this app's
small-group trust model doesn't call for one, and an ignored requester
isn't blocked from anything except submitting a second request while the
first is still pending.

Every mutation above (`host-delegate`, `request-host`,
`host-request-decline`) broadcasts the updated `session-state` the normal
way — no separate result message or side-channel notification, consistent
with Principle I: every participant, not just the host, sees who's
requesting and who currently holds host privileges from the same shared
state.

## Host Remove Participant

Separate from Host Transfer (above) — removing a participant, not
transferring host privileges. Message: `host-remove-participant
{ participantId }`, host-only (same authorization pattern as
`host-delegate`/`playback-control`: host id checked against the
connection's participant id; a non-host sender gets an `error` message,
`server/src/handlers/host-remove-participant.ts`). The handler filters the
target out of `Session.participants` and broadcasts the updated
`session-state` the normal way — no separate result message, same as
every other mutation in this section.

The removed participant's own socket is not closed server-side and
receives that same `session-state` broadcast like every other connection
(`ConnectionRegistry.broadcast` builds each recipient's copy from that
recipient's own still-attached `conn.participantId`) — it just no longer
finds an entry for itself in `Session.participants`. The client, not the
server, detects this: `ws-client.ts`'s `session-state` handler checks
whether the broadcast's `selfParticipantId` matches the store's current
`selfParticipantId` (an idempotency guard, so this only fires once) and is
now absent from `session.participants`. On a match, it pushes a toast,
clears the persisted session identity (`clearStoredSession()`), resets
`clientStore` to the same shape `leaveSession()` uses, and closes its own
socket — while also setting a `suppressReconnect` flag so the socket's
`'close'` listener does not schedule its usual reconnect-and-rejoin
attempt (which would otherwise just rejoin the session this participant
was just removed from). See ui.md's Participants tab and "Removed from
session" state.

## Song Catalog Delivery

The catalog (`CatalogSong[]` grouped by `Catalogue`, loaded once at
startup by `catalog-loader.ts`, datamodel.md) is server-global — it isn't
part of any one `Session` and isn't re-scanned per request. A client
receives the catalog once, right after its `session-create`/`session-join`
succeeds, as its own message distinct from `session-state` (which only
ever carries one session's state, not the server-wide catalog). A **public** `Catalogue`'s metadata (`id`, `name`, `public`) and its
`CatalogSong[]` are always included. A **private, not-yet-unlocked**
catalogue is withheld **entirely** — not just its songs but its metadata
(`id`, `name`) too — so the client never learns a locked catalogue exists,
its id, or its name (`visibleCatalog` in `catalog-loader.ts` omits it from the
emitted `catalogues`). Only once `Session.unlockedCatalogueIds` contains that
catalogue for this session does it appear — metadata and songs together — in
the delivered catalog. See Catalogue Activation Key Unlock, below, for the one
case that re-sends this message mid-session.

Catalog file assets (`CatalogSong.gpFilePath`, `CatalogSong.lyricsLrc`)
live on the server's disk under `catalog/<song-slug>/`, or
`catalog/<catalogue-slug>/<song-slug>/` for a song belonging to a
non-default catalogue (pipeline.md), but `CatalogSong` as published to a
client carries a client-fetchable URL, not that disk path — the server
exposes the catalog root as static HTTP content (e.g.
`/catalog/<catalogue-slug>/<song-slug>/<file>`), and `catalog-loader.ts`
rewrites each on-disk path to its corresponding URL before the loaded
`CatalogSong[]` is ever handed to a socket. When resolving a song's `.gp`,
the loader selects the first *non-hidden* `*.gp` in the song directory:
dotfile / macOS AppleDouble sidecars (a `._<name>` companion that encodes a
file's extended attributes — e.g. left behind when the catalog is moved to
the deployment volume with a `tar` that preserves xattrs) are ignored, never
picked as the tab source, since a `._Foo.gp` both ends in `.gp` and sorts
ahead of the real `Foo.gp`. This is the same skip-not-fatal posture the
loader already applies to a malformed song or catalogue entry — an
unrecognized `.`-prefixed file is noise, not a song asset. `catalog-static.ts`'s existing
handler needs no change for the nested layout — it already serves
whatever's under `CATALOG_ROOT` by relative path, catalogue subdirectory
or not. This is the first HTTP surface this server exposes — until now it
was WebSocket-only (`ws`) with no static-file serving at all; the
WebSocket upgrade and the static catalog route share the same underlying
`http.Server` instance rather than running as two separate listeners on
two ports.

Song selection is host-only, following the same authorization check as
`playback-control` (host id vs. the connection's participant id): the
host picks a `CatalogSong.id`, which sets `Session.selectedSong` and
`Session.availableParts` and is broadcast to all participants via the
normal `session-state` broadcast — no separate message type is needed for
the result, only for the host's selection action. Selecting a song from a
catalogue the session hasn't unlocked is rejected as an error (mirroring
an invalid `CatalogSong.id`) — this can only happen from a stale/tampered
client, since an unlocked-catalogue's songs are the only ones a normal
client ever has to pick from.

## Catalogue Activation Key Unlock

Host-only, same authorization pattern as song selection above. Message:
`catalogue-unlock { key }` — **no `catalogueId`**. Because a locked
catalogue's metadata is never sent to the client (Song Catalog Delivery,
above), the host has nothing to name; they type a key only, and the server
resolves *which* catalogue it unlocks. The server iterates every **locked,
not-yet-unlocked** catalogue (`!public && salt && hash && id ∉
Session.unlockedCatalogueIds`), computes `crypto.scrypt(key, storedSalt, 64)`
for each, and compares it to that catalogue's stored hash with
`crypto.timingSafeEqual` — not a plain `===`, to avoid a timing side-channel
on the hash comparison itself. The first catalogue whose hash matches is
unlocked. The comparison runs against every locked catalogue rather than
early-returning on a public/already-unlocked one, so neither timing nor
behavior leaks which ids exist. A non-host request is rejected before any key
comparison. A key matching no locked catalogue is just an `error` message
(ui.md States), not a distinct response shape — the client can't tell "wrong
key" from "no such catalogue" or "server declined for another reason",
consistent with this app's terse error-toast pattern elsewhere and the
constitution's no-rate-limiting Production Posture (nothing here needs to
distinguish failure reasons to a potential brute-forcer).

On a correct key: the matched catalogue's id is appended to
`Session.unlockedCatalogueIds`, and the server broadcasts **two**
messages to every connected participant in the session, not one — the
normal `session-state` broadcast (so every participant's UI reflects the
newly-unlocked catalogue immediately) and a fresh `catalog` message
carrying that catalogue's now-visible `CatalogSong[]` entries.
Two messages because they're genuinely different payloads for different
audiences by today's existing message shapes (`session-state` is
per-session state, `catalog` is server-global song data) — introducing a
combined message type only for this one case would duplicate what
`session-state`/`catalog` already carry, not simplify anything.

**Persisting the unlock (logged-in host only).** When the unlocking host is a
logged-in `User` (their connection carries a valid `AuthSession` — User
Accounts, below), a successful key unlock *also* writes a durable
`CatalogueMembership` (`grantedVia:'key'`, `keyEpoch` = the catalogue's current
Activation-Key `epoch`, datamodel.md). On that user's next session the
catalogue auto-unlocks from the membership with no re-typing — the whole point
of the accounts feature. An anonymous host's unlock stays per-session as today,
persisting nothing. Rotating a leaked key bumps the catalogue's `epoch`,
stranding memberships redeemed under an older epoch (§13 S5). Writing the
membership is **best-effort**: if the durable store is unavailable the unlock
still succeeds for the current session (graceful degradation, User Accounts
below) — it just isn't remembered next time.

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
// isPercussion is read directly from the parsed track's own data
// (track.isPercussion, client/src/tab-renderer.ts), not stored in
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
// Phone screens get a larger render scale so notation is legible without
// pinch-zoom (client/src/tab-scale.ts's tabScaleForViewportWidth) — Page
// layout re-wraps bars to the container, so this can't introduce
// horizontal overflow.
settings.display.scale = tabScaleForViewportWidth(window.innerWidth);
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
  `core.useWorkers` above, but **not** the mechanism that actually keeps
  the audio player worker alive in every environment (a previous version
  of this section claimed it was; corrected 2026-07-04 after a real-browser
  investigation of feedback-lyrics-only-view-d7d8 traced the actual cause).
  alphaTab's ESM build *always* attempts
  `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url), {type:
  'module'})` first, under any Vite/Webpack-bundled environment detection —
  `core.scriptFile` is only a fallback reached inside a `catch` for a
  *synchronous* Worker-construction error, which a Worker pointed at a
  hanging or 404ing URL never produces (`new Worker()` doesn't throw on
  404). The ESM-URL Worker attempt is made in *both* of this app's
  environments — it is never skipped — but resolves through two different,
  unrelated mechanisms, verified via a real-browser network trace of each:
  - **Dev server** (`vite`): the request (`new URL('./alphaTab.worker.mjs',
    import.meta.url)`, resolved against alphaTab's own package location)
    goes out and is served by Vite's `/@fs/` raw-filesystem passthrough,
    straight out of `node_modules/@coderline/alphatab/dist/` — no
    building/rewriting involved. `client/vite.config.ts`'s
    `optimizeDeps.exclude: ['@coderline/alphatab']` is what makes this
    resolve at all: without it, Vite's dev-time dep-optimizer (esbuild)
    tries to pre-bundle the package into its own rewritten `deps/` cache
    first, and that rewritten copy's own internal `import.meta.url`
    resolution breaks the same request the exclude avoids inviting in the
    first place.
  - **Production build** (`vite build`): the same request goes out, but
    there is no `node_modules`/`/@fs/` passthrough in a built app — Vite
    can't see `new URL(...)` wrapped inside alphaTab's own `Environment`
    class to begin with, so `alphaTab.worker.mjs`/`alphaTab.worklet.mjs`/
    `alphaTab.core.mjs` never land in `dist/assets/` on their own.
    `client/vite.config.ts`'s `alphaTabWorkerAssets()` plugin (mirroring
    the equivalent plugin already in `playwright.config.ts`'s
    `ctViteConfig`) emits them via `generateBundle`, so the request the
    built code actually issues resolves. Without it, the request hangs
    forever with zero visible
    error, permanently blocking `soundFontLoaded`/playback readiness for
    every participant — this was the root cause of
    feedback-lyrics-only-view-d7d8 (the lyrics-only view has no fallback
    content at all, unlike an instrument participant who at least sees a
    static, if unsynced, rendered tab).

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

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push
and pull request to `main` — fulfilling the CI half of constitution
Principle VIII, deferred until now for lack of a git remote/provider. It
runs:

1. **Typecheck** — `pnpm check` (root script, fans out to every
   workspace package's own `check` script: `packages/shared`, `server`,
   `packages/pipeline`, `client`).
2. **Test suite** — server vitest, client vitest, client CT (Playwright
   component tests), and `packages/pipeline`'s vitest, each in its own
   job/step. Client CT and e2e require Playwright's browser binaries
   (`pnpm exec playwright install --with-deps chromium` — only Chromium,
   the only browser this project's `playwright.config.ts` configures
   projects for).

The test infrastructure was already CI-aware before this workflow existed
— `playwright.config.ts`'s `webServer` entries key `reuseExistingServer`
off `!process.env.CI` (the standard env var GitHub Actions and most CI
providers set automatically), and e2e/CT tests already run against the
committed synthetic fixture catalog
(`client/test-fixtures/fixture-catalog`), not the real gitignored
`catalog/` directory — so a fresh CI checkout needs no local-only content
to run the full suite.

**Deliberately not run in CI**: `pnpm check:env` (the `.env`/
`.env.example` key-parity lint, Principle VIII's other half). `.env` is
git-ignored, and `scripts/check-env-parity.mjs` explicitly passes
trivially when `.env` doesn't exist (its own docstring: "a fresh
clone/CI genuinely has no `.env`... so there's nothing to drift
against") — so running it in CI would always pass regardless of what was
actually committed, providing no real protection. Only the pre-commit
hook, which sees a real local `.env`, does meaningful work for this
specific check; CI running the same script would be theater, not defense
in depth.

## User Accounts (Optional — OAuth + Postgres)

Optional identity layer (constitution v1.5.0). **Strictly additive**: with no
database configured the server runs exactly as before — no accounts, every
participant anonymous, per-session activation-key unlock the only access path.
When configured, accounts add persisted catalogue unlock (and, later, in-app
authoring/ownership). datamodel.md's Account Layer defines the durable
entities; this section owns the mechanics. Design of record:
`.project/design-user-accounts-2026-07-12.reviewed.md`.

**Identity provider: hand-rolled Google/GitHub OAuth**, not a managed auth
service. The server must bind a WebSocket connection to a user via an
HTTP-only cookie; a client-driven managed provider (e.g. Supabase) keeps its
token in JS-readable storage and would need a hand-rolled cookie-relay anyway,
so a minimal server-side OAuth flow on the existing `http.Server` is the
smaller-surface, safer fit (spike:
`.project/spike-datastore-secrets-2026-07-12.md`).

**OAuth flow.** New HTTP routes on the *same* `http.createServer` instance that
already serves the catalog and the WS upgrade (`server/src/server.ts`):
`/auth/<provider>/login` (redirect to the provider consent screen),
`/auth/<provider>/callback` (exchange code → profile),
`/auth/logout`, and `/me` (current user, or anonymous). The Authorization-Code
flow MUST carry a `state` parameter, PKCE, and a nonce, all validated on
callback (§13 S1) — without them the callback is login-CSRF-forgeable. On
success the server upserts a `User` by `(oauthProvider, oauthSubject)` and
creates an `AuthSession`.

**Session identity (cookie).** The browser holds an **HTTP-only, `Secure`,
`SameSite`** cookie carrying only the opaque `AuthSession.id` — never user data
or a signed claim. Every authenticated HTTP request and the WebSocket upgrade
resolve the cookie → `AuthSession`, rejecting it if expired or `revokedAt` is
set. Server-side revocation is exactly why sessions are a durable table rather
than a stateless long-lived cookie (§13 S2); logout / logout-everywhere set
`revokedAt`.

**WebSocket upgrade hardening.** The WS upgrade MUST validate the request
`Origin` against an allowlist (§13 S3) — cookies ride the WS handshake
cross-site, so `SameSite` is not the sole CSRF defense. Only after the Origin
check does the upgrade read the cookie to attach a `userId` to the connection.

**Interaction with Reconnect By Identity.** Participant reclaim stays keyed on
`participantId` exactly as today (Reconnect By Identity, above); the account
`userId` is layered on top, not a replacement. A valid auth cookie *by itself*
never reclaims a participant or a host seat — reclaim still requires the
matching `participantId` — so an auth session cannot be used to seize host
control. `userId` only seeds host-only catalogue auto-unlock (Host Succession's
re-derive, above).

**DB-optional boot and mid-run degradation.** The server reads `DATABASE_URL`
at startup; **absent, the whole account layer self-disables** — auth routes
return unavailable, `/me` is always anonymous, and per-session key unlock is
the only path. A hard `DATABASE_URL`-at-boot dependency (crashing without one)
is a **defect**: local dev, CI, tests, and self-hosted mode must run with no
DB. If the DB is reachable at boot but **fails mid-run**, auth-dependent
operations **fail soft** (treated as logged-out / no persisted membership;
unlock still works for the live session, the best-effort membership write is
skipped) — the anonymous path and every live session stay fully functional and
the server never crashes on a DB error (§13 S7).

## In-App Authoring (Phase 2 — Optional, Owner-Only)

Builds on User Accounts (above): a signed-in `User` who owns a catalogue
(`CatalogueOwnership`, datamodel.md) can create/edit catalogues and add
songs from the web UI. Design of record:
`.project/design-user-accounts-2026-07-12.reviewed.md` §7/§8/§9/§12,
narrowed by owner decisions in
`.project/plans/research-phase-2-in-app-authoring-scoping-2026-07-14-6879.md`
(2026-07-14). **Additive to the existing CLI, not a replacement**: the
operator-run `create-catalogue`/pipeline-extraction/`record-consent`
flow (pipeline.md) remains how a fresh or self-hosted deployment seeds
its initial catalog; this section is a second entry point for an
already-running server's authenticated owners.

**Storage: Railway volume, same on-disk format the pipeline already
writes** (owner decision) — an authoring write lands in the same
`catalog/<catalogue-slug>/<song-slug>/` layout `pipeline.md`'s Inputs &
Outputs On Disk already documents, so `catalog-static.ts` (which already
serves that volume) needs no change. There is exactly one on-disk format
for song content, whether it arrived via CLI or web upload.

**Mutation model.** `HandlerContext.catalog` (Song Catalog Delivery,
above) — built once at `createServer()` today — becomes mutable at
runtime: an authoring write triggers `loadCatalog()` to re-scan (or a
narrower incremental update, an implementation detail for the plan, not
a design commitment here) and the server re-broadcasts `catalog` to every
session whose visible set changed, reusing the same broadcast shape
`catalogue-unlock` already uses when a session's unlocked set grows. This
is the first place the in-memory catalog is a **store**, not a
build-once snapshot (constitution Principle I still applies — one
authoritative in-memory catalog store server-side, not per-request
re-derivation).

**Per-user visibility.** An owner must see their own not-yet-published
catalogue when *they* join a session, even before anyone unlocks it —
the first time `visibleCatalog()`'s output differs by *recipient*, not
just by session. `visibleCatalog(catalog, session, userId)` gains a third
parameter: in addition to the existing `unlockedCatalogueIds` check, a
catalogue is also visible to a session if the joining/requesting
participant's `userId` has a `CatalogueOwnership` row for it — checked via
the index on `CatalogueOwnership.ownerId` (datamodel.md).

**Upload trust surface.** The server now parses attacker-supplied content
at request time — a `.gp` file is a zip container carrying XML the
pipeline reads raw (`score.gpif`), and pipeline extraction also makes
network calls to `lrclib.net` (pipeline.md), which as of this feature can
be triggered by an untrusted upload rather than only an operator's own
CLI invocation. Required, not optional, before this ships to the public
deployment: a request body size limit, a parse timeout (the pipeline's
extraction stage must not be allowed to hang the request indefinitely),
and staging — a rejected/malformed upload never reaches the live catalog
directory or triggers a `catalog` re-broadcast. Owner-authentication (the
`CatalogueOwnership` check above) is the first gate; these are the
second, defending against a legitimate owner's account being used to
submit a malformed or oversized file, deliberately or not.

**Consent gating (build vs. ship).** The authoring mechanism itself is not
gated on real consent/ToS text existing (owner decision) — self-hosted/
local deployments can use it immediately. The **public Railway
deployment** must not accept uploads until real text replaces the
`dev-placeholder` `tosVersion` (datamodel.md's Production Annotations) —
enforced as a runtime feature flag (e.g. an env var gating the upload
route's availability, mirroring `REQUIRE_SONG_CONSENT`'s existing
self-hosted-vs-public-deployment pattern in Song Consent Gate, below),
not a code-absence. In-app consent capture (ui.md) writes the same
Consent Record shape (datamodel.md) the CLI's `record-consent` writes
today — one record format, two entry points, same as catalog storage
above.

**Server-side pipeline execution.** Running the extraction pipeline
server-side (rather than only as an operator's local CLI invocation) was
already validated as feasible during the original design spike —
`@coderline/alphatab` already runs in Node (this is how the pipeline's
existing CLI extraction works today; nothing new needed there). What's
new is running it inside an HTTP request handler, subject to the timeout/
staging requirements above rather than a CLI's unlimited runtime.

## Production Posture

Originally a self-hosted / small-group tool with no auth and no rate limiting.
**Optional OAuth user accounts are now part of this build** (User Accounts,
above; constitution v1.5.0), added additively so the anonymous path is
unchanged and the server still runs with no auth configured. **Rate limiting
remains out of scope** — including on wrong activation-key and failed-login
attempts, a separate still-open hardening concern the OAuth callback + Postgres
raise the stakes of but do not resolve here. The long-standing intent that
auth-adjacent code resolve "who is this participant" in one place rather than
scattering that assumption across handlers still holds, now realized by the
single cookie → `AuthSession` → `userId` resolution seam.

## Song Consent Gate (Public Deployment Only)

Off by default (`ServerConfig.requireSongConsent`, env
`REQUIRE_SONG_CONSENT`, default `false`), mirroring the existing
`hostReassignGraceMs`/`HOST_REASSIGN_GRACE_MS` config pattern
(`server/src/config.ts`). This distinguishes the two deployment modes the
`consented-song-submission` feature is scoped around: a personal/local
deployment (default — every song directory under `catalog/` loads exactly
as it does today, no consent concept in play at all) versus an operator's
public-facing deployment (`REQUIRE_SONG_CONSENT=true`), where
`catalog-loader.ts` additionally requires a valid consent record
(datamodel.md's Consent Record) to be present in a song's directory before
including it in the published `CatalogSong[]` — a song directory lacking
one is skipped entirely at load time (logged once at startup, not silently
dropped) rather than partially served. This is a load-time filter, not a
per-request or per-client check: there is no mechanism to identify "the
submitter's own connecting client" distinct from anyone else's (the
optional user-accounts layer authenticates app *users*, not song
*submitters* — there is no authenticated submitter identity; User Accounts
above), so a song without
recorded consent is excluded from the catalog for every client uniformly,
including its own submitter, rather than selectively visible to them —
see datamodel.md's Consent Record section for why this is the resolved
reading of the feature's "not served to clients other than its own
submitter" framing, not a narrower literal implementation of it. A
submitter previews their own not-yet-consented song by running the app
against their own local/personal deployment (the already-fully-supported,
gate-off case) before deciding to submit it for public distribution — not
by connecting to the public deployment itself.

## Deployment (Railway + Terraform)

Gives the Production Posture/Song Consent Gate sections above an actual
deployment target: a public instance on [Railway](https://railway.app/),
provisioned via Terraform rather than click-ops through Railway's
dashboard. This section owns *how the system runs once deployed*;
Production Posture and Song Consent Gate above still own the posture
decisions (optional OAuth accounts, `REQUIRE_SONG_CONSENT`) this deployment
target turns on.

**Single Railway service, one process.** The server already serves the
catalog directory statically over the same `http.Server` instance as the
WebSocket upgrade (Song Catalog Delivery, above) — a single Dockerfile
builds the whole pnpm workspace (client + server + `packages/shared`) and
the server additionally serves the built client SPA (`client/dist`) as a
static fallback route (any request not matched by `/catalog/...` or the
WS upgrade). One Railway service, one process, one Railway-assigned port
— deliberately not a two-service split (separate static hosting +
separate API service): that would require the client and server to know
each other's URLs at build time, reintroducing exactly the kind of
environment-specific config drift Principle VIII's `.env` convention
exists to prevent, for no benefit at this app's scale.

**Client WS connection gains a same-origin production mode.**
`client/src/ws-client.ts`'s `connect()` currently always builds
`ws://${location.hostname}:${backendPort}`, defaulting `backendPort` to
`'6080'` when `VITE_BACKEND_PORT` is unset — a shape that only makes
sense for dev/e2e, where the client and backend run as separate
processes on separate ports. It breaks under Railway's HTTPS-only,
single-assigned-port model: there is no separate backend port to point
at, and `ws://` (not `wss://`) would be a mixed-content failure under
HTTPS. Production build: when `VITE_BACKEND_PORT` is unset, connect to
`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
instead — same-origin, no explicit port, protocol matching the page's
own. Dev and e2e are unaffected: `playwright.config.ts`'s `webServer`
entries and `client/.env`/`client/.env.example` continue setting
`VITE_BACKEND_PORT` explicitly (`6080`/`6081`), taking the existing
explicit-port branch.

**Catalog content via a Railway volume.** `catalog/` is gitignored (real
commercial `.gp` files never belong in the repo, per the existing
local-deployment model) and Terraform has no legally-clear content to
seed — a Railway volume is provisioned and mounted at whatever path
`CATALOG_ROOT` points to on the deployed service, but populating it stays
the operator's job, out-of-band, the same operator-driven model
`pipeline.md` already documents for local catalogs (Terraform provisions
the empty volume; it does not run the pipeline or upload songs).

**`REQUIRE_SONG_CONSENT=true` by default on the deployed environment.**
Unlike local/personal deployments (default `false`, Song Consent Gate
above), the Railway service is a public deployment by definition —
Terraform sets `REQUIRE_SONG_CONSENT=true` as a service environment
variable for it, distinct from (and not overriding) the `false` default
`server/.env.example` documents for local dev.

**Terraform provider**: the community-maintained
[`terraform-community-providers/railway`](https://registry.terraform.io/providers/terraform-community-providers/railway)
provider — Railway has no first-party official Terraform provider as of
this writing. Documented here as an accepted, flagged dependency risk
(third-party-maintained, not Railway-official), not a silent assumption;
revisit if Railway ships an official provider or this one goes
unmaintained.

**Terraform state**: a local `infra/terraform.tfstate` file, gitignored
— no remote state backend (e.g. Terraform Cloud) is introduced. Matches
this project's existing single-operator/self-hosted reasoning elsewhere
in this doc (single-operator infra, no rate limiting, fixed-interval reconnect
over exponential backoff): one operator, one deployment, nothing to
coordinate across. Revisit only if multiple operators ever need to
collaborate on the same infrastructure.

**Config split.** Constitution Principle VIII's `.env`/`.env.example`
convention governs local dev and CI config only — it has no bearing on
the deployed Railway service's environment variables, which are
Terraform-managed (`infra/`'s `.tf` files and variables) instead. These
are two different mechanisms for two different environments, not one
convention extended to cover both; a value like `REQUIRE_SONG_CONSENT`
can therefore legitimately differ between `server/.env.example`'s
documented local default and the value Terraform sets on the deployed
service, per the point directly above.

**User-accounts datastore & secrets (out-of-band, not Terraform-managed).**
The optional Postgres store (User Accounts, above) is **not** provisioned by
Terraform — the community Railway provider has no database/plugin resource
(spike: `.project/spike-datastore-secrets-2026-07-12.md`), and a DIY
`postgres`-image service would force `POSTGRES_PASSWORD` into plaintext
`terraform.tfstate`. Instead the operator creates the Postgres service **once,
by hand in the Railway dashboard**; the app service receives `DATABASE_URL` as
a Railway **reference variable** (`${{Postgres.DATABASE_URL}}`) resolved at
deploy time, so only that non-secret reference string ever lives in state.
**Secrets never enter tfstate** — Terraform's `sensitive = true` does *not*
keep values out of state, so the separation is structural, not a flag: the
OAuth client secrets and the `AuthSession`-signing/id secret live canonically
in 1Password and are pushed to Railway as **sealed** service variables via the
CLI (`railway variables --set "…=$(op read …)"`), out of band from Terraform,
which manages only topology and non-secret variables. No Supabase (spike). Two
operational caveats, tracked under Production Annotations: the hand-created
Postgres service is invisible to Terraform (a project-level `terraform destroy`
won't remove it and could orphan it), and sealed variables are not copied into
a duplicated Railway environment.

**New repo layout**: a top-level `Dockerfile` (builds the pnpm workspace,
runs the server) and an `infra/` directory (Terraform config: Railway
project, service, volume, and environment variables — **not** the Postgres
database or any secret, which are provisioned out-of-band per the point
above).

**Custom domain — deliberately deferred.** The Railway-assigned
`*.up.railway.app` domain is sufficient for this deployment, so no custom
domain is provisioned; this is a resolved deferral, not an undecided
design question. Revisit only if a public-facing branded URL becomes a
real requirement — at which point it's a Terraform addition
(`railway_custom_domain` plus DNS), not a rework of anything here.

## Production Annotations

- **User-accounts datastore and secrets are provisioned out-of-band, not in
  IaC.** The Postgres service (created by hand in the Railway dashboard) and
  every secret (OAuth client secrets + the `AuthSession` signing/id secret,
  held in 1Password and pushed as Railway sealed variables) sit outside
  Terraform (Deployment section). Consequences to hold: the deployment is *not*
  fully reproducible from `infra/` alone (a runbook step recreates the DB and
  sets the sealed vars); the hand-created Postgres service is invisible to
  Terraform, so a project-level `terraform destroy` won't remove it and could
  orphan it; and sealed variables don't propagate to a duplicated Railway
  environment. This is a deliberate trade to keep secrets out of plaintext
  `tfstate` without encrypting state (constitution v1.5.0 owner decision), not
  an oversight — revisit if a first-party Railway Terraform Postgres resource
  or a fully-IaC secret path becomes available.
- **OAuth is hand-rolled, not a managed auth service.** The Google/GitHub
  Authorization-Code flow (`state`/PKCE/nonce), the `AuthSession` table, and
  cookie verification are implemented in-app rather than delegated to a managed
  provider (User Accounts section; the spike rejected Supabase for the
  cookie-on-WS requirement). This is a security-sensitive surface — the
  `state`/PKCE/nonce validation, the `Origin` allowlist on the WS upgrade, and
  session revocation are load-bearing and must be verified against current
  OAuth/session best practice, not assumed correct.
