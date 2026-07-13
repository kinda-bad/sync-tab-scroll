---
status: planned
created: 2026-07-13
plan: plan-reachable-account-controls-2026-07-13-ca49.md
---

# Feedback

## Bugs
- [x] F001 Persistent bottom-`Bar` controls — including the new account menu's
  **Sign out** (and Sign in, Leave session, ReadinessBadge) — are unclickable
  whenever a modal is open. Root cause is a z-index/layering conflict: `Bar` is
  `position:fixed; bottom:0; z-index:100` (`Bar.svelte`), but `Modal`'s backdrop
  is `position:fixed; inset:0; z-index:1010; rgba(0,0,0,0.6)` (`Modal.svelte`),
  so an open modal overlays and dims the entire Bar and intercepts every click.
  This bites hardest with `SongPartModal`, the default lobby state, which is
  `dismissible={false}` with no `×` until a song+part is chosen
  (`App.svelte:170`) — so a signed-in user cannot reach Sign out until they pick
  a song. Verified in the production browser sign-in test: clicking Sign out
  fired **no** network request (`elementFromPoint` returned the backdrop) and
  `/me` still returned the signed-in user afterward. The Sign-out handler itself
  is correctly wired (`App.svelte:165` `onSignOut={signOut}`; `account.ts`
  `signOut()` does `fetch('/auth/logout',{method:'POST'})` + reload) — this is
  purely click interception, not a bug in the account code. Conflicts with
  ui.md's "persistent account menu in the Lobby/Playback Bar" — a persistent
  control must stay reachable while a modal is open. Fix direction: a
  z-index/layering decision (raise the Bar above modal backdrops, or otherwise
  keep the account menu reachable while a modal is up), and likely a small
  ui.md clarification on the account menu's persistence vs. modal blocking.
  Discovered post-completion of `tasks-accounts-phase-1-02f7.md`. [artifacts: ui]
