---
plan: plan-song-catalog-selection-2026-07-01.md
generated: 2026-07-01
status: in-progress
---

# Tasks

## Phase 1: Server — catalog URL rewriting + static serving

- [x] T001 [artifacts: infrastructure] Rework `server/src/server.ts` (`createServer`) to construct an explicit `http.Server` first, add a request handler on it that serves static files under the configured `catalogRoot` for any `GET` path starting with `/catalog/` (resolve the requested path, verify — with a one-line comment stating why — the resolved path stays under `catalogRoot` before reading it, 404 otherwise), then pass `{ server }` into `new WebSocketServer(...)` instead of `{ port }` so both share one listener. Test: write a small server-side test (or a scripted `http.get`/`fetch` against a running instance) that requests a real file placed under a temp `catalogRoot` and asserts the response body matches the file contents, and that a path-traversal attempt (e.g. `/catalog/../server.ts`) 404s.
- [x] T002 [artifacts: datamodel, infrastructure] Update `server/src/catalog-loader.ts`'s `loadCatalog` to set `CatalogSong.gpFilePath` and `lyricsLrc` to URL paths of the form `/catalog/<dir.name>/<filename>` (matching T001's serving route) instead of the current `path.join(songDir, ...)` disk paths; keep the disk path only as an internal local variable for the `fs.existsSync`/`fs.readFileSync` calls already there. Test: extend/add a unit test for `loadCatalog` against a fixture directory asserting the returned `CatalogSong.gpFilePath`/`lyricsLrc` are `/catalog/...` URL strings, not filesystem paths.

## Phase 2: Shared + server — catalog delivery and song-select messages

- [x] T003 [artifacts: datamodel] [parallel] Add `id: string` to the `CatalogSong` interface in `packages/shared/src/index.ts` (per datamodel.md: "Stable song slug, matches the catalog directory name"), and set it from `dir.name` in `catalog-loader.ts`'s `loadCatalog` (same function touched in T002 — sequence after T002 to avoid overlapping edits to the same return object). Test: extend the `loadCatalog` fixture test from T002 to assert `id` equals the fixture directory's name.
- [x] T004 [artifacts: infrastructure] [parallel] Add a new `ServerMessage` variant to `packages/shared/src/messages.ts`: `{ type: 'catalog'; songs: CatalogSong[] }`. No test on its own (a type-only addition); covered by T006's test.
- [x] T005 [artifacts: infrastructure] [parallel] Add a new `ClientMessage` variant to `packages/shared/src/messages.ts`: `{ type: 'song-select'; songId: string }`. No test on its own (a type-only addition); covered by T007's test.
- [x] T006 [artifacts: infrastructure] In `server/src/handlers/session-create.ts` and `server/src/handlers/session-join.ts`, after the existing `ctx.connections.broadcast(...)` call that sends `session-state`, add `ctx.connections.send(socket, { type: 'catalog', songs: ctx.catalog })` (direct send to the joining socket, not a broadcast — matches infrastructure.md's "Song Catalog Delivery" section). Test: a scripted two-message WS test (matching the style of the earlier `lobbyCursorTick` verification) — connect, send `session-create`, assert the socket receives both a `session-state` message and a `catalog` message containing the loaded catalog.
- [x] T007 [artifacts: infrastructure, datamodel] Add `server/src/handlers/song-select.ts` exporting `handleSongSelect`, mirroring `playback-control.ts`'s host-only check (`session.hostId !== conn.participantId` → send `{ type: 'error', message: 'Only the host can select a song' }` and return). On a valid host request: find the song in `ctx.catalog` by `id === message.songId` (send an error and return if not found), set `session.selectedSong = song.id`, `session.availableParts = song.parts`, then reset every entry in `session.participants` to `selectedPart: null, readiness: 'no-part'` (ui.md's reset-on-reselect rule) before broadcasting `session-state`. Wire it into `server/src/dispatch.ts`'s switch (new `case 'song-select': return handleSongSelect(ctx, socket, message);`). Test: scripted WS test — create a session with 2 participants where one has already picked a part, send `song-select` as host, assert the broadcast `session-state` shows the new `selectedSong`/`availableParts` and both participants' `selectedPart`/`readiness` reset; also assert a non-host `song-select` attempt gets the host-only error and no state change.

