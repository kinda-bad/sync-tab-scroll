---
status: approved
branch: song-catalog-selection
created: 2026-07-01
---

# Plan: Song Catalog Listing & Selection

## Motivation

`ui.md`'s Lobby View has always described a song-catalog picker, and the
server already loads the full catalog at startup (`catalog-loader.ts`),
but nothing wires the two together: `Lobby.svelte` shows a placeholder,
`Playback.svelte` hardcodes `/test/creep.gp`, and no client message exists
for listing or selecting a song. `/ardd-feature` (this session) closed the
*design* gap across `datamodel.md`, `infrastructure.md`, and `ui.md`; this
plan closes the *implementation* gap.

**Scope expanded during planning**: `App.svelte`'s three views
(`Landing`/`Lobby`/`Playback`) were each built and verified independently
for the live-rendering pivot, but were never actually chained together.
`Landing.svelte` is an empty stub, `clientStore.view` never transitions
away from `'landing'`, and `Lobby.svelte`/`Playback.svelte` each open
their *own* `wsClient` and call `session-create`/`session-join`
independently (driven by URL query params, e.g. `?join=code`,
`?part=lyrics`) rather than sharing one session through the store. Song
selection can't be demonstrated end-to-end — the actual point of this
feature — without a session that survives the Landing→Lobby→Playback
transition, so that wiring is now part of this plan rather than a
separately filed gap.

## Scope

**In scope:**
- Server: rewrite catalog-loader output paths to client-fetchable URLs,
  serve `catalog/` as static HTTP content alongside the existing WS
  upgrade, add a `catalog` server message sent on session create/join,
  add a host-only `song-select` client message + handler.
- Shared: `CatalogSong.id`, new `ClientMessage`/`ServerMessage` variants.
- Client: real catalog picker in `Lobby.svelte` (replacing the
  placeholder), reset-selected-parts-on-reselect behavior, wiring
  `Playback.svelte`'s alphaTab/headless-player construction and the
  in-tab lyrics overlay / full lyrics view to `session.selectedSong`'s
  real `CatalogSong` instead of the hardcoded fixture and
  hand-transcribed `LYRIC_LINE_BREAKS` array.
- At least one real catalog entry on disk (`catalog/<slug>/meta.json` +
  `.gp` + `.lrc`) to test against end-to-end — the existing `creep.gp`/
  `creep.lrc` test fixtures under `client/public/test/` are the natural
  source material to move into a real catalog directory.
- Landing.svelte: a real create/join form (per `ui.md`'s Landing View —
  create a session or join by code, persist code + display name for
  silent rejoin on refresh).
- A single `wsClient`/session lifted to `App.svelte` (or a small
  connection module it owns) and passed down, replacing each view's
  independent `session-create`/`session-join` call — so the same session
  and socket survive `clientStore.view` transitioning between all three
  views.
- `clientStore.view` actually transitioning: `'landing'` → `'lobby'` on
  successful session-create/join, `'lobby'` → `'playback'` on playback
  start (`PlaybackState.status` becoming `'running'`).

**Out of scope:**
- Removing the `client/public/test/` fixtures outright (may still be
  useful for isolated alphaTab/lyrics testing) — just no longer the only
  path into Playback.
- Any change to playback sync, metronome, lobby cursor, or theming — all
  already implemented and unaffected by this feature.
- Multi-catalog-root or catalog hot-reload — the existing "scan once at
  startup" behavior (`catalog-loader.ts`) is unchanged.

## Technical Approach

Reference `infrastructure.md`'s new "Song Catalog Delivery" section and
`datamodel.md`'s updated `CatalogSong` table rather than repeating the
design here. Key implementation points:

- **HTTP static serving**: `server.ts` currently constructs a bare
  `WebSocketServer({ port })`, which internally creates its own
  `http.Server`. Switch to constructing an explicit `http.Server` first
  (serving static files under `catalog/` for any `GET /catalog/...`
  request), then passing `{ server }` to `WebSocketServer` so both share
  one listener on one port — matching infrastructure.md's "share the same
  underlying `http.Server` instance" decision. A minimal static file
  handler (path-traversal-safe: resolve and check the resolved path stays
  under `catalogRoot`) is enough; no need for a general-purpose static
  middleware dependency for two file extensions (`.gp`, `.lrc`).
- **URL rewriting**: `catalog-loader.ts` currently sets `gpFilePath` and
  `lyricsLrc` to disk paths (`path.join(songDir, gpFile)`). Add a
  `catalogUrlPrefix` (e.g. derived from `dir.name`) so these become
  `/catalog/<slug>/<filename>` instead — the disk path is only used
  server-side to read the file when serving the HTTP request.
