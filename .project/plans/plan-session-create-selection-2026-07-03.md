---
status: approved
branch: session-create-selection
created: 2026-07-03
features: []
---

# Plan: Session Create/Selection Split

## Goal

Split the Landing view's muddled single-card create/join UI into two
clearly separate forms (a choice screen leading to either), each with
its own name input and real Enter-to-submit behavior, and fix the
join-code placeholder's character count to match the server's actual
4-character codes.

## Scope

**In scope:**
- Replace `Landing.svelte`'s single combined card (one shared "Your
  name" input sitting above both a "Create session" button and a
  separate join-code-input-plus-"Join" section) with a small chooser →
  form flow: an initial choice ("Create a session" / "Join a session"),
  then a form specific to the chosen action — each with its own "Your
  name" input, so the two flows read as fully distinct rather than one
  card where the name field's ownership is ambiguous.
  [feedback: session-create-selection-0411 UX #1]
- Give each form real submit semantics (native `<form>` +
  `onsubmit`/`preventDefault`) so pressing `Enter` while focused in the
  create form attempts session creation, and `Enter` in the join form
  attempts joining — no keydown-guessing between two co-located actions,
  since only one action is ever presented at a time now.
  [feedback: session-create-selection-0411 UX #2]
- Fix `Landing.svelte`'s "Session code" input placeholder from `"ABC123"`
  (6 characters) to a 4-character example matching
  `server/src/session-store.ts`'s actual `generateJoinCode()` output.
  [feedback: session-create-selection-0411 Bug #1]
- Add shared `createSessionAsHost(page, name)` /
  `joinSessionAsMember(browser, name, code)` helpers to
  `client/e2e/helpers.ts`, and switch every e2e spec file currently
  duplicating this inline (`single-participant.spec.ts`,
  `song-part-modal.spec.ts`, `multi-participant.spec.ts`,
  `host-controls.spec.ts`) to use them — this both fixes the locator
  drift the chooser step introduces and removes five copies of the same
  setup boilerplate.

**Out of scope, deferred (not forgotten):**
- Any change to `session-persistence.ts`'s silent-rejoin-on-refresh logic
  (`onMount`'s `loadStoredSession()` check) — untouched, still bypasses
  the new chooser entirely when a stored session exists, same as today.
- Any URL/routing change (e.g. `/create` vs `/join` as real routes) —
  this app has no router at all (`store.ts`'s `ViewState` is a plain
  enum, not URL-backed), and nothing in the feedback asks for
  deep-linkability. The chooser is local component state within
  `Landing.svelte`, not a new `ViewState` value.

## Technical Approach

**Chooser + two forms, all local to `Landing.svelte`**: introduce a
local `let mode: 'choice' | 'create' | 'join' = 'choice'` in
`Landing.svelte`. The `'choice'` state renders two buttons ("Create a
session", "Join a session") that set `mode`. `'create'` and `'join'`
each render their own small form component (`LandingCreateForm.svelte`,
`LandingJoinForm.svelte` — or inline blocks in `Landing.svelte` if
splitting into separate files adds no real value; decide at
implementation time based on how much markup each actually needs) with
its own `TextInput` for name (and, for join, the code), wrapped in a
native `<form onsubmit={(e) => { e.preventDefault(); createSession(); }}>`
(Svelte 5 event syntax) so `Enter` submits via the browser's own form
semantics rather than a manual keydown listener — simpler and more
robust (handles IME composition, screen readers, etc. for free). Each
form gets a small "back" control returning `mode` to `'choice'`.
`onMount`'s existing silent-rejoin check (`loadStoredSession()` →
`connect(...)`) is unaffected — it fires before any of this renders,
same as today.

**No `ViewState`/routing change**: this stays entirely inside
`Landing.svelte`'s own local state, consistent with the constitution's
simplicity principle — there's no need to introduce a new top-level view
or router for what's fundamentally a two-step form within one existing
view.

**E2E fallout, consolidated rather than patched five times**: every
existing e2e spec currently duplicates
`page.getByPlaceholder('Musician').fill(...)` +
`page.getByRole('button', { name: 'Create session' }).click()` (or the
join equivalent) inline. Once the chooser step is added, each of these
needs an extra initial click ("Create a session" / "Join a session")
before the name field exists at all — rather than patching that into
five files independently, add `createSessionAsHost(page, name)` and
`joinSessionAsMember(browser, name, code)` to the already-existing
shared `client/e2e/helpers.ts` (which already holds `readStoredSession`/
`sendAsParticipant`), and have every spec file call them instead of
inlining the sequence.

## Phase Breakdown

### Phase 1: Chooser + split forms
- Write a test first (Principle VII): update
  `client/e2e/single-participant.spec.ts` to expect the new chooser step
  (click "Create a session" before the name field is fillable). Confirm
  it fails against the current single-card `Landing.svelte`.
- Restructure `Landing.svelte` into the `'choice' | 'create' | 'join'`
  local-state flow described in Technical Approach, each form using
  native `<form onsubmit>` for its primary action.
  [feedback: session-create-selection-0411 UX #1, UX #2]
- Run the updated `single-participant.spec.ts` test and confirm it
  passes.
- **[artifacts: ui]** Revise `ui.md`'s Landing View section to describe
  the chooser → form flow instead of the current single combined card.
  Bump `last_updated`.

### Phase 2: Join-code placeholder fix
- Fix `Landing.svelte`'s (now in the join form) "Session code" input
  placeholder from `"ABC123"` to a 4-character example (e.g. `"AB12"`),
  matching `server/src/session-store.ts`'s `generateJoinCode()`.
  [feedback: session-create-selection-0411 Bug #1]

### Phase 3: Shared e2e helpers + fallout fixes
- Add `createSessionAsHost(page: Page, name: string): Promise<void>` and
  `joinSessionAsMember(browser: Browser, name: string, code: string):
  Promise<{ context: BrowserContext; page: Page }>` to
  `client/e2e/helpers.ts`, each performing the chooser click + form
  fill + submit sequence once.
- Update `client/e2e/song-part-modal.spec.ts`,
  `client/e2e/multi-participant.spec.ts`, and
  `client/e2e/host-controls.spec.ts` (each of which has its own inline
  `joinAsMember`-style helper function duplicating this today) to call
  the new shared helpers instead of their own inline versions.
- Run the full e2e suite and confirm no regressions from the chooser
  step across every spec file.

### Phase 4: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and
  `pnpm --filter client test:e2e`. Confirm every test passes with no
  regressions. Report final test/file counts.

## Complexity Tracking

None — this stays within `Landing.svelte`'s existing local-state
pattern (no new `ViewState`, no router), and the e2e helper
consolidation removes duplication rather than adding a new abstraction
layer on top of existing test infrastructure.

## Open Questions

None outstanding — the local-state chooser (not a new routed view) and
native-form Enter-submit approach were the simplest options consistent
with the feedback's actual ask; nothing here needs the user's input
before implementation.

## Production Annotation Summary

None anticipated.