## Phase 3: Real catalog fixture

- [x] T008 [artifacts: datamodel, infrastructure] (used the real `packages/pipeline` `extract-lyrics` CLI against a renamed copy of the test fixture rather than hand-authoring meta.json — produced real per-track parts and the same `lyricLineBreaks` already validated in `Playback.svelte`; `catalog/` added to `.gitignore` alongside the existing `client/public/test/` exclusion since it's the same commercial `.gp` content) Create `catalog/creep/` containing the existing `client/public/test/creep.gp` (copy, not move — keep the original test fixture per the plan's "out of scope" note) renamed to match what `catalog-loader.ts` expects (any `.gp` file in the directory), a `lyrics.lrc` copied from `client/public/test/creep.lrc`, and a `meta.json` with `name`, `artist`, `parts` (at least one `CatalogPart` — inspect the `.gp` file's track list, e.g. via a quick alphaTab parse or existing pipeline tooling, to pick a real `trackIndex` and a sensible `instrumentName`), `lyricsTrackIndex: 0`, `lyricsLineIndex: 0`, and `lyricLineBreaks` copied verbatim from `Playback.svelte`'s current `LYRIC_LINE_BREAKS` array (`[6, 7, 6, 5, 8, 6, 6, 6, 8, 9, 5, 6, 6, 7, 6, 9, 5, 6, 6, 8, 9, 9, 13, 5, 8, 5, 7, 5, 6, 6, 8, 9, 5, 5]` — already validated against this exact file, per the comment at `Playback.svelte:19-25`). Test: start the server locally with `CATALOG_ROOT` pointed at this directory and confirm (via a log line or the T006 test pointed at the real catalog) that `loadCatalog` returns one `CatalogSong` with `id: 'creep'` and non-null lyrics fields.

## Phase 4: Client — shared connection + view transitions

**Note (2026-07-02, `/ardd-implement`)**: T009-T013 browser-verified this
session (two real tabs, separate origins to avoid shared-localStorage
cross-talk: `localhost` + `127.0.0.1`). T011c/T014 found a real defect —
see notes below. Two unrelated dev-environment issues surfaced and were
fixed/flagged, not silently absorbed:
- `CATALOG_ROOT` defaults to `./catalog` in `server/src/config.ts`, which
  doesn't resolve under `pnpm --filter server dev`'s cwd (`server/`) — the
  catalog loaded empty until `CATALOG_ROOT=<repo>/catalog` was set
  explicitly. Flagging for `/ardd-verify`; not fixed here (out of scope).
- `client/vite.config.ts` gained `optimizeDeps.exclude: ['@coderline/alphatab']`
  — the dep-optimizer's own bundle of `alphaTab.worker.mjs` never resolved
  under Vite dev (request stayed pending forever, blocking
  `soundFontLoaded`/readiness). This is a real, committed fix, verified to
  unblock readiness. See T011c for the *separate* rendering defect this
  fix uncovered.

- [x] T009 [artifacts: infrastructure, datamodel] Implement `client/src/views/Landing.svelte` as a real create/join form per ui.md's Landing View: a display-name input, a "Create session" button, a join-code input + "Join" button. On submit, call a shared connection function (T010) with the appropriate `session-create`/`session-join` message. Persist `sessionCode`/`displayName` to `localStorage` on success so a refresh can silently rejoin (attempt an automatic `session-join` with the stored code on mount if present). Test: component test (or manual browser test folded into T011's end-to-end check) confirming the create button sends `session-create` with the entered display name.
- [x] T010 [artifacts: infrastructure] Extract the connection bootstrap (currently duplicated in `Lobby.svelte`'s and `Playback.svelte`'s `onMount`) into a single function callable from `App.svelte`/`Landing.svelte` — e.g. a `connect(displayName, joinCode?)` helper in `ws-client.ts` or a new small module — that creates one `WsClient`, sends `session-create` or `session-join`, and stores the `WsClient` instance somewhere every view can read (a field on `clientStore`'s state, or a separate singleton module, per constitution Principle I — one reactive source, not a second ad hoc global). Remove the per-view `createWsClient(...)` + `session-create`/`session-join` calls from `Lobby.svelte` and `Playback.svelte` (they'll read the shared client instead, wired in T011/T013). Test: none standalone — covered by T011.
- [x] T011 [artifacts: infrastructure] In `client/src/store.ts`'s WS-message handling (`ws-client.ts`'s `message` listener), transition `clientStore`'s `view` field: set to `'lobby'` the first time a `session-state` message is received while `view === 'landing'`; set to `'playback'` when an incoming `session-state`'s `session.playbackState.status === 'running'` while `view === 'lobby'`. Also handle the new `catalog` message type here (store `CatalogSong[]` on `clientStore`, per T012). Update `client/src/App.svelte` to no longer need any manual view-switch triggers — it already reads `$clientStore.view` reactively. Test: real browser session — load the app, submit the Landing form, confirm the DOM shows Lobby's `<h1>Lobby</h1>` with no URL query params involved.
- [x] T011a [artifacts: infrastructure] [parallel] Add a Vite dev proxy in `client/vite.config.ts` (`server.proxy['/catalog'] = { target: 'http://localhost:8080' }` or equivalent) so catalog asset URLs (`/catalog/<slug>/...`) resolve same-origin from the client's dev port instead of 404ing or requiring CORS. Test: with the server running against the real `catalog/radiohead-creep/` fixture (T008), `curl http://localhost:<vite-port>/catalog/radiohead-creep/meta.json`-equivalent (a `fetch` from the running dev client) returns the file, not a 404.
- [x] T011b [artifacts: infrastructure, ui] Add a host-only "Start" button to `Lobby.svelte` that sends `{ type: 'playback-control', action: 'start' }` (only shown/enabled when `isHost`) — this is what actually produces the `playbackState.status === 'running'` transition T011 keys the view switch on; nothing in the client currently sends this message at all. Test: real browser session, two tabs — host clicks Start, both tabs' view switches to Playback (extends T011's browser test).

