---
status: planned      # open -> planned
created: 2026-07-13
plan: plan-signout-ws-reconnect-storm-2026-07-13-dd78.md
---

# Feedback

## Bugs
- [x] F001 Sign out still fails on prod (`sts.ty-pe.com`) AFTER the
      reload-race fix shipped (`a683a97`, deploy `3305a830`). **Live browser
      reproduction as the real signed-in user (2026-07-13):** clicking
      **SIGN OUT** shows the "Sign out failed — please try again." toast and
      leaves the UI signed-in — but the server *did* process the logout:
      `GET /me` returns `{"accountsEnabled":true,"user":null}` immediately
      after, and a page reload shows signed-out. So the logout **request**
      succeeds (session revoked, cookie cleared) while the client's
      `fetch('/auth/logout')` **throws before it can read the 200 response**,
      hitting the `catch` → false-failure toast, and the store is never
      updated. Confirmed there is **no remaining `window.location.reload()`**
      in `signOut()` or anywhere in `client/src` — the reload we removed in the
      prior fix is NOT what aborts the request (see F002 for the actual
      aborter). **Fix direction (primarily code, `client/src/account.ts`
      `signOut()`):** do not trust the logout response. After
      `POST /auth/logout` (resolve or throw), confirm the real state via
      `GET /me` — reuse `loadAccount(fetchFn)`, which fetches `/me`, updates
      the store, and returns the state — then show the error toast **only if
      `/me` still reports a signed-in user**. The logout request is reliable;
      only its response is unreliable, so `/me` is the source of truth. This
      supersedes the response-`ok`-only check from the prior fix. The tiny
      `ui.md` States wording ("Signing out") may need a nudge to say success
      is determined by re-reading `/me`, not the logout response — small, code
      is the core. [artifacts: ui]

- [x] F002 Stale-session WS rejoin loop reconnects forever (the aborter behind
      F001). On the Landing page with a **stale stored session id** (observed:
      a "Session 8NAY not found" toast on every load), the WS client attempts
      to rejoin the non-existent session, the server rejects/closes the socket,
      and the client reconnects after `reconnectDelayMs = 2000`
      (`ws-client.ts:24,77`) — **every 2s, indefinitely, with no backoff or
      give-up.** On Railway's HTTP/2 edge the coalesced WebSocket + `fetch`
      share a connection, so each WS cycle can reset an in-flight HTTP request
      — this is what aborts the logout response in F001, and is also the
      original report's "Connection lost" flash. **Fix direction (code,
      `client/src/ws-client.ts` + the rejoin path):** a rejoin rejected because
      the session no longer exists should **clear the stored session identity
      and stop retrying** (or back off), rather than hammering a dead session
      every 2s. Independent of F001's fix (which makes sign-out robust on its
      own), but this loop is the underlying cause and worth fixing so it stops
      aborting other requests and burning reconnects. [artifacts: ui]

- [x] F003 **F001's fix is deployed (`0f8a3db` / Railway `d5f8c8f3`) but a live
      signed-in browser re-verification (2026-07-13) shows sign-out STILL does
      not work — and F002 is confirmed as the real blocker.** Repro as the real
      GitHub-signed-in user: clicking **SIGN OUT** makes the account menu
      **vanish** (store goes to `unavailable` → renders nothing) with **no**
      error toast, but `GET /me` still returns the user for 3s+ afterward — the
      **session is not revoked** and the logout did not happen. Meanwhile a
      direct `POST /auth/logout` run in the page console returns `200` and
      immediately clears the session, and 12/12 plain `GET /me` calls in a loop
      all succeed — so the endpoint and connection are fine in isolation; only
      the **app's own `signOut` fetches fail** (both the logout POST and the
      follow-up `/me` in `loadAccount` get aborted), matching the F002
      WS-reconnect-storm resetting the app's coalesced connection *at the moment
      of the signOut flow*. Net: **F001 correctly removed the false "Sign out
      failed" toast and the false signed-out→signed-in masking, but sign-out is
      still broken end-to-end until F002 is fixed.** Two follow-ups: (1) **fix
      F002** — the real remedy (make sign-out's requests actually land); (2)
      **reconsider F001's `unavailable` fallback** in `signOut()`: when the
      post-logout `/me` verification is itself aborted, `loadAccount` sets
      `unavailable`, which *hides the account menu entirely* — so the user sees
      a misleading blank/"signed-out-looking" state while still signed in, with
      no SIGN OUT button to retry. Prefer keeping the menu signed-in and showing
      a retryable Error toast when `/me` can't be reached, rather than blanking
      to `unavailable`. [artifacts: ui]
