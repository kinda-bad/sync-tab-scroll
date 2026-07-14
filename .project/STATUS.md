# sync-tab-scroll — Project Status

_Updated: 2026-07-13 (**UI diagram regenerated + `main` pushed** — the F002+F003
UI diagram was regenerated at commit `1020217` (`ui.md` `diagram_status: current`
again), and `main` was pushed to `origin` through `d6795c3`. HEAD is now **1
ahead / 0 behind** `origin/main` — only the diagram-regen commit `1020217`
remains unpushed. Remaining work is the deploy/verify tail, not code. Prior
context below.) (**F002 + F003 SHIPPED to `main`** —
`plan-signout-ws-reconnect-storm-2026-07-13-dd78.md` (`approved`), tasks
`tasks-signout-ws-reconnect-storm-c60d.md` (`completed`, 6/6, all test-first per
Principle VII). Implemented in a delegated worktree (RED→GREEN per pair) and
**fast-forward-merged into `main` at `5857634`** (7 signed commits). **F002** —
the stale-session WS rejoin storm (`client/src/ws-client.ts`) that reconnected
every 2s against a dead session and reset the HTTP/2-coalesced connection,
aborting the in-flight sign-out requests: a join rejected because the session no
longer exists now `clearStoredSession()` + `suppressReconnect` + `socket.close()`
(reusing the host-removal terminal-socket shape), when the `error` arrives while
`clientStore.session === null`. **F003** — `signOut()` (`client/src/account.ts`)
no longer blanks the account menu to `unavailable` when its post-logout `/me`
re-check is unreachable: extracted `fetchMe()` (throws on failure), `loadAccount`
wraps it (boot still → `unavailable`), and `signOut` uses `fetchMe` directly —
on an unreachable `/me` it leaves the store untouched (menu stays signed-in) +
retryable Error toast. `ui.md` States edited (Stale session + Signing out vs
Accounts unavailable) — **diagram now stale** (run `/ardd-diagram ui`). Tests:
client unit 81/81, ws-client CT 10/10. **0 open feedback.** **NOT yet pushed /
deployed** — batch with a `main` push so Railway rebuilds once; then live
signed-in browser re-verify of prod sign-out (F002 was the confirmed blocker
that F001's fix alone couldn't satisfy). Prior context below. — **Sign-out
verify-via-`/me`
fix SHIPPED + deployed** (`plan-signout-verify-via-me-…-5d6b`, merged `0f8a3db`,
Railway `d5f8c8f3`): **F001** removed the false "Sign out failed" toast + the
false signed-out→signed-in masking. BUT live signed-in re-verification showed
sign-out STILL failed end-to-end — F002 (the WS reconnect storm) confirmed as
the real blocker (filed as F003), which this plan now fixes. Prior:
**Sign-out reload-race fix SHIPPED + deployed** (`plan-signout-reload-race-…-2e98`,
merged `a683a97`, Railway `3305a830`): removed the trailing
`window.location.reload()` that aborted `/auth/logout`. Prior:
**reachable-account-controls SHIPPED** (merged `318b7d2`) — `AccountMenu` on
Landing + dismissible `SongPartModal`. Prior: **Hide-locked-catalogues SHIPPED**
(merged `a1e8446`). Prior: **Accounts Phase 1 shipped** (merged `e2747b2`) —
OAuth identity + optional Postgres + persisted catalogue unlock; `/ardd-defects`
verified no defects; deployed to prod (Postgres via Terraform, sealed OAuth vars
pushed; only OAuth redirect-URI registration + final verify remain — see Deploy
status below).)_

> **ARDD:** up to date on **v0.10.0** (`a7165c4`), updated 2026-07-13.

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

None at the artifact level. The two plan-level open questions from
`plan-signout-ws-reconnect-storm-…-dd78` were resolved in implementation: the
client-side `session === null` heuristic was used (no typed `session-not-found`
message needed); the terminal close reuses the host-removal shape, which already
resets to a non-error state, so `ConnectionBanner` isn't left stuck (CT-covered).
The remaining validation is live prod re-verify (see Recommended next step).

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded (pre-existing).

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. The planned sign-out/WS work is test-first (Principle VII — all 6
tasks in `tasks-signout-ws-reconnect-storm-c60d.md` write a failing test before
implementation). No Simplicity/YAGNI or production-annotation principle is
declared, so neither a Complexity Tracking table nor a Production Annotation
Summary applies. The F002 fix reuses the existing host-removal terminal-socket
mechanism (no second reconnect-teardown path — Principle II); the F003 refactor
preserves the single account-store write (Principle I).

## Diagrams

- `datamodel.md` — current ✅
- `infrastructure.md` — current ✅
- `ui.md` — **current ✅** — regenerated at commit `1020217` after the T003/T006
  States edits (Stale session; Signing out vs Accounts unavailable).

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12**. A focused
`/ardd-defects` pass over the merged Accounts Phase 1 layer (~3,300 lines)
confirmed the account code matches datamodel.md, infrastructure.md, ui.md,
pipeline.md, and constitution Principles I/II/VI/VII/VIII. The pre-accounts
codebase (clean at 2026-07-10) is unchanged except for additive account wiring.

## Feature Backlog

