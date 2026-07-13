---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: reachable-account-controls   # the branch inline implementation would use; may never be created (solo mode, on default)
created: 2026-07-13
features: []
surfaced-defects: []
---

# Plan: Reachable Account Controls (Landing menu + dismissible song/part modal)

## Goal

A signed-in user can see who they are and sign out from anywhere — on the
Landing page before joining a session, and inside a session without being
permanently trapped behind the forced-open song/part modal.

## Scope

Two related open-feedback items, both `[artifacts: ui]`, folded into one plan
because both are about account controls staying reachable and both revise the
`ui.md` account/modal design:

1. **Landing account menu** (`feedback-landing-signin-missing-2ebd.md` F001,
   Reconsidered). Reverses ui.md:50–54, which scopes the account menu to the
   Lobby/Playback Bar only. **User-confirmed override.** The Landing
   create/join page should carry account controls in every state: identity +
   Sign out when signed-in, a "Sign in" link when signed-out, nothing when
   accounts are unavailable. Done by rendering the existing `AccountMenu`
   component on Landing, replacing today's raw signed-out-only sign-in buttons.

2. **Dismissible song/part modal** (`feedback-bar-controls-blocked-by-modal-f0e8.md`
   F001). The persistent Bar (Sign out, Leave, …) sits under every modal
   backdrop, and the `SongPartModal` is `dismissible={false}` until a song +
   part are chosen — so a signed-in user can't reach Sign out. **User's chosen
   fix (agreed): make the modal dismissible rather than a z-index override.**
   Every modal already dismisses (× / backdrop / Escape); only `SongPartModal`
   opted out. Making it dismissible means no modal ever traps the user — you
   dismiss it and the Bar is reachable, the conventional pattern. This reverses
   ui.md's deliberate "non-dismissible while unset" gating (lines 89–94,
   283–286).

**In scope**
- Revise `ui.md`: account controls on Landing (item 1); `SongPartModal`
  auto-opens once but is dismissible, staying closed after dismissal until
  reopened via the nav control (item 2).
- `client/src/views/Landing.svelte`: render `AccountMenu` in place of the raw
  signed-out-only buttons.
- `client/src/App.svelte`: `SongPartModal` becomes `dismissible={true}`; add a
  "dismissed" flag so it auto-opens once when song/part is unset but stays
  closed after the user dismisses it, reopened via the "Song & part" control.
- Playwright component/e2e tests for both, test-first.

**Out of scope**
- `Modal.svelte` — already supports backdrop-click, Escape, and × dismissal
  gated on `dismissible`, with panel-click propagation stopped. No change.
- `AccountMenu.svelte` itself — reused as-is (it already renders identity +
  Sign out / "Sign in" / nothing-when-unavailable by `status`).
- Any z-index / Bar layering change — the dismissible-modal fix supersedes it;
  the Bar stays `z-index: 100`, below modals, as today.
- The account/OAuth wiring (`account.ts`, `/auth/*`) — unchanged; this is
  presentation/placement only.

## Technical Approach

Reference decisions: ui.md (account menu placement, Lobby modal behavior),
constitution Principle VII (test-first), and the existing `AccountMenu` /
`Modal` component contracts.

1. **Landing account menu.** `AccountMenu` is already a self-contained
   component (`status` / `displayName` / `onSignIn` / `onSignOut`; renders
   nothing when `status` is unavailable) used in the Bar via `App.svelte:165`.
   In `Landing.svelte`, replace the `{#if $accountStore.status === 'signed-out'}`
   raw-buttons block with `<AccountMenu … />`, wiring `accountStore`, `signIn`,
   `signOut` (Landing already imports `signIn`). Keep it visually subordinate
   on the chooser, per ui.md ("optional, never a gate").

