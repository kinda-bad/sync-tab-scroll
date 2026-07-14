# sync-tab-scroll — Project Status

_Updated: 2026-07-14 (New feedback logged: lyrics-overlay timing + display
issues, see Feedback section below. **PROD SIGN-OUT FIXED + VERIFIED LIVE.** The real cause was
never the WS reconnect storm the prior four fixes chased — it was a one-line
client binding bug: `AccountMenu` bound `onclick={onSignOut}`, passing the click
`PointerEvent` into `signOut`'s defaulted `fetchFn` param, so the real `fetch`
never fired and logout silently no-op'd (only surfacing the "Sign out failed"
toast). Found by driving the real browser: clicking SIGN OUT fired **zero**
network requests, but a direct `fetch('/auth/logout')` logged out in 147ms
(`/me` → `user:null`). Fixed as `onclick={() => onSignOut()}`. Also fixed a
**false "Connection lost" banner on Landing** — `connectionStatus` defaults to
`'connecting'` and the banner rendered unconditionally, so with no `WsClient`
(connect() never runs on Landing) it falsely claimed a lost connection; now
gated on an active `wsClient`. This false banner is likely what misdirected the
whole WS-storm investigation. Both fixes test-first (Principle VII), shipped
`9478c55`, **deployed** (`index-DQukAlQa.js`) and **verified live** — banner
gone, SIGN OUT completes, user confirmed. Client 81 unit + 102 CT green. Root
cause saved to memory `signout-real-cause-event-arg`. The typed `session-not-found`
machinery from the wrong-diagnosis plan (F002/F003 + d509) stays **as defensive
hardening** (owner decision) for the genuine restored-stale-session storm case.
Prior context below.)_

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

No violations. Both sign-out/banner fixes are test-first (Principle VII). The
kept `session-not-found` machinery reuses the host-removal terminal-socket shape
(no second teardown path — Principle II).

## Diagrams

- `datamodel.md` — current ✅
- `infrastructure.md` — current ✅
- `ui.md` — current ✅

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12** (Accounts Phase 1
layer). Run `/ardd-defects` to refresh against the newer client fixes if desired.

## Feedback

1 open feedback file — `feedback-lyrics-overlay-timing-display-5456.md`
(lyrics-overlay highlight timing ~2 syllables ahead; duplicate lobby/lyrics
scrollbars + lobby never fully scrolling away; drain bar and count-in dots
not clearing; first lyric line pre-highlighted; count-in-dots-as-inline-
prefix redesign). Will be picked up by the next `/ardd-plan`.

## Feature Backlog

14 implemented · **2 backlogged** · 0 planned · 0 tasked — see `.project/features/`.
New backlog (host controls): `host-end-session-control`,
`host-restart-session-from-star`. Target one with `/ardd-plan <slug>`.
(`host-kick-freezes-session` was removed — it belonged to a different project.)

## Plans & Tasks

- **Sign-out event-binding + false-banner fix (REAL sign-out cause)** — shipped
  `9478c55`, deployed (`index-DQukAlQa.js`), **verified live**. `AccountMenu`
  `onclick={() => onSignOut()}`; `ConnectionBanner` gated on `wsClient`.
  Test-first (`AccountMenuSignOutHarness`, `ConnectionBannerHarness` gains
  `hasWsClient`). Client 81 unit + 102 CT green. No register feature (feedback-
  driven fix).
- **Stale-session typed `session-not-found` (F001, d509)** —
  `tasks-signout-stale-session-terminal-d509.md` (`completed`, 5/5, T005 live-
  verified). Merged to `main` at `55ba3dc`. Replaced F002's `session === null`
  heuristic with a typed terminal message. **Kept as defensive hardening** — it
  was NOT the sign-out blocker (see banner note above). Plan
  `plan-signout-stale-session-terminal-…-2e22.md` + feedback `…-3e5b` retained
  (restored after an accidental session-rewind deletion).
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
  GitHub sign-in confirmed end-to-end by the user. Redirect-URI registration is
  done. **Discrepancy to confirm:** the *deployed* Google client_id is
  `29801536638-b983…`, but earlier deploy notes referenced `607753971873-…` —
  make sure the callback URI is registered on the `29801536638` client.
- **Postgres / DATABASE_URL — done.** `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}`; `prevent_destroy` active; `/me`
  returns `{"accountsEnabled":true,...}`.
- **Sealed vars — pushed** (`*_OAUTH_CLIENT_ID/SECRET`, `SESSION_COOKIE_SECRET`,
  `PUBLIC_BASE_URL`). Optional cleanup: the inert legacy `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars can be deleted.

## Recommended next step

Sign-out is fixed, deployed, and verified — the core account loop works end to
end in prod. Options from here:
1. **Plan the new lyrics-overlay feedback** — `/ardd-plan` will pick up
   `feedback-lyrics-overlay-timing-display-5456.md` (timing offset + several
   display bugs) alongside the host-control backlog.
2. **Optional:** `/ardd-defects` to re-verify artifacts against the newer client
   fixes; confirm the Google `29801536638` client's redirect URI.

_Note: `host-kick-freezes-session` was removed (misplaced from another project).
The remaining two host-control backlog items may also belong to that project —
`host-restart-session-from-star` references "the game / turn 0", which has no
counterpart in this model — pending owner confirmation._

_Main: `9478c55`, 0 ahead / 0 behind `origin/main`._
