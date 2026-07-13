---
status: open      # open -> planned
created: 2026-07-13
plan: null        # set to the consuming plan's filename once planned
---

# Feedback

## Bugs
- [ ] F001 Sign out doesn't work on production (`sts.ty-pe.com`): clicking
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
      the cookie is actually cleared. Secondary: investigate *why* the logout
      fetch fails at that moment (the coincident WS "connection lost" — is the
      request systematically failing, or a transient blip?). The `[artifacts:
      ui]` tag is for the small failure-surfacing decision (how a failed
      sign-out is shown, ui.md States/Error) — the core fix is in
      `client/src/account.ts`, not an artifact reversal. [artifacts: ui]
