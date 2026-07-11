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

## Deploying to Railway

The system deploys as a single [Railway](https://railway.app/) service:
one container runs the server, which serves the built client SPA, the
song catalog, and the WebSocket upgrade all on one port (see
`.project/artifacts/infrastructure.md`'s "Deployment (Railway +
Terraform)" section for the full design). Infrastructure is provisioned
with Terraform (`infra/`), not through Railway's dashboard.

This is a **manual, one-time setup an operator runs themselves** — no
part of this repo's tooling or CI ever runs `terraform apply`
automatically:

1. Create a [Railway](https://railway.app/) account and generate an
   **account API token** at
   [railway.com/account/tokens](https://railway.com/account/tokens). It
   must be an account (or team/workspace) token — a *project-scoped* token
   can't create the project and will fail with `projectCreate ... Not
   Authorized`.
2. Set the target workspace. Railway's `projectCreate` requires an explicit
   workspace ID even for a personal workspace. The `workspace_id` variable
   in `infra/variables.tf` is defaulted to this deployment's workspace; to
   deploy into a different one, find its ID (query `me { workspaces { id
   name } }` against `https://backboard.railway.com/graphql/v2` with your
   token, or read it from the dashboard URL) and pass it as
   `TF_VAR_workspace_id`.
3. From `infra/`:
   ```sh
   export RAILWAY_TOKEN=<your account token>
   terraform init
   terraform plan
   ```
4. **Review the plan output carefully** — it provisions real, billable
   Railway resources (a project, a service built from this repo's
   `Dockerfile`, a persistent volume for catalog content, and service
   environment variables) under your own account.
5. If it looks right:
   ```sh
   terraform apply
   ```

After provisioning, the catalog volume is empty — populate it the same
way a local/personal deployment's `catalog/` directory is populated (see
"Adding a song," above): each song gets its own `catalog/<song-slug>/`
directory containing its `.gp`/`.lrc`/`meta.json`. There's no upload
mechanism or web form; content reaches the volume the same
operator-driven, offline way it always has (`.project/artifacts/
pipeline.md`). The deployed service also runs with
`REQUIRE_SONG_CONSENT=true` by default (unlike a local deployment's
`false` default) — see `.project/artifacts/datamodel.md`'s Consent
Record section for what that requires per song.

See `infra/README.md` for the Terraform provider and state-management
tradeoffs this config makes.

## Datamodel

```mermaid
erDiagram
    Catalogue ||--o{ CatalogSong : "songs (catalogueId)"
    Catalogue ||--o| CatalogueKey : "activation key (private only)"
    Catalogue ||--o{ Session : "unlockedCatalogueIds"
    Session ||--o{ Participant : "participants"
    Session ||--o{ CatalogPart : "availableParts"
    Session ||--|| PlaybackState : "playbackState"
    CatalogSong ||--o{ CatalogPart : "parts"
    CatalogSong ||--o{ Session : "selectedSong"
    CatalogPart ||--o{ Participant : "selectedPart"
    CatalogSong ||--o| ConsentRecord : "consent (public deployment only)"

    Catalogue {
        string id "slug or 'default'"
        string name "display name, shown even when locked"
        boolean public "false only when an activation-key record exists"
    }

    CatalogueKey {
        string salt "per-catalogue hex salt"
        string hash "scrypt(key, salt, 64) - never sent to clients"
    }

    Session {
        string code
        string selectedSong "CatalogSong.id or null"
        string hostId
        boolean countInEnabled
        number lobbyCursorTick "null once playback starts"
        boolean spotlightMode
        string pendingHostRequest "Participant.id or null"
        string_array unlockedCatalogueIds "private Catalogue.id values, per-session"
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
        string catalogueId "Catalogue.id, 'default' if no catalogue dir"
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
    CreateCat[create-catalogue CLI<br/>scrypt + salt, key never stored]
    Catalog[(Catalog root<br/>flat songs = 'default' public catalogue;<br/>catalogue dirs, catalogue.json = private key record)]
    Server[Node + ws server<br/>in-memory sessions; loadCatalog groups<br/>songs by catalogue; per-session visibleCatalog filter]
    HTTP[Static HTTP route<br/>/catalog/... and /catalog/&lt;catalogue&gt;/...]
    Client[Svelte client<br/>single store, reconnect-by-identity,<br/>2s retry on connection loss]
    AlphaTab[alphaTab instance per participant<br/>visible renderer or headless<br/>renders tab + plays audio + native cursor]
    SoundFont[(SoundFont asset<br/>multi-MB, part of load readiness)]

    GP --> Pipeline
    Lrclib -->|line breaks or full .lrc fallback| Pipeline
    Pipeline -->|writes .gp, .lrc, meta.json| Catalog
    CreateCat -->|writes catalogue.json salt+hash| Catalog
    Catalog -->|loaded once at startup,<br/>paths rewritten to URLs| Server
    Server --- HTTP
    HTTP -->|.gp and .lrc fetches| Client
    Client <-->|WebSocket: session-state broadcasts,<br/>playback-control, song-select,<br/>host transfer/request, remove participant| Server
    Client -->|host only: catalogue-unlock catalogueId+key| Server
    Server -->|verify scrypt + timingSafeEqual;<br/>on success re-broadcast session-state + widened catalog| Client
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
    Toasts[Error toasts<br/>incl. wrong activation key]
    Landing[Landing view<br/>create / join forms]
    Lobby[Lobby view<br/>state-dependent hint line]
    Playback[Playback view]

    SongPartModal[Song & part modal<br/>forced-open until both set]
    CatalogPicker[Catalog picker - host only<br/>grouped by catalogue when >1]
    PublicGroup[Public catalogue group<br/>songs listed directly under its name]
    LockedGroup[Locked private catalogue<br/>name + locked indicator, no songs]
    UnlockControl[Enter activation key - host only<br/>sends catalogue-unlock, group expands on success]
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
    CatalogPicker --> PublicGroup
    CatalogPicker --> LockedGroup
    LockedGroup -.->|host only| UnlockControl
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

