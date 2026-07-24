# sync-tab-scroll

<!-- ardd-badge-start -->
<p align="center">
  <a href="https://github.com/kinda-bad/sync-tab-scroll/actions/workflows/ci.yml"><img alt="CI status" src="https://shieldcn.dev/github/ci/kinda-bad/sync-tab-scroll.svg?workflow=CI&variant=secondary" /></a>
  <a href="https://github.com/kinda-bad/sync-tab-scroll/commits/main"><img alt="last commit" src="https://shieldcn.dev/github/last-commit/kinda-bad/sync-tab-scroll.svg?variant=secondary" /></a>
  <a href="https://github.com/moui72/artifact-driven-dev"><img alt="built with ArDD" src="https://shieldcn.dev/badge/built%20with-ArDD-blue.svg?variant=secondary&theme=blue" /></a>
  <a href="https://github.com/moui72/artifact-driven-dev"><img alt="ArDD version" src="https://shieldcn.dev/badge/version-v0.10.3--beta.1-lightgrey.svg?variant=secondary&theme=gray" /></a>
  <a href="https://www.alphatab.net/"><img alt="powered by alphaTab" src="https://shieldcn.dev/badge/powered%20by-alphaTab-orange.svg?variant=secondary&theme=orange" /></a>
</p>
<!-- ardd-badge-end -->

<p align="center">
  <a href="https://github.com/sponsors/moui72"><img alt="sponsor" src="https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ea4aaa.svg?variant=secondary&theme=pink" /></a>
</p>

A synchronized tab-scrolling app for musicians playing together remotely.
See `.project/artifacts/` for the full artifact-driven-dev specification
(`constitution.md`, `datamodel.md`, `pipeline.md`, `infrastructure.md`,
`ui.md`, `brand.md`) and `.project/STATUS.md` for current status.

## Getting Started

### Prerequisites and install

