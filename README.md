# sync-tab-scroll

<!-- ardd-badge-start -->
<p align="center">
  <a href="https://github.com/kinda-bad/sync-tab-scroll/actions/workflows/ci.yml"><img alt="CI status" src="https://shieldcn.dev/github/ci/kinda-bad/sync-tab-scroll.svg?workflow=CI&variant=secondary" /></a>
  <a href="https://github.com/kinda-bad/sync-tab-scroll/commits/main"><img alt="last commit" src="https://shieldcn.dev/github/last-commit/kinda-bad/sync-tab-scroll.svg?variant=secondary" /></a>
  <a href="https://github.com/moui72/artifact-driven-dev"><img alt="built with ARDD" src="https://shieldcn.dev/badge/built%20with-ARDD-blue.svg?variant=secondary&theme=blue" /></a>
  <a href="https://www.alphatab.net/"><img alt="powered by alphaTab" src="https://shieldcn.dev/badge/powered%20by-alphaTab-orange.svg?variant=secondary&theme=orange" /></a>
</p>
<!-- ardd-badge-end -->

A synchronized tab-scrolling app for musicians playing together remotely.
See `.project/artifacts/` for the full artifact-driven-dev specification
(`constitution.md`, `datamodel.md`, `pipeline.md`, `infrastructure.md`,
`ui.md`, `brand.md`) and `.project/STATUS.md` for current status.

## Getting Started

### Prerequisites and install

