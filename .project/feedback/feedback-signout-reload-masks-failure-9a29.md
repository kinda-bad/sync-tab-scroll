---
status: planned      # open -> planned
created: 2026-07-13
plan: plan-signout-reload-race-2026-07-13-2e98.md
---

# Feedback

## Bugs
- [x] F001 Sign out doesn't work on production (`sts.ty-pe.com`): clicking
      **Sign out** on the Landing (splash) page flashes the "Connection lost"
      banner, the page reloads, and you're **still signed in**. Server side is
      verified correct — `POST /auth/logout` returns `200` with `Set-Cookie:
      sts_session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax` (set and clear
      cookies use identical attributes; the handler also revokes the
      `AuthSession` server-side). Ruled out: no service worker, `/me` not
      cached. **Root cause is client-side** in `signOut()`
      (`client/src/account.ts:63`): it does
      `try { await fetch('/auth/logout',{method:'POST'}) } catch { /* ignore */ }`
      then unconditionally `window.location.reload()`. The `catch` swallows a
      failed logout, and the reload re-runs `loadAccount()` → `GET /me`, which
      re-reads the still-present cookie and shows signed-in again — so **a
      failed logout is silently presented as success** (the reload gives the
      illusion of signing out). The connection-lost flash is the network blip
      that failed the fetch. **Fix direction (primarily code):** only treat
      logout as done on a confirmed OK response; on failure, do NOT reload into
      a signed-in state — keep the account menu and surface an error (toast,
      per ui.md's terse-toast Error pattern) and/or retry; reload only after
      the cookie is actually cleared.

      **CONFIRMED via live browser reproduction + isolation test (2026-07-13,
      signed in as the real user on prod):** clicking Sign out reliably reloads
      but leaves you signed in (`/me` still returns the user). Crucially,
      running the exact logout request *in isolation in the page context* —
      `await fetch('/auth/logout',{method:'POST'})` with NO reload after —
      returns `200 {"ok":true}` and `/me` immediately returns
      `{"accountsEnabled":true,"user":null}` (signed out). So the endpoint, the
      fetch, and the cookie-clearing all work perfectly; **the differentiator
      is `window.location.reload()`** — in the real `signOut` flow the reload
      races/aborts the request so its `Set-Cookie` never lands, then the fresh
      page re-derives signed-in from the surviving cookie. No CSP/console error
      was observed (not a CSP or mixed-content block). This narrows the fix:
      **don't hard-reload racing the logout.** Prefer updating the account
      store to signed-out in-memory after a confirmed-OK logout (no reload
      needed), or reload only after re-confirming `/me` is anonymous; and check
      `response.ok`. Note the earlier "swallowed failure" framing still applies
      as a robustness gap, but the primary mechanism is the reload race, not a
      transient network blip.

      The `[artifacts: ui]` tag is for the small failure-surfacing decision
      (how a failed sign-out is shown, ui.md States/Error) — the core fix is in
      `client/src/account.ts`, not an artifact reversal. [artifacts: ui]