Requires Node **>=22** (per root `package.json`'s `engines` field) and
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
client (Vite dev server, hardcoded to port `6100` in
`client/vite.config.ts`) together.

**Why 6100, not 6000:** Chrome (and other Chromium browsers) refuses to
navigate to port 6000 at all — it's hardcoded on their list of restricted
"unsafe" ports (historically associated with the X11 window system), a
browser restriction with no override, not a bug in this app. 6100 was
chosen specifically to avoid it — if you ever point the client dev server
at a different port yourself, check it against
[Chromium's unsafe-ports list](https://chromium.googlesource.com/chromium/src/+/main/net/base/port_util.cc)
first.

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

A Railway volume has no upload UI, so content reaches it by streaming a
tarball over `railway ssh` into the mount path (`/data/catalog`).
**On macOS, disable AppleDouble metadata in the tar** — otherwise the OS
writes a `._<name>` xattr sidecar for every file, and a `._Song.gp`
companion gets picked up as a bogus (unparseable) tab, breaking rendering
on the deployed app:

```sh
# From the repo root, with the Railway CLI logged in and the service linked:
COPYFILE_DISABLE=1 tar czf - -C catalog . \
  | railway ssh "mkdir -p /data/catalog && tar xzf - -C /data/catalog"
railway redeploy   # the server scans the catalog only at startup
```

(`COPYFILE_DISABLE=1` is the macOS-specific guard; `--no-mac-metadata` or
`--exclude='._*'` work too. The server also defensively ignores `._*`
sidecars when selecting a song's `.gp`, but keeping them off the volume in
the first place is cleaner.)

See `infra/README.md` for the Terraform provider and state-management
tradeoffs this config makes.

## Datamodel

```mermaid
erDiagram
    %% In-memory realtime state (server memory only)
    SESSION ||--o{ PARTICIPANT : "participants"
    SESSION ||--|| PLAYBACKSTATE : "playbackState"
    SESSION }o--o| CATALOGSONG : "selectedSong"
    SESSION ||--o{ CATALOGPART : "availableParts"
    PARTICIPANT }o--o| USER : "userId (optional, anon default)"

    %% Filesystem-derived catalog (loaded/re-scanned at runtime, not durable rows)
    CATALOGUE ||--o{ CATALOGSONG : "contains"
    CATALOGUE ||--o| ACTIVATIONKEY : "private gate (on-disk)"
    CATALOGSONG ||--o{ CATALOGPART : "parts"
    CATALOGSONG ||--o| CONSENTRECORD : "consent gate (on-disk)"
    CATALOGSONG ||--o{ FLATSYNCPOINT : "syncPoints (recording)"

    %% Durable account layer (Postgres, optional)
    USER ||--o{ AUTHSESSION : "sessions"
    USER ||--o{ CATALOGUEMEMBERSHIP : "memberships"
    USER ||--o{ CATALOGUEOWNERSHIP : "ownerships"
    CATALOGUEMEMBERSHIP }o..o| CATALOGUE : "catalogueId (string, no cross-store FK)"
    CATALOGUEOWNERSHIP }o..o| CATALOGUE : "catalogueId (string, no cross-store FK)"

    SESSION {
        string code "4-char join code"
        string selectedSong "CatalogSong.id or null"
        string hostId
        string playbackSource "synth | recording"
        number lobbyCursorTick "null once playing"
        boolean spotlightMode
        boolean countInEnabled
        number hostBarsPerRow "host-pinned layout, null = each participant's own"
        number earlyStopTick "auto-stop point, null = unset"
        string pendingHostRequest
        string_array unlockedCatalogueIds
    }
    PARTICIPANT {
        string id
        string userId "null = anonymous"
        string displayName "server-validated: rejected, not sanitized"
        string role "host | member"
        string connectionStatus
        string selectedPart "trackIndex | lyrics | null"
        string readiness "no-part|loading|loaded|ready"
        number joinedAt "tenure for succession"
    }
    PLAYBACKSTATE {
        string status "stopped|running|paused"
        number tickPosition "host-authoritative"
        number bpm "display only"
        number serverTimestamp
    }
    CATALOGSONG {
        string id "song slug"
        string catalogueId
        string name
        string artist
        string gpFilePath "URL"
        string lyricsLrc "URL or null"
        number lyricsTrackIndex
        string lyricsRawLine "optional"
        string recordingPath "URL or null"
    }
    CATALOGPART {
        string instrumentName
        number trackIndex "stable id"
    }
    CATALOGUE {
        string id "slug or default"
        string name
        boolean public
    }
    FLATSYNCPOINT {
        number barIndex
        number barPosition
        number barOccurence
        number millisecondOffset
    }
    CONSENTRECORD {
        string submitterName
        string tosVersion
        number acceptedAt
    }
    ACTIVATIONKEY {
        string salt
        string hash "scrypt"
        number epoch "rotation"
    }
    USER {
        string id "uuid"
        string oauthProvider "google | github"
        string oauthSubject
        string displayName
        string email
    }
    CATALOGUEMEMBERSHIP {
        string id "uuid"
        string userId "FK User"
        string catalogueId "plain string"
        string grantedVia "owner|key|invite"
        number keyEpoch
    }
    CATALOGUEOWNERSHIP {
        string id "uuid"
        string catalogueId "plain string"
        string ownerId "FK User"
    }
    AUTHSESSION {
        string id "opaque cookie value"
        string userId "FK User"
        number expiresAt
        number revokedAt "null = active"
    }
```

## Infrastructure

```mermaid
graph TD
    subgraph Client["Client (Svelte + Vite SPA)"]
        WS["ws-client.ts<br/>reconnect-by-identity + retry"]
        AT["@coderline/alphatab<br/>live tab render + audio + shared clock"]
        DRIFT["latency-compensated drift correction<br/>35ms tempo-stable threshold"]
        ANCHOR["instrumented AudioContext anchor<br/>synth-path output-latency compensation<br/>(host-reporting boundary fix)"]
        AT --> DRIFT
        AT --> ANCHOR
        ANCHOR --> DRIFT
    end

    subgraph Server["Server — single http.Server, one process"]
        WSS["WebSocket server (ws)<br/>authoritative session store (in-memory)"]
        VALIDATE["input-validation.ts<br/>reject (not sanitize) displayName / activation key / authoring fields"]
        DISPATCH["message dispatch<br/>host-only handlers incl. bars-per-row-set,<br/>early-stop-set, Start Negotiation auto-resolve"]
        STATIC["catalog-static.ts<br/>static /catalog + Range support"]
        SPA["client SPA fallback (client/dist)"]
        OAUTH["OAuth routes<br/>/auth/*/login /callback /logout /me"]
        AUTHOR["catalogue-authoring-routes.ts + song-upload-route.ts<br/>owner-only create-catalogue / add-song"]
        LOADER["catalog-loader.ts<br/>scan + re-scan, visibleCatalog()"]
        SUCC["host succession + transfer<br/>grace timer, tenure promote"]
        TTL["empty-session idle TTL (12h)"]
        WSS --> VALIDATE
        VALIDATE --> DISPATCH
        DISPATCH --> SUCC
        WSS --> TTL
        DISPATCH --> LOADER
        AUTHOR --> VALIDATE
    end

    subgraph Durable["Durable / out-of-band (optional)"]
        PG[("Postgres<br/>User / AuthSession / Membership / Ownership")]
        VOL[["Railway volume<br/>catalog/ (gitignored)"]]
        OP["1Password → Railway sealed vars<br/>OAuth + session secrets"]
    end

    subgraph Pipeline["Offline pipeline (lyrics only)"]
        GP[".gp source"] --> EXTRACT["extract lyrics → .lrc + meta.json"]
        LRCLIB(("lrclib.net")) -.-> EXTRACT
    end

    WS <-->|"WebSocket: session-state, playback-tick-report, PlaybackState broadcast"| WSS
    WS -->|"tick reports (host)"| WSS
    AT -->|"HTTP GET .gp / .lrc / recording.mp3 (Range)"| STATIC
    WS -->|"Origin-checked WS upgrade + cookie"| OAUTH
    OAUTH --> PG
    OAUTH -.->|"cookie → AuthSession → userId"| WSS
    AUTHOR --> LOADER
    AUTHOR --> PG
    LOADER --> VOL
    STATIC --> VOL
    EXTRACT --> VOL
    OAUTH -.->|"DATABASE_URL reference var"| OP

    subgraph CI["GitHub Actions CI (push/PR to main)"]
        CHECK["typecheck + server/client/CT/pipeline vitest"]
    end
```

## UI

```mermaid
graph TD
    START(("App load")) --> LANDING

    subgraph LANDING["Landing View"]
        CHOOSER["Chooser: Create / Join"]
        CREATE["Create form (name, pre-filled if signed in)"]
        JOIN["Join form (name + code)"]
        CHOOSER --> CREATE
        CHOOSER --> JOIN
        ACCT1["AccountMenu (optional)<br/>Sign in / Sign out / My catalogues"]
        HELP1["Help/Info/About (?)<br/>About / Info / Help tabs"]
    end
    LANDING -.->|"stored session → silent rejoin"| LOBBY

    CREATE -->|"session-create"| LOBBY
    JOIN -->|"session-join"| LOBBY

    subgraph LOBBY["Lobby View — persistent Bar (code + click-to-copy, account, help, leave, cog)"]
        HINT["state-dependent hint line"]
        SONGMODAL["Song & Part modal (auto-opens once)<br/>catalog picker grouped by Catalogue<br/>+ host Enter-activation-key"]
        SETTINGS["Settings modal — 4 tabs"]
        PART["pick part (incl. Lyrics) → readiness"]
        SONGMODAL --> PART
    end

    subgraph TABS["Settings tabs"]
        T1["Participants<br/>readiness, Make host, Remove, Request host"]
        T2["Session (host)<br/>Lobby cursor + Spotlight, Count-in,<br/>Bars-per-row pin, Early stop point"]
        T3["Preferences (personal)<br/>theme, metronome (unlocked in recording mode),<br/>bars-per-row, ticker size/position, measure markers"]
        T4["Tracks (personal)<br/>per-part mute, Solo, Mute all"]
    end
    SETTINGS --> T1 & T2 & T3 & T4

    LOBBY -->|"host Start (ready, or auto-resolved start-negotiation)"| PLAYBACK

    subgraph PLAYBACK["Playback View"]
        INSTR["Instrument part<br/>live alphaTab tab + native cursor<br/>optional lyrics ticker overlay<br/>de-emphasized past early stop point"]
        LYRICS["Lyrics part (headless)<br/>full scrolling lyric sheet + gap timing"]
        WIDGET["Count-in / Metronome beat widget (Bar)"]
        SRC["host: synth ⇄ recording source<br/>(session-wide, recording-capable songs)"]
    end

    PLAYBACK -->|"Leave session"| LANDING

    subgraph ST["Cross-cutting States"]
        S1["Error toasts (join, key, not-host, stale target, invalid input)"]
        S2["Removed from session → Landing"]
        S3["Stale session → clears identity, stops reconnect"]
        S4["Connection lost → persistent banner"]
        S5["Accounts unavailable → menu absent"]
    end
```

## Acknowledgements

This app's tab rendering, playback, and cursor sync are all built on
[alphaTab](https://www.alphatab.net/), an excellent open-source music
notation and Guitar Pro rendering engine. Thank you to the alphaTab
maintainers and contributors — this project wouldn't exist without it.

