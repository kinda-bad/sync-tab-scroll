# sync-tab-scroll — Project Status

_Updated: 2026-07-14 (**Lyrics-overlay timing + display fixes SHIPPED.**
`tasks-7f0f-4f2d.md` (`completed`, 5/5), implemented in a delegated worktree
(RED→GREEN per task, all test-first per Principle VII) and fast-forward-merged
into `main` at `ecca7ee`. Fixes: F001 the ~2-syllable-ahead highlight offset
(root cause: manual tick reconstruction instead of alphaTab's own
`beat.absolutePlaybackStart`, which accounts for grace-note timing); F002
duplicate lobby/lyrics scrollbars (`.app-content` now collapses while a lyrics
participant is in Playback, leaving one scroll region); F003/F004 the
gap-indicator drain bar + count-in dots no longer freeze in the DOM after their
gap elapses; F005 the first lyric line/syllable no longer pre-highlights before
a real playback position arrives (gated on alphaTab's `isReadyForPlayback`);
F006 count-in dots redesigned as an inline prefix on the upcoming lyric line
instead of a separate above-line element. No artifact changes (implementation-
only). Client 82 unit + 105 CT green, no regressions. **Not yet pushed —
9 local commits ahead of `origin/main`** (this work + the sign-out fix's ADD
reconciliation + host-feature cleanup from earlier today). Prior context below.)_

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

No violations. The lyrics-overlay fixes are test-first (Principle VII, 5/5
tasks RED→GREEN). Both sign-out/banner fixes are also test-first. The kept
`session-not-found` machinery reuses the host-removal terminal-socket shape
(no second teardown path — Principle II).

## Diagrams

- `datamodel.md` — current ✅
- `infrastructure.md` — current ✅
- `ui.md` — current ✅ (the lyrics-overlay fixes were implementation-only —
  no `ui.md` text changed, so the diagram wasn't invalidated)

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12** (Accounts Phase 1
layer). Run `/ardd-defects` to refresh against the newer client fixes if desired.

## Feedback

0 open feedback files — `feedback-lyrics-overlay-timing-display-5456.md`
is `planned` (consumed by `plan-7f0f-2026-07-14-67d9.md`, now shipped).

## Feature Backlog

14 implemented · **1 backlogged** · 0 planned · 0 tasked — see `.project/features/`.
`part-mute-toggle` — each participant can mute any part locally, changing
which MIDI tracks play during their own playback. Target with `/ardd-plan
part-mute-toggle`.

## Plans & Tasks

- **Lyrics overlay timing + display fixes** — `tasks-7f0f-4f2d.md`
  (`completed`, 5/5). **Merged to `main` at `ecca7ee`** (fast-forward, 8
  signed commits) via a delegated worktree, all test-first. F001 (syllable
  timing offset — `beat.absolutePlaybackStart`), F002 (single scroll region),
  F003/F004 (gap-indicator DOM lifecycle), F005 (no pre-highlight before real
  position), F006 (inline count-in-dots prefix). Client 82 unit + 105 CT
  green. No register feature (feedback-driven fix). **Not yet pushed.**
  (Note: the first delegation attempt failed — the plan/tasks files hadn't
  been committed to `main` yet, so the worktree couldn't see them;
  re-delegated after committing `e8c3a52`. Feedback on this ARDD gap was
  drafted separately, not filed.)
- **Sign-out event-binding + false-banner fix (REAL sign-out cause)** — shipped
  `9478c55`, deployed (`index-DQukAlQa.js`), **verified live**. `AccountMenu`
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
- **Lyrics-overlay fixes — not yet deployed.** `main` is 9 commits ahead of
  `origin/main`; push to trigger the Railway rebuild.

## Recommended next step

1. **Push `main`** — 9 local commits (lyrics-overlay fixes + prior ADD
   reconciliation/cleanup) waiting to reach `origin` and redeploy.
2. **Live prod re-verify of the lyrics-overlay fixes** — after deploy, confirm
   the syllable timing offset is gone and the single-scroll-region change
   doesn't regress the Playback view's status label/loading banner (a known
   minor trade-off the implementation flagged).
3. **Optional:** `/ardd-defects` to re-verify artifacts against the newer
   client fixes; confirm the Google `29801536638` client's redirect URI;
   `/ardd-plan part-mute-toggle` when ready to design that feature.
