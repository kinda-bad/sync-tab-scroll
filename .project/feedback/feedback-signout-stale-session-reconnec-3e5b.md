---
status: planned
created: 2026-07-14
plan: plan-signout-stale-session-terminal-2026-07-14-2e22.md
---

# Feedback

## Bugs
- [x] F001 Sign-out still fails on production despite F002/F003 shipping — the
  F002 fix guards the wrong condition, so the stale-session reconnect storm
  never terminates for a *restored* (persisted-from-localStorage) session.
  **Confirmed live, not a deploy lag:** the deployed bundle
  (`index-xPHdO0FD.js`) is byte-identical to a fresh HEAD build, so F002/F003
  are deployed. **Root cause** (`client/src/ws-client.ts`): the rejoin path
  (`ws-client.ts:50-61`, `if (state.session && state.selfParticipantId && …)`)
  re-sends `session-join` on every reconnect whenever `state.session` is
  **non-null**; the F002 terminal-close path (`ws-client.ts:147`,
  `if (get(clientStore).session === null)`) only fires when session is
  **null**. The two conditions are mutually exclusive on the same field, so a
  persisted stale session (session non-null) rejoins forever — server replies
  `error` "Session <code> not found", socket closes, reconnects every 2s
  (`ws-client.ts:77`), rejoins again — and the terminal branch never runs. The
  2s HTTP/2-coalesced reconnect loop resets the shared h2 connection and aborts
  the in-flight `/auth/logout` fetch, so sign-out never revokes server-side
  (verified: after a failed sign-out, a page reload still shows signed-in and
  `/me` returns the user). F002 only fixed the fresh
  create/join-that-never-established case (session still null), not the actual
  persisted-stale-session case the original feedback
  (`feedback-signout-response-not-trusted-9575`) described.
  **Repro** on https://sts.ty-pe.com as a signed-in user with a stale stored
  session (banner stuck on "Connection lost — trying to reconnect…", toast
  "Session 8NAY not found"): click SIGN OUT → "Sign out failed — please try
  again", menu stays signed in.
  **Fix direction:** make the socket terminal on a server "session not found"
  error for a (re)join attempt *regardless* of whether `clientStore.session` is
  null — key the terminal decision on "we just tried to (re)join a session the
  server doesn't have" (e.g. track that a `session-join` was just sent, or have
  the server send a typed `session-not-found` the client treats as terminal),
  not on `session === null`. Must be test-first (Principle VII) — a failing CT
  reproducing the restored-stale-session rejoin storm before the fix.
  **Verified working this same session (not defects, recorded for context):**
  GitHub OAuth sign-in end-to-end, OAuth redirect-URI registration, anonymous
  path serves.
