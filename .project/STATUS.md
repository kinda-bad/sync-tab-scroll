# sync-tab-scroll — Project Status

_Updated: 2026-07-14 (**PROD SIGN-OUT STILL BROKEN — F002 fix insufficient; new
fix planned + tasked.** Live prod verify on https://sts.ty-pe.com (F002/F003
confirmed deployed — the served bundle `index-xPHdO0FD.js` is byte-identical to a
fresh HEAD build) found: ✅ anonymous path serves, ✅ **GitHub OAuth sign-in works
end-to-end** (name renders; redirect-URI registration confirmed), but ❌ **SIGN
OUT still fails** ("Sign out failed — please try again", menu stays signed in;
post-fail reload shows `/me` still returns the user → `/auth/logout` never
revoked server-side). **Root cause** (`client/src/ws-client.ts`): the
reconnect-rejoin (`:50-61`) fires only when `session` is non-null, while F002's
terminal-close (`:147`) fires only when `session === null` — mutually exclusive,
so a **restored** stale session rejoins forever (the 2s storm that aborts logout)
and never terminates. F002 only fixed the fresh-join-never-established case, not
the persisted-stale-session case the original feedback described. Filed
`feedback-signout-stale-session-reconnec-3e5b` (F001, now `planned`) → **plan
`plan-signout-stale-session-terminal-2026-07-14-2e22.md` (`approved`)** + tasks
**`tasks-signout-stale-session-terminal-d509.md` (`ready`, 5 tasks, test-first)**:
replace the heuristic with a typed `session-not-found` ServerMessage the client
treats as unconditionally terminal. **Also done this session:** ARDD updated
v0.9.0→v0.10.0 (`a7165c4`); workflow fields stamped (`next_step_prompt`/`delegation:eager`/`merge_policy:auto`);
`main` at `8c80a29`, 0 ahead/0 behind `origin`. **Next: `/ardd-implement` the new
tasks.** Prior context below.) (**F002 + F003 SHIPPED to `main`** —
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

None at the artifact level. Note: `plan-signout-ws-reconnect-storm-…-dd78`
resolved its open question by choosing the client-side `session === null`
heuristic over a typed `session-not-found` message — and that choice is exactly
what live prod verify proved insufficient (it misses a restored stale session).
`plan-signout-stale-session-terminal-…-2e22` (the active fix) **reverses that
decision**, adopting the typed `session-not-found` ServerMessage after all.

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

No violations. The new sign-out fix (`tasks-signout-stale-session-terminal-d509.md`)
is test-first (Principle VII — the P1/P2 tasks write a failing test before
implementation), uses a typed `session-not-found` ServerMessage (Principle VI —
named type over a stringly-typed `error`), and reuses the existing host-removal
terminal-socket teardown rather than adding a second one (Principle II). No
Simplicity/YAGNI or production-annotation principle is declared, so neither a
Complexity Tracking table nor a Production Annotation Summary applies.

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

**0 open.** `feedback-signout-stale-session-reconnec-3e5b.md` is **planned** →
`plan-signout-stale-session-terminal-…-2e22` (F001 — prod sign-out still broken
because F002's `session === null` heuristic misses the restored-stale-session
case; fix tasked, see Plans & Tasks). Prior:
`feedback-signout-response-not-trusted-9575.md` is **planned** →
`plan-signout-ws-reconnect-storm-…-dd78` (F002 + F003 shipped to `main` at
`5857634` — but verify showed F002 was insufficient, hence the new plan above).

Prior (all `planned`, shipped/deployed):
- `feedback-signout-reload-masks-failure-9a29.md` → `plan-signout-reload-race-…-2e98` (shipped `a683a97`; deployed `3305a830`).
- `feedback-hide-locked-catalogues-69a3.md` → `plan-hide-locked-catalogues-…-6db8` (shipped `a1e8446`).
- `feedback-landing-signin-missing-2ebd.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).
- `feedback-bar-controls-blocked-by-modal-f0e8.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).

## Plans & Tasks

- **Sign-out stale-session terminal via typed server signal (F001)** —
  `plan-signout-stale-session-terminal-2026-07-14-2e22.md` (`approved`), tasks
  `tasks-signout-stale-session-terminal-d509.md` (`ready`, 5 tasks, 0/5). **The
  active fix.** Replaces F002's `session === null` heuristic (which misses a
  restored stale session, so the rejoin storm never terminates and keeps aborting
  `/auth/logout`) with a typed `{ type: 'session-not-found'; code }` ServerMessage:
  P1 add it to `packages/shared` + emit from `session-join.ts`; P2 client treats
  it as unconditionally terminal and the `session === null` branch is removed
  (test-first CT reproducing the restored-stale-session storm→terminal + a
  regression CT for first-open-bad-code and live-drop reconnect); P3 live prod
  re-verify. Not yet implemented — **run `/ardd-implement`.**
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
- **T020 — done.** Sealed vars pushed from 1Password:
  `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`,
  `SESSION_COOKIE_SECRET` (newly generated + stored in the vault), and
  `PUBLIC_BASE_URL=https://sts.ty-pe.com`. Both providers' login redirects
  verified live on prod (2026-07-13, curl):
  - GitHub `/auth/github/login` → `302` github.com, client_id
    `Ov23liE98uUnST7Ycht7`, `redirect_uri=…/auth/github/callback`, PKCE+state.
  - Google `/auth/google/login` → `302` accounts.google.com, client_id
    **`29801536638-b983rjtrlrsl5oin6sdo5rfoecdis4ud`**,
    `redirect_uri=…/auth/google/callback`, PKCE+state+nonce.
  Redirect URIs are registered provider-side (operator confirmed).
  ⚠️ **Doc mismatch:** an earlier note here cited Google client_id
  `607753971873-…`; the deployed client is `29801536638-…`. Confirm the
  registered-callback client matches the deployed one.
- **Interactive sign-in — GitHub verified (2026-07-14).** Signed in end-to-end
  as the real user via the browser: redirect → callback → cookie → `/me` → name
  renders. Google not clicked through interactively (GitHub answered the
  question); the anonymous path serves.
- **Remaining (operator-only):**
  1. (Optional) Google interactive sign-in click-through + confirm a key-unlock
     persists across sessions. Confirm the deployed Google client_id
     `29801536638-…` is the one whose callback URI is registered.
  2. Prod sign-out end-to-end — **blocked on the F001 fix**
     (`tasks-signout-stale-session-terminal-d509.md`); sign-out is confirmed
     still broken live (see header). Re-verify after that ships (plan T005).
- **Cleanup (optional):** the legacy mis-named `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars are inert (the code reads the `_OAUTH_` names)
  and can be deleted.

## Recommended next step

**`/ardd-implement`** the sign-out fix — `tasks-signout-stale-session-terminal-d509.md`
(`ready`, 5 tasks, test-first). This is the confirmed blocker for prod sign-out
(F002's heuristic is insufficient; see header + Plans & Tasks). `delegation:eager`
is set, so an eager background worktree run is offered. After it merges and
Railway deploys, T005 is the live prod re-verify (banner clears + sign-out
completes end-to-end).

Deferred until after the fix:
- (Optional) Google interactive sign-in click-through + key-unlock persistence;
  confirm the deployed Google client_id `29801536638-…` matches the registered
  callback client.
- Then Phase 2 — in-app authoring + dynamic catalog — the next design-of-record
  milestone.
