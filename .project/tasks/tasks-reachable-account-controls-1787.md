---
plan: plan-reachable-account-controls-2026-07-13-ca49.md
generated: 2026-07-13
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Artifact revision

- [x] T001 [artifacts: ui] Revise `ui.md` for both feedback items.
  **(a) Account controls on Landing** — in the "Account & Sign-In (Optional)"
  section (~lines 45–79): state that account controls (the `AccountMenu`
  component) also render on the **Landing** create/join view, not only in the
  Lobby/Playback Bar — identity + Sign out when signed-in, a "Sign in" link
  when signed-out, and absent when accounts are unavailable. Update the
  "Sign-in affordance" paragraph and the signed-in / signed-out / unavailable
  "States" bullets so they no longer imply the menu is Bar-only. (Reverses the
  Bar-only scoping; landing-signin F001, Reconsidered — user-confirmed.)
  **(b) Dismissible song/part modal** — in the Lobby View (~lines 89–94 and the
  cases-2–4 note ~lines 283–286): the `SongPartModal` auto-opens once when the
  session's song or this participant's part is unset, but is **dismissible**
  (× / backdrop click / Escape); once dismissed it stays closed until reopened
  via the "Song & part" nav control, even while still unset. Rationale (state
  it): a persistent Bar control (Sign out, Leave) must stay reachable, so no
  modal permanently traps the user. (bar-controls F001.)
  Then stamp frontmatter: `ardd-state.sh stamp .project/artifacts/ui.md
  last_updated 2026-07-13` and `ardd-state.sh stamp .project/artifacts/ui.md
  diagram_status stale`.

## Phase 2: Implementation (both depend on T001)

- [ ] T002 [artifacts: ui] [parallel] Landing account menu (landing-signin
  F001). Test-first (constitution Principle VII; Playwright CT per project
  convention). First write/adjust a component test (red) asserting that on the
  Landing view: when `accountStore.status` is `signed-in`, the display name and
  a working **Sign out** control render; when `signed-out`, a "Sign in" control
  renders; when accounts are unavailable, nothing account-related renders. Then
  implement (green): in `client/src/views/Landing.svelte`, replace the current
  `{#if $accountStore.status === 'signed-out'}` raw sign-in-buttons block with
  `<AccountMenu status={$accountStore.status}
  displayName={$accountStore.displayName} onSignIn={signIn} onSignOut={signOut} />`
  — import `AccountMenu` from `../components/AccountMenu.svelte`, and
  `accountStore` + `signOut` from `../account` (`signIn` is already imported).
  Keep it visually subordinate on the chooser (optional, never a gate, per
  ui.md). Touches `Landing.svelte` only — parallel-safe with T003.

- [ ] T003 [artifacts: ui] [parallel] Dismissible song/part modal (bar-controls
  F001). Test-first (Principle VII; Playwright). First write a test (red): in
  the Lobby with the session's song or this participant's part unset, the
  `SongPartModal` can be dismissed via the × and via a backdrop click, then
  **stays closed** (does not immediately re-open) while still unset, reopens via
  the "Song & part" nav control, and once dismissed the persistent Bar's **Sign
  out** and **Leave session** controls are clickable/reachable. Then implement
  (green) in `client/src/App.svelte`: render the `SongPartModal`
  `dismissible={true}`; add a `songPartDismissed` boolean; change the auto-open
  guard from `if (needsSongOrPart) songPartModalOpen = true` to
  `if (needsSongOrPart && !songPartDismissed) songPartModalOpen = true`; give the
  modal an `onClose` handler that sets `songPartDismissed = true` and
  `songPartModalOpen = false`; ensure the "Song & part" nav control's toggle
  reopens it (clearing/ignoring the flag as needed). Do **not** modify
  `Modal.svelte` — it already routes ×/backdrop/Escape to `onClose` when
  `dismissible`. Touches `App.svelte` only — parallel-safe with T002.