Requires Node **>=20** (per root `package.json`'s `engines` field) and
[pnpm](https://pnpm.io/) (tested with pnpm 10.33.0). From the repo root:

```sh
pnpm install
```

This installs all workspace packages (`client`, `server`,
`packages/pipeline`, `packages/shared`) and sets `core.hooksPath` to
`.githooks` via the `prepare` script.

### Configuration (`.env`)

Both `server/` and `client/` need a local `.env`, copied from their
`.env.example`:

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Per constitution Principle VIII, `server/.env`'s `PORT` and
`client/.env`'s `VITE_BACKEND_PORT` must stay equal — both encode the dev
backend port that the client's `/catalog` proxy and WebSocket connection
target (default `6080` in both `.env.example` files). If they drift, the
client's dev server silently proxies `/catalog` and WS traffic at the
wrong backend, with no error. `.env` is git-ignored; a
`pnpm check:env` script (run automatically before commit) checks that
each `.env` has the same key set as its `.env.example`, but does not
check that the port *values* match — that part is on you.

### Running the dev servers

```sh
pnpm dev
```

runs `pnpm -r --parallel dev`, starting both the server
(`tsx watch`, listening on `server/.env`'s `PORT`, default `6080`) and the
client (Vite dev server, hardcoded to port `6000` in
`client/vite.config.ts`) together.

**Chrome will not load `http://localhost:6000`.** Port 6000 is on
Chrome's (and other Chromium browsers') list of restricted "unsafe"
ports (historically associated with the X11 window system), and it
refuses to navigate there at all — this is a browser restriction, not a
bug in this app. Workarounds:
- Use a non-Chromium browser (Firefox, Safari) to hit `localhost:6000`, or
- Run the client dev server on a different port directly, bypassing the
  root `pnpm dev` script:
  ```sh
  cd client
  VITE_BACKEND_PORT=6080 npx vite --port 7050 --strictPort
  ```
  (swap `7050` for any free port; `VITE_BACKEND_PORT` must still match
  the server's `PORT`).

## Adding a song

The `packages/pipeline` workspace has a CLI, `extract-lyrics`, that
converts a Guitar Pro (`.gp`) file into a catalog entry. From the repo
root:

```sh
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics <path-to-file.gp> <catalogRoot>
```

For example, verified against a real `.gp` file:

```sh
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics \
  /path/to/Radiohead-Creep-06-25-2026.gp \
  ./catalog
```

**Note:** `pnpm --filter <pkg> <script>` runs the script with its
working directory set to that package (`packages/pipeline/`), so a
relative `<catalogRoot>` like `./catalog` resolves *inside
`packages/pipeline/`*, not at the repo root — pass an absolute path (or
one relative to `packages/pipeline/`) if you want the catalog to land
elsewhere, e.g. the repo-root `catalog/` directory that `server/.env`'s
`CATALOG_ROOT` points at by default.

This produces a new `<catalogRoot>/<song-slug>/` directory (the slug is
derived from artist/title) containing:
- the published `.gp` file itself,
- `meta.json` (song name, artist, per-track `parts`, and lyrics-sync
  fields — `lyricsTrackIndex`, `lyricsLineIndex`, `lyricLineBreaks`),
- `lyrics.lrc`, if lyrics were found on the designated lyrics track (or
  via the lrclib.net fallback — see `pipeline.md`).

The server picks up everything under its `CATALOG_ROOT` at startup.

If you're running a public deployment with `REQUIRE_SONG_CONSENT=true`,
each song directory also needs a consent record before the server will
load it — record one with:

```sh
pnpm --filter @sync-tab-scroll/pipeline record-consent <catalogRoot> <songSlug> <submitterName>
```

See `.project/artifacts/datamodel.md`'s Consent Record section for the
full field list and rationale; this isn't needed for local/personal
catalog use.

## Running tests

| Suite | Command | Working directory |
|-------|---------|--------------------|
| Server unit tests (vitest) | `pnpm test` | `server/` |
| Client unit tests (vitest) | `pnpm test` | `client/` |
| Client component tests (Playwright CT) | `pnpm test:ct` | `client/` |
| Client end-to-end tests (Playwright) | `pnpm test:e2e` | `client/` |

All four were run clean in this worktree: 88 server tests, 61 client
unit tests, 79 CT tests, and 23 e2e tests, all passing. The e2e suite
builds the client and starts its own server/client instances on
alternate ports (see `client/playwright.config.ts`), so it doesn't
collide with a `pnpm dev` session you already have running.

## Datamodel

```mermaid
erDiagram
    Session ||--o{ Participant : "participants"
    Session ||--o{ CatalogPart : "availableParts"
    Session ||--|| PlaybackState : "playbackState"
    CatalogSong ||--o{ CatalogPart : "parts"
    CatalogSong ||--o{ Session : "selectedSong"
    CatalogPart ||--o{ Participant : "selectedPart"
    CatalogSong ||--o| ConsentRecord : "consent (public deployment only)"

    Session {
        string code
        string selectedSong "CatalogSong.id or null"
        string hostId
        boolean countInEnabled
        number lobbyCursorTick "null once playback starts"
        boolean spotlightMode
        string pendingHostRequest "Participant.id or null"
    }

    Participant {
        string id
        string displayName
        string role "host | member"
        string connectionStatus "connected | disconnected"
        string selectedPart "trackIndex | 'lyrics' | null"
        string readiness "no-part | loading | ready"
        number joinedAt
    }

    CatalogSong {
        string id "song slug"
        string name
        string artist
        string gpFilePath "client-fetchable URL"
        string lyricsLrc "URL or null"
        number lyricsTrackIndex "null on lrclib fallback"
        number lyricsLineIndex "lyric channel, usually 0"
        number_array lyricLineBreaks "syllables per line"
    }

    CatalogPart {
        string instrumentName
        number trackIndex "stable id for instrument parts"
    }

    PlaybackState {
        string status "stopped | running | paused"
        number tickPosition "host-client-authoritative"
        number bpm "informational only"
        number serverTimestamp
    }

    ConsentRecord {
        string submitterName
        string tosVersion
        number acceptedAt
    }
```

## Infrastructure

```mermaid
graph TD
    GP[Guitar Pro source files]
    Lrclib[lrclib.net<br/>external lyrics source]
    Pipeline[Offline lyrics-extraction pipeline<br/>alphaTab in Node]
    Catalog[(Per-song catalog directory<br/>.gp + .lrc + meta.json + consent record)]
    Server[Node + ws server<br/>in-memory sessions, host succession/transfer/removal,<br/>consent gate at catalog load]
    HTTP[Static HTTP route<br/>/catalog/...]
    Client[Svelte client<br/>single store, reconnect-by-identity,<br/>2s retry on connection loss]
    AlphaTab[alphaTab instance per participant<br/>visible renderer or headless<br/>renders tab + plays audio + native cursor]
    SoundFont[(SoundFont asset<br/>multi-MB, part of load readiness)]

    GP --> Pipeline
    Lrclib -->|line breaks or full .lrc fallback| Pipeline
    Pipeline -->|writes .gp, .lrc, meta.json| Catalog
    Catalog -->|loaded once at startup,<br/>paths rewritten to URLs| Server
    Server --- HTTP
    HTTP -->|.gp and .lrc fetches| Client
    Client <-->|WebSocket: session-state broadcasts,<br/>playback-control, song-select,<br/>host transfer/request, remove participant| Server
    Client -->|host only: playback-tick-report ~1/s| Server
    Server -->|periodic PlaybackState broadcast<br/>drift correction against 50-tick threshold| Client
    Client --> AlphaTab
    SoundFont --> AlphaTab
```

## UI

```mermaid
graph TD
    App[App / view-state router<br/>single client store]
    Banner[Connection-lost banner<br/>all views, non-dismissing]
    Bar[Persistent bar<br/>join code + song, Song & part,<br/>settings cog, Leave session]
    Toasts[Error toasts]
    Landing[Landing view<br/>create / join forms]
    Lobby[Lobby view<br/>state-dependent hint line]
    Playback[Playback view]

    SongPartModal[Song & part modal<br/>forced-open until both set]
    CatalogPicker[Catalog picker - host only]
    PartPicker[Part picker incl. Lyrics option]

    SettingsModal[Settings modal]
    TabParticipants[Participants tab<br/>list + Make host, Remove,<br/>Request/Decline host controls]
    TabSession[Session tab<br/>lobby cursor + Spotlight mode,<br/>host Count-in toggle]
    TabPreferences[Preferences tab<br/>theme picker riot/cyberpunk<br/>+ light/dark toggle, personal metronome]

    InstrumentView[Instrument part rendering]
    AlphaTabVisible[Visible alphaTab renderer<br/>native cursor overlay]
    Ticker[In-tab lyrics ticker<br/>single-line, snap-centered syllable]
    LyricsView[Lyrics part rendering]
    AlphaTabHeadless[Headless alphaTab instance<br/>audio + shared clock only]
    FullLyrics[Full-lyrics sheet<br/>all .lrc lines, auto-scroll to active line]
    GapIndicator[Gap timing indicator<br/>4-beat dot countdown + theme-styled drain bar]
    LoadingBanner[Loading tab/lyrics banner]

    App --> Banner
    App --> Bar
    App --> Toasts
    App --> Landing
    App --> Lobby
    App --> Playback
    Bar --> SongPartModal
    Bar --> SettingsModal
    SongPartModal --> CatalogPicker
    SongPartModal --> PartPicker
    SettingsModal --> TabParticipants
    SettingsModal --> TabSession
    SettingsModal --> TabPreferences
    Playback --> LoadingBanner
    Playback --> InstrumentView
    Playback --> LyricsView
    InstrumentView --> AlphaTabVisible
    InstrumentView -.->|optional toggle| Ticker
    LyricsView --> AlphaTabHeadless
    LyricsView --> FullLyrics
    FullLyrics -.->|gap > 1 measure| GapIndicator
```

## Acknowledgements

This app's tab rendering, playback, and cursor sync are all built on
[alphaTab](https://www.alphatab.net/), an excellent open-source music
notation and Guitar Pro rendering engine. Thank you to the alphaTab
maintainers and contributors — this project wouldn't exist without it.