## Phase 4b: Client — persistent renderer lifecycle

- [ ] T011c [artifacts: infrastructure, ui, datamodel] Extract the alphaTab/headless-player creation, lyrics-overlay wiring (`walkLyricBeats`/`groupIntoLines`/`createLyricsOverlay`), full-lyrics `.lrc` fetch/highlight logic, and the `clientStore`-driven drift-correction subscription — all currently inside `Playback.svelte`'s `onMount` — into a standalone module (e.g. `client/src/playback-engine.ts`) exporting something like `ensurePlaybackEngine(containers, catalogSong, trackIndex, isLyricsPart)` that is idempotent (safe to call once and have later calls no-op if already created for the same part). Move the tab container, overlay container, and full-lyrics `div`s out of `Playback.svelte` and into `App.svelte` so they're always mounted (not destroyed/recreated on view switch); toggle their visibility via a CSS class keyed on `$clientStore.view === 'playback'` rather than conditional `{#if}` rendering. Call `ensurePlaybackEngine(...)` as soon as `session.selectedSong` and the current participant's `selectedPart` are both non-null (in the Lobby, via a `clientStore` subscription — not gated on `view === 'playback'`), matching ui.md's stated per-participant loading/readiness happening before the host starts playback. `Playback.svelte` itself becomes minimal: it just shows/hides the persistent containers and host controls (toggle overlay/theme, start/pause/seek) rather than owning renderer creation. Test: real browser session — a participant's readiness reaches `'ready'` while still viewing the Lobby (before the host clicks Start from T011b), proving the renderer initializes pre-transition as ui.md describes.

  **BLOCKED — real defect found, not fixed (2026-07-02).** Readiness
  *does* reach `'ready'` pre-Start as designed (verified). But the tab
  canvas renders **blank** in Playback: `createTabRenderer`'s
  `scoreLoaded` handler calls `api.render()` while the container is still
  `display:none` (per this task's own prescribed mechanism — engine
  containers are created in the Lobby and shown via a CSS class toggle on
  view change). alphaTab logs `AlphaTab skipped rendering because of
  width=0 (element invisible)` and never re-renders once the container
  becomes visible. Confirmed via diagnostic: manually forcing a re-render
  post-transition (clicking the theme toggle, which calls `api.render()`
  again) makes the notation appear correctly — so scoreLoad/parse/settings
  are all fine, only the render-while-hidden timing is broken. This
  contradicts the task's own prescribed approach (`display` toggle), so
  it's a design call, not a one-line fix — needs a decision: re-render on
  the Lobby→Playback transition, `visibility:hidden` instead of
  `display:none` (keeps layout box, alphaTab may render into 0-visible
  width differently — unverified), or defer `ensurePlaybackEngine`'s
  render call until first shown. Left unchecked; do not mark `[x]` until
  resolved and re-verified.