- **`CatalogSong.id`**: set from the directory name (`dir.name`), matching
  datamodel.md's "matches the catalog directory name" note.
- **Catalog delivery**: add `ServerMessage` variant
  `{ type: 'catalog'; songs: CatalogSong[] }`. Server sends it once, right
  after the existing `session-state` broadcast in `session-create`'s and
  `session-join`'s handlers (`ctx.connections.send(socket, { type:
  'catalog', songs: ctx.catalog })`) — a direct send to the joining socket,
  not a session broadcast, since it's identical for every client and
  doesn't depend on session state.
- **Song selection**: add `ClientMessage` variant
  `{ type: 'song-select'; songId: string }`. New handler
  `handleSongSelect` mirrors `playback-control.ts`'s host-only check
  (`session.hostId !== conn.participantId` → error). On a valid host
  selection: look up the song in `ctx.catalog` by `id`, set
  `session.selectedSong = song.id`, `session.availableParts = song.parts`,
  and reset every participant's `selectedPart = null` /
  `readiness = 'no-part'` (ui.md's reset-on-reselect rule) before
  broadcasting `session-state`.
- **Client store**: extend whatever the client's WS-message handling
  already does for `session-state` to also handle the new `catalog`
  message, storing `CatalogSong[]` in `clientStore` alongside `session`.
- **Lobby.svelte**: replace the placeholder with a list of catalog
  entries (name + artist); host-only click sends `song-select`; remove
  the now-stale TODO comment.
- **Playback.svelte**: derive `gpFilePath`, `trackIndex` (from the
  participant's `selectedPart` looked up against
  `session.availableParts`), and the lyrics pointer
  (`lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks`/`lyricsLrc`)
  from the catalog entry matching `session.selectedSong`, instead of the
  hardcoded fixture and hand-transcribed array. Remove the resolved TODO
  comment.
- **Shared connection lifecycle**: move `createWsClient(...)` +
  `session-create`/`session-join` out of `Lobby.svelte`/`Playback.svelte`
  and into `App.svelte` (constitution Principle III — entry/bootstrap
  wiring belongs at the top, not duplicated per view), called once when
  `Landing.svelte`'s form submits. Store the resulting `WsClient` in
  `clientStore` (or a sibling store, still singular per Principle I) so
  every view reads/sends through the same instance. Each view no longer
  parses `?join=`/`?part=` itself — `Landing.svelte` owns the create/join
  form fields, and part selection already flows through the existing
  `part-select` message (`part-select.ts`), not a URL param.
- **View transitions**: `clientStore.view` moves `'landing'` → `'lobby'`
  the moment a `session-state` message is first received (i.e. the
  create/join succeeded) — driven from the same WS-message handler that
  already updates `session`/`selfParticipantId` (`ws-client.ts`), not a
  separate signal. `'lobby'` → `'playback'` moves when
  `session.playbackState.status` transitions to `'running'` — read this
  in the same subscriber, not duplicated per view.

**Discovered during implementation (after phases 1-3 landed)**: three
integration gaps the server-only phases couldn't surface, resolved before
writing phase 4-6 tasks:

- **Dev proxy**: `gpFilePath`/`lyricsLrc` are root-relative
  (`/catalog/...`), but the client runs on Vite's dev port with no proxy
  to the server's port — same-origin proxy added to `vite.config.ts`
  rather than absolute cross-origin URLs (which would also need CORS
  headers `catalog-static.ts` doesn't set).
- **Nothing triggers playback start**: the Lobby→Playback transition is
  keyed on `playbackState.status === 'running'`, but no client code sent
  `playback-control: start` anywhere. Added a host-only "Start" button in
  the Lobby view (ui.md already places transport controls conceptually
  with the host; a lobby-side start button is the coherent trigger for a
  status-driven transition that fires *before* Playback exists to host
  its own controls).
- **Renderer lifecycle vs. ui.md's readiness model**: ui.md states
  per-participant loading/readiness (alphaTab init + SoundFont load)
  happens *in the lobby*, so the host can wait for everyone before
  starting — but renderer creation living inside `Playback.svelte` (as
  built for the live-rendering pivot) only mounts after playback already
  started, so lobby readiness could never actually reach `ready`.
  Resolved in favor of ui.md's stated model: renderer/headless-player
  creation moves to fire the moment a participant's part is known (song
  selected + `selectedPart` set), not on `Playback.svelte` mount, and the
  instance/container persists across the Lobby→Playback view switch
  instead of being torn down and recreated. Concretely: the tab/overlay/
  full-lyrics container elements move to `App.svelte` (always mounted,
  visibility toggled by CSS on `$clientStore.view` rather than
  conditional rendering), and engine creation/teardown logic is extracted
  into its own module (e.g. `playback-engine.ts`) callable from wherever
  `selectedPart` becomes known, not duplicated per view.

## Phase Breakdown

1. **Server: catalog URL rewriting + static serving** — `catalog-loader.ts`
   emits URL paths; `server.ts` serves `catalog/` over HTTP on the same
   port as the WS upgrade. Testable in isolation: `curl` a real catalog
   asset back.
2. **Shared + server: catalog delivery and song-select messages** — new
   `CatalogSong.id` field, new `ClientMessage`/`ServerMessage` variants,
   `handleSongSelect` handler wired into `dispatch.ts`, catalog sent on
   `session-create`/`session-join`. Testable in isolation: a scripted WS
   client can create a session, receive `catalog`, send `song-select`,
   and see `session-state` reflect `selectedSong`/`availableParts` and
   reset participant parts.
3. **Real catalog fixture** — move (or copy) the `creep.gp`/`creep.lrc`
   test fixtures into a real `catalog/creep/` directory with a `meta.json`
   (depends on knowing the real `lyricsTrackIndex`/`lyricsLineIndex`/
   `lyricLineBreaks` values already hand-transcribed into
   `Playback.svelte`'s `LYRIC_LINE_BREAKS` — carry those into `meta.json`
   rather than re-deriving them). Testable in isolation: server startup
   log shows the catalog loaded with one entry.
4. **Client: shared connection + view transitions** — implement
   `Landing.svelte`'s create/join form, lift `wsClient`/session creation
   to `App.svelte`, wire `clientStore.view` transitions
   (`landing`→`lobby` on session-state received, `lobby`→`playback` on
   `playbackState.status === 'running'`), add the Vite dev proxy for
   `/catalog`, and add the host-only "Start" button in the Lobby that
   sends `playback-control: start`. Depends on nothing upstream
   (independent of phases 1–3) but is a prerequisite for phases 5–6.
   Testable via real browser session: land, create a session, confirm
   the view switches to Lobby with no manual URL param; host clicking
   Start flips playback state to running.
4b. **Client: persistent renderer lifecycle** — extract the alphaTab/
   headless-player creation, lyrics-overlay wiring, and drift-correction
   subscription currently in `Playback.svelte`'s `onMount` into a
   standalone module; move the tab/overlay/full-lyrics container
   elements into `App.svelte` (always mounted, CSS-hidden outside
   `view === 'playback'`); trigger creation as soon as `selectedPart` is
   known (in the Lobby), not on `Playback.svelte` mount — matching
   ui.md's stated per-participant loading/readiness happening pre-start.
   Depends on phase 4. Testable via real browser session: readiness
   reaches `'ready'` for a participant while still in the Lobby view
   (before the host clicks Start).
5. **Client: Lobby catalog picker** — replace the placeholder, wire
   `song-select`, add the client-store handling for the `catalog`
   message. Depends on phases 1–3 (server-side catalog plumbing) and
   phase 4 (shared session). Testable via real browser session (two
   tabs: host picks a song, both tabs' lobby state updates).
6. **Client: Playback real-song wiring** — replace the hardcoded fixture
   and `LYRIC_LINE_BREAKS` in `Playback.svelte` with values read from the
   selected `CatalogSong`. Depends on phase 5. Testable via real browser
   session: full Landing → Lobby → Playback flow with a real song
   selection and the host starting playback, verifying tab render,
   lyrics overlay, and full lyrics view all still work against the
   catalog-sourced data (not the old fixture path) and that the view
   transitions automatically at each step.

Phases 1–3 are server-only and independently testable without a browser;
phases 4–6 require the same real-browser verification discipline used
throughout this project (no claiming "done" without exercising the actual
flow) — phase 6 in particular is the first time the full three-view flow
is exercised end-to-end with no manual query-param navigation.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Server gains a small hand-rolled static file handler instead of an Express/Fastify dependency | Two file extensions, one directory tree, path-traversal check is a few lines — a full HTTP framework would be a new dependency and a new set of idioms for a WS-first server, for less code than it replaces (constitution Principle V doesn't apply in reverse: there's no library idiom being reinvented here, since `ws`'s `WebSocketServer` already accepts a raw `http.Server` to attach to). |

## Open Questions

None — `/ardd-feature`'s design pass resolved the shape of every new
field and message before this plan was drafted.

## Production Annotation Summary

- The hand-rolled static file handler should get a one-line comment at
  its path-resolution check noting *why* (traversal safety), per
  constitution Quality Standards — not a broader shortcut needing a
  Principle VI annotation, since production posture (no auth/rate
  limiting) already covers this server per infrastructure.md.