14 implemented · 0 backlogged · 0 planned · 0 tasked — see `.project/features/`.
(Accounts Phase 1 is a design-of-record phase, not a register feature, so it
doesn't appear here.)

## Feedback

**0 open.** `feedback-signout-response-not-trusted-9575.md` is **planned** →
`plan-signout-ws-reconnect-storm-…-dd78` (F001 was already incorporated by the
prior verify-via-`/me` plan; F002 + F003 consumed by this one, now shipped to
`main` at `5857634`).

Prior (all `planned`, shipped/deployed):
- `feedback-signout-reload-masks-failure-9a29.md` → `plan-signout-reload-race-…-2e98` (shipped `a683a97`; deployed `3305a830`).
- `feedback-hide-locked-catalogues-69a3.md` → `plan-hide-locked-catalogues-…-6db8` (shipped `a1e8446`).
- `feedback-landing-signin-missing-2ebd.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).
- `feedback-bar-controls-blocked-by-modal-f0e8.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).

## Plans & Tasks

- **Stale-session WS reconnect storm + sign-out `/me` hardening (F002, F003)** —
  `plan-signout-ws-reconnect-storm-2026-07-13-dd78.md` (`approved`), tasks
  `tasks-signout-ws-reconnect-storm-c60d.md` (`completed`, 6/6). **Merged to
  `main` at `5857634`** (fast-forward, 7 signed commits) via a delegated
  worktree, all test-first (RED→GREEN). **Phase 1 (F002)** made a stale-session
  rejoin terminal in `ws-client.ts` (`clearStoredSession` + `suppressReconnect` +
  `socket.close()` when an `error` arrives while `clientStore.session === null`);
  **Phase 2 (F003)** extracted `fetchMe()` (throws on failure) so `signOut()`
  keeps the menu signed-in + retryable toast when `/me` is unreachable instead of
  blanking to `unavailable`. `ui.md` States edited (diagram now stale). Client
  unit 81/81, ws-client CT 10/10. **Not yet pushed/deployed; live prod re-verify
  pending.**
- **Sign-out verify-via-`/me` fix (F001)** — `plan-signout-verify-via-me-2026-07-13-5d6b.md`
  (`approved`), tasks `tasks-signout-verify-via-me-7739.md` (`completed`, 3/3).
  **Merged to `main` at `0f8a3db`** (fast-forward, 3 signed commits),
  **deployed to prod** (Railway `d5f8c8f3`). `signOut()` re-reads `/me` and
  toasts only if still signed-in. Removed the false toast/masking, but sign-out
  stayed broken end-to-end until F002 (this run's plan) is fixed.
- **Sign-out reload race fix** — `plan-signout-reload-race-2026-07-13-2e98.md`
  (`approved`), tasks `tasks-signout-reload-race-e126.md` (`completed`, 3/3).
  **Merged to `main` at `a683a97`**, **deployed** (Railway `3305a830`). Removed
  the trailing `window.location.reload()` that aborted `/auth/logout`.
- **Reachable account controls** — `plan-reachable-account-controls-2026-07-13-ca49.md`
  (`approved`), tasks `tasks-reachable-account-controls-1787.md` (`completed`, 3/3).
  **Merged to `main` at `318b7d2`**. `AccountMenu` on Landing + dismissible
  `SongPartModal`.
- **Hide locked catalogues** — `plan-hide-locked-catalogues-2026-07-13-6db8.md`
  (`approved`), tasks `tasks-hide-locked-catalogues-6009.md` (`completed`, 5/5).
  **Merged to `main` at `a1e8446`**.
- **Accounts Phase 1** — `plan-accounts-phase-1-2026-07-12-e375.md` (`approved`),
  tasks `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20). Merged to `main`
  at `e2747b2`.

## Deploy status (Accounts Phase 1 → production, 2026-07-13)

Canonical public domain: **https://sts.ty-pe.com** (custom domain; the
Railway-assigned `sync-tab-scroll.up.railway.app` also resolves).

- **T019 — done.** Postgres created by hand; `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (resolves to
  `postgres.railway.internal:5432`); `prevent_destroy` guard active. `/me`
  returns `{"accountsEnabled":true,...}` on both domains.
- **T020 — mostly done.** Sealed vars pushed from 1Password:
  `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`,
  `SESSION_COOKIE_SECRET` (newly generated + stored in the vault), and
  `PUBLIC_BASE_URL=https://sts.ty-pe.com`. Login redirects now carry the correct
  prod `redirect_uri`.
- **Remaining (operator-only):**
  1. Register the redirect URIs in the provider dashboards —
     GitHub OAuth app `Ov23liE98uUnST7Ycht7` → `https://sts.ty-pe.com/auth/github/callback`;
     Google client `607753971873-…` → `https://sts.ty-pe.com/auth/google/callback`.
  2. Verify sign-in end-to-end (both providers), a key-unlock persists across
     sessions, and the anonymous path still serves.
- **Cleanup (optional):** the legacy mis-named `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars are inert (the code reads the `_OAUTH_` names)
  and can be deleted.

## Recommended next step

F002 + F003 are merged to `main` at `5857634` and **pushed to `origin`** through
`d6795c3`; the UI diagram was regenerated (`1020217`, still unpushed). Remaining,
in order:
1. **Push `main`** — the one unpushed commit `1020217` (UI diagram regen); push
   to trigger the Railway rebuild.
2. **Live prod sign-out re-verify** — as the real signed-in user on
   https://sts.ty-pe.com, confirm SIGN OUT now completes end-to-end (F002 was
   the confirmed blocker that F001's verify-via-`/me` fix couldn't satisfy
   alone) and that an unreachable `/me` no longer blanks the account menu.
3. **Finish browser OAuth validation** — the operator-only redirect-URI
   registration checks (Deploy status below) are still open.

After this, Phase 2 — in-app authoring + dynamic catalog — is the next
design-of-record milestone.
