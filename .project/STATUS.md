# sync-tab-scroll — Project Status

_Updated: 2026-07-14 (**part-mute-toggle SHIPPED.** `tasks-part-mute-toggle-
f0d4.md` (`completed`, 6/6), implemented in a delegated worktree (RED→GREEN
per task, all test-first per Principle VII) and fast-forward-merged into
`main` at `919a4da`. Vetted via `/ardd-research` first
(`research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md`): every
participant's alphaTab instance already played the **full multi-track mix**
before this feature — alphaTab's `trackIndexes` load parameter scopes
rendering only, not playback — so the feature needed zero server/datamodel/
load-architecture changes. New `client/src/track-mute-preference.ts`
(mirrors `metronome-preference.ts`, keyed per song+track), new
`setEngineTrackMute()` in `playback-engine.ts` wired to alphaTab's own
`api.changeTrackMute()` and applied automatically on `scoreLoaded` (mutes
persist across reload/rejoin), and a new "Mute parts" section in
`SettingsModal.svelte`'s Preferences tab. Self-mute confirmed allowed
(T006), no restriction. One implementation note: alphaTab's
`changeTrackMute()` doesn't mutate `Track.playbackInfo.isMute` readably, so
T002/T003's tests spy on the call itself rather than reading mute state
back off the Track model — a test-technique adjustment, not a design
change. Client 87 unit + 113 CT green (one pre-existing flaky debounce test
unrelated to this feature, confirmed not a regression). Feature register:
`part-mute-toggle` → `implemented` (15 implemented total now).
`ui.md`'s diagram is stale (Playback View + Preferences tab additions).
**Not yet pushed — 10 local commits ahead of `origin/main`.** Prior context
below.)_

> **ARDD:** up to date on **v0.10.0** (`a7165c4`), 2026-07-13.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.5.0) | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

None at the artifact level.

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. `part-mute-toggle`'s design is squarely inside Principle V
(uses alphaTab's own `changeTrackMute` API rather than a custom mixing
mechanism) and its 6 tasks are all test-first (Principle VII). The
lyrics-overlay and sign-out fixes (below) were also test-first, no
violations there either.

## Diagrams

- `datamodel.md` — current ✅
- `infrastructure.md` — current ✅
- `ui.md` — **stale ⚠️** (run `/ardd-diagram ui`) — gained the Playback
  View full-mix clarification and the Preferences tab's "Mute parts"
  subsection.

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12** (Accounts Phase 1
layer). Run `/ardd-defects` to refresh against the newer client fixes if desired.

## Feedback

0 open feedback files.

## Feature Backlog

**15 implemented** · 0 backlogged · 0 planned · 0 tasked — see
`.project/features/`. `part-mute-toggle` shipped this pass.

## Plans & Tasks

- **Per-participant part mute toggle** — `tasks-part-mute-toggle-f0d4.md`
  (`completed`, 6/6). **Merged to `main` at `919a4da`** (fast-forward, 8
  signed commits) via a delegated worktree, all test-first. Research:
  `research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md`. New
  `track-mute-preference.ts` (mirrors `metronome-preference.ts`), new
  `setEngineTrackMute()` wired to alphaTab's `changeTrackMute()` and
  applied on `scoreLoaded` (persists across reload), new "Mute parts"
  section in `SettingsModal.svelte`'s Preferences tab. Self-mute allowed.
  Zero server/datamodel changes. Client 87 unit + 113 CT green. Feature
  register: `implemented`. **Not yet pushed/deployed.**
- **Lyrics overlay timing + display fixes** — `tasks-7f0f-4f2d.md`
  (`completed`, 5/5). **Merged to `main` at `ecca7ee`, pushed, deployed
  (`index-RJXOf0Kp.js`), live-verified in a real session** (F006 inline
  count-in dots, F003/F004 gap-indicator clearing, F005 no pre-highlight,
  F002 single scroll region all confirmed visually; F001 timing offset
  covered by the automated test suite). Client 82 unit + 105 CT green.
- **Sign-out event-binding + false-banner fix (REAL sign-out cause)** — shipped
  `9478c55`, deployed, **verified live** end-to-end by the user. `AccountMenu`
  `onclick={() => onSignOut()}`; `ConnectionBanner` gated on `wsClient`.
  Client 81 unit + 102 CT green.
- **Stale-session typed `session-not-found` (F001, d509)** —
  `tasks-signout-stale-session-terminal-d509.md` (`completed`, 5/5). Merged
  `55ba3dc`. Kept as defensive hardening — was NOT the sign-out blocker.
- **Stale-session WS reconnect storm + `/me` hardening (F002, F003)** —
  `tasks-signout-ws-reconnect-storm-c60d.md` (`completed`, 6/6). Merged `5857634`.
- **Sign-out verify-via-`/me` (F001)** — `tasks-signout-verify-via-me-7739.md`
  (`completed`, 3/3). Merged `0f8a3db`, deployed `d5f8c8f3`.
- **Sign-out reload race** — `tasks-signout-reload-race-e126.md` (`completed`).
  Merged `a683a97`, deployed `3305a830`.
- **Reachable account controls** — `tasks-reachable-account-controls-1787.md`
  (`completed`). Merged `318b7d2`.
- **Hide locked catalogues** — `tasks-hide-locked-catalogues-6009.md`
  (`completed`). Merged `a1e8446`.
- **Accounts Phase 1** — `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20).
  Merged `e2747b2`.

## Deploy status (production)

Canonical public domain: **https://sts.ty-pe.com** (custom domain; the
Railway-assigned `sync-tab-scroll.up.railway.app` also resolves).

- **OAuth sign-in — WORKING (verified 2026-07-14).** Both providers 302 to their
  auth endpoints with the correct prod `redirect_uri`
  (`https://sts.ty-pe.com/auth/{github,google}/callback`), PKCE + state present;
  GitHub sign-in confirmed end-to-end by the user. **Discrepancy to confirm:**
  the *deployed* Google client_id is `29801536638-b983…`, but earlier deploy
  notes referenced `607753971873-…` — make sure the callback URI is
  registered on the `29801536638` client.
- **Postgres / DATABASE_URL — done.** `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}`; `prevent_destroy` active; `/me`
  returns `{"accountsEnabled":true,...}`.
- **Sealed vars — pushed** (`*_OAUTH_CLIENT_ID/SECRET`, `SESSION_COOKIE_SECRET`,
  `PUBLIC_BASE_URL`). Optional cleanup: the inert legacy `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars can be deleted.
- **Lyrics-overlay fixes — deployed and live-verified** (`index-RJXOf0Kp.js`).
- **Sign-out fix — deployed and live-verified** (`index-DQukAlQa.js`, superseded
  by the lyrics-overlay build above).
- **part-mute-toggle — not yet deployed.** `main` is 10 commits ahead of
  `origin/main`; push to trigger the Railway rebuild.

## Recommended next step

1. **Push `main`** — 10 local commits (part-mute-toggle + its planning
   docs) waiting to reach `origin` and redeploy.
2. **Live prod check of part-mute-toggle** — after deploy, open the
   Preferences tab in a real session, confirm "Mute parts" lists every
   available part and actually silences the muted track's audio.
3. **`/ardd-diagram ui`** — regenerate the UI diagram (stale since the
   Playback View + Preferences tab edits).
4. **Optional:** confirm the Google `29801536638` client's redirect URI is
   registered; `/ardd-defects` to re-verify artifacts against recent client
   fixes.