2. **Dismissible song/part modal.** In `App.svelte`, the modal is forced open
   one-directionally today: `$: needsSongOrPart = view==='lobby' && (!selectedSong || !hasPart)`
   then `$: if (needsSongOrPart) songPartModalOpen = true`, with the
   `SongPartModal` rendered `dismissible={false}` (App.svelte ~line 170). Change
   to: add a `songPartDismissed` boolean; make the auto-open guard
   `if (needsSongOrPart && !songPartDismissed) songPartModalOpen = true`; render
   `dismissible={true}` and set the modal's `onClose` to a handler that sets
   `songPartDismissed = true` and `songPartModalOpen = false`; the "Song & part"
   nav toggle reopens it (and may clear the flag). `Modal.svelte` already turns
   ×/backdrop/Escape into `onClose` when dismissible, so no Modal change is
   needed. Net effect: the picker still greets a user who has nothing selected,
   but a dismiss reveals the (still-persistent) Bar and its Sign out / Leave.

Test-first per Principle VII; browser tests are Playwright (project
convention, not vitest/jsdom).

## Phase Breakdown

### Phase 1 — Artifact revision
- **T001 [artifacts: ui]** Revise `ui.md` for both items. (a) Account &
  Sign-In section (~lines 45–79): account controls (the `AccountMenu`
  component) also render on the **Landing** view — identity + Sign out when
  signed-in, a "Sign in" link when signed-out, absent when accounts
  unavailable — not only in the Bar; update the "Sign-in affordance" paragraph
  and the signed-in/out/unavailable "States" bullets so they no longer imply
  the menu is Bar-only. (b) Lobby View (~lines 89–94, 283–286): the
  `SongPartModal` auto-opens once when song/part is unset but is **dismissible**
  (× / backdrop / Escape); once dismissed it stays closed until reopened via
  the "Song & part" nav control, even while still unset — a persistent Bar
  control (Sign out, Leave) must stay reachable, so no modal permanently traps
  the user. Stamp `last_updated 2026-07-13` and `diagram_status stale`.
  (Feedback: landing-signin F001 + bar-controls F001.)

### Phase 2 — Implementation (both depend on T001; parallel to each other)
- **T002 [artifacts: ui] [parallel]** Landing account menu. In
  `client/src/views/Landing.svelte`, replace the raw signed-out-only sign-in
  block with the existing `<AccountMenu status={$accountStore.status}
  displayName={$accountStore.displayName} onSignIn={signIn} onSignOut={signOut} />`
  (import `AccountMenu`, `accountStore`, `signOut`; `signIn` already imported),
  kept visually subordinate on the chooser. Test-first (Principle VII, Playwright
  CT): on Landing, signed-in shows the display name + a working Sign out;
  signed-out shows "Sign in"; accounts-unavailable shows nothing. (landing-signin
  F001.) Touches `Landing.svelte` only — parallel-safe with T003.
- **T003 [artifacts: ui] [parallel]** Dismissible song/part modal. In
  `client/src/App.svelte`, render the `SongPartModal` `dismissible={true}`; add
  a `songPartDismissed` flag; change the auto-open guard to
  `needsSongOrPart && !songPartDismissed`; give the modal an `onClose` that sets
  `songPartDismissed = true` and closes it; ensure the "Song & part" nav control
  reopens it. Do NOT modify `Modal.svelte` (it already dismisses on
  ×/backdrop/Escape when `dismissible`). Test-first (Principle VII, Playwright):
  with song/part unset, the modal can be dismissed (× and backdrop), stays
  closed afterward, reopens via the "Song & part" control, and the Bar's Sign
  out / Leave are reachable once it's dismissed. (bar-controls F001.) Touches
  `App.svelte` only — parallel-safe with T002.

## Open Questions

- **Diagram refresh.** T001 restructures the Landing account affordance, so the
  `ui.md` diagram (`README.md` `## UI`, which shows `Landing --> SignIn`) goes
  stale. T001 stamps `diagram_status stale`; run `/ardd-diagram ui` after
  implementation to regenerate. Not a blocker.
- **Dismissed-flag reset.** After the user picks a song+part the modal is no
  longer needed, so `songPartDismissed` can be left set or reset — either is
  fine since `needsSongOrPart` is then false. Reset it if a later change makes
  the session need a song again (e.g. it never does today). Resolve in T003;
  keep the state minimal.