## Phase 5: Client — Lobby catalog picker

- [x] T012 [artifacts: datamodel] Add a `catalog: CatalogSong[]` field to `ClientState` in `client/src/store.ts` (default `[]`), populated by the `catalog` message handling added in T011.
- [x] T013 [artifacts: infrastructure, ui] Replace `Lobby.svelte`'s placeholder (`{#if !session.selectedSong}<p>No song selected yet...</p>{/if}` and its stale TODO comment) with a list rendering `$clientStore.catalog` (name + artist per entry); when `isHost`, clicking an entry sends `{ type: 'song-select', songId: song.id }` via the shared `WsClient` (T010). Remove `Lobby.svelte`'s own `?join=`/`session-create`/`session-join` bootstrap (now handled upstream, T009/T010) — it should read `session`/`selfParticipantId` from `clientStore` only. Test: real browser session, two tabs — host tab picks a song from the list; assert both tabs' `session.selectedSong`/`availableParts` update and, for a participant who'd already selected a part before the pick, their part/readiness reset to `null`/`'no-part'` in the DOM.

  **Note**: list rendering, host-only gating, and live cross-tab sync of
  song/part selection all verified in a real two-tab session. The
  reset-on-reselect assertion specifically was *not* exercised: the
  catalog fixture has only one song, and `song-select.ts` deliberately
  treats re-picking the *same* song as a no-op (documented in its own
  comment, an intentional UX improvement over the original spec — avoids
  wiping everyone's part choice on an accidental re-click). Reset-on-
  genuinely-different-song code path is present and reads correctly but
  is unverified live; would need a second catalog fixture song to exercise.

## Phase 6: Client — Playback real-song wiring

- [ ] T014 [artifacts: datamodel, infrastructure, ui] Wire `session.selectedSong` (looked up in `$clientStore.catalog`) and the current participant's `CatalogPart` (via `selectedPart` looked up in `session.availableParts`) into the `ensurePlaybackEngine(...)` call site added in T011c, replacing the hardcoded `/test/creep.gp`/`/test/creep.lrc` paths and the `LYRICS_TRACK_INDEX`/`LYRICS_LINE_INDEX`/`LYRIC_LINE_BREAKS` constants entirely (source these from the matched `CatalogSong`'s `lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks`/`lyricsLrc` instead). Test: real browser session — full Landing → Lobby (pick the `radiohead-creep` catalog entry from T008, confirm readiness reaches `ready` per T011c) → host clicks Start (T011b) → Playback view shows the already-initialized tab, the in-tab lyrics overlay toggles correctly, and (in a second tab/participant on the `'lyrics'` part) the full lyrics view highlights lines — all sourced from the catalog data, with no `/test/creep.*` fetch involved. This is the plan's capstone verification: the full three-view flow with no manual query-param navigation at any step.

  **BLOCKED on T011c.** Real catalog wiring is confirmed correct (host on
  Vocals, guest on Bass, both reached `ready` pre-Start, both transitioned
  to Playback on Start, correct per-track data used) — but the capstone's
  "Playback view shows the already-initialized tab" fails due to T011c's
  blank-canvas defect. Lyrics-part full-lyrics-view highlighting not
  re-verified this session (not selected in the final clean run — Bass
  was selected instead). Leave unchecked until T011c resolves.
