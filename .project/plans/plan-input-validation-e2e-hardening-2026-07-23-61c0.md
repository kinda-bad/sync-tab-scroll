---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: input-validation-e2e-hardening
created: 2026-07-23
features: []
surfaced-defects: [0b8dc7ed, 59b17701]
---

# Plan: Input validation reject-behavior fix + e2e fixture-drift sweep

## Goal

Make server-side input validation actually reject invalid `displayName`/
activation-key input instead of silently sanitizing it, extend
validation/sanitization to every other user-input surface at both client
and server layers, and fix the remaining e2e specs whose `.first()`-based
fixture song selection breaks against the current multi-song fixture
catalog.

## Scope

**In scope:**
- `server/src/input-validation.ts` and its three call sites
  (`session-create`, `session-join`, `catalogue-unlock`): reject invalid
  input with an `error` message instead of silently sanitizing/truncating,
  matching `infrastructure.md`'s Input Validation section.
- Client-side validation for `displayName` (Landing View) and the
  activation-key field, as a UX nicety layered on top of the now-enforced
  server-side reject — never a substitute for it.
- Audit and close the same client+server validation gap for the join-code
  field.
- Audit and close the same gap for Phase 2 in-app authoring's input
  surfaces (`client/src/components/AuthoringModal.svelte`,
  `server/src/catalogue-authoring-routes.ts`): catalogue `slug`/`name`/
  activation `key` (create-catalogue), song `artist`/`title`/
  `submitterName` (add-song). Confirmed in scope — this feature is
  already `implemented`, not a future phase, and none of these fields
  currently have any server- or client-side validation.
- Fix the remaining e2e specs' `.first()`-based fixture song selection:
  `host-transfer.spec.ts`, `multi-participant.spec.ts`,
  `single-participant.spec.ts`, `small-screen.spec.ts`,
  `song-part-modal.spec.ts`, `lyrics-only-view.spec.ts`.

**Out of scope:**
- Co-owner invite-link handling — the link itself is a server-generated
  token, not user-typed input, so it isn't a validation surface the way
  the other authoring fields are.
- Any e2e spec whose `.first()` usage doesn't target song selection (song
  *part* selection, e.g. `.first()` picking "the only instrument part",
  is a different, currently-safe usage this plan doesn't touch).
- Rate limiting or any other hardening concern not named in the two
  source feedback items.

## Technical Approach

**Reject behavior** (`input-validation.ts`): change `validateDisplayName`/
`validateActivationKey` from returning a sanitized `string` to returning a
discriminated result — `{ ok: true; value: string } | { ok: false }` (a
named type per constitution Principle VI, not an inline literal at each
call site) — rejecting on any control character, HTML special character,
or over-length input, rather than stripping/truncating it. Each of the
three call sites (`session-create.ts`, `session-join.ts`,
`catalogue-unlock.ts`) sends `{ type: 'error', message: ... }` (the
existing wire shape every other rejected input here already uses,
ui.md States) on `ok: false` instead of proceeding with a mutated value.
Unicode/emoji continue to pass through unchanged — only the two documented
reject conditions (control/HTML chars, length) change from silent mutation
to rejection.

**Client-side validation**: a lightweight, non-authoritative check mirroring
the server's rules (same max lengths, same "no control/HTML chars"
constraint) surfaces inline feedback on the Landing View's "Your name"
input and the Lobby's activation-key input before submission — purely UX,
since the server enforcement above is what actually matters. The join-code
field gets the same treatment: today it has no format constraint client-
or server-side beyond an existence check on submit.

**Phase 2 authoring surfaces**: the same shared `sanitize`/reject helper
(generalized from `input-validation.ts` — reusable, not re-implemented per
field per constitution Principle VI) is applied server-side in
`catalogue-authoring-routes.ts` to `slug`/`name`/`key` (create-catalogue)
and `artist`/`title`/`submitterName` (add-song), rejecting with the
route's existing HTTP error-response shape rather than the WS `error`
message the other three surfaces use (this is an HTTP route, not a WS
handler). `AuthoringModal.svelte` gets the matching non-authoritative
client-side checks on the same fields.

**e2e fixture-drift sweep**: apply the same fix `host-controls.spec.ts`
(T023/T024) already established — replace `.first()` song-selection calls
with `.filter({ hasText: '<song name>' })`, picking whichever fixture song
each spec's assertions actually depend on (checked per-spec, since
different specs may rely on different song properties — lyrics track
presence, instrument count, etc.).

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is
tracked in the linked tasks file.

1. **Server: reject behavior** `[artifacts: infrastructure]` — change
   `input-validation.ts`'s return shape and wire the three call sites to
   send `error` on rejection. Addresses
   feedback-input-validation-reject-and-defense-in-depth-fc7d F001.
2. **Client: displayName + activation-key validation** `[artifacts: ui]`
   [parallel] — add non-authoritative client-side checks to the Landing
   View's name input and the activation-key input, surfacing inline
   feedback before submission.
3. **Client+server: join-code field audit** `[artifacts: ui, infrastructure]`
   [parallel] — determine and apply whatever format constraint is
   appropriate for the join-code field at both layers (current state: no
   constraint beyond existence).
4. **Phase 2 authoring: catalogue-creation field validation**
   `[artifacts: infrastructure]` [parallel] — generalize
   `input-validation.ts`'s sanitize/reject logic into a reusable helper,
   apply it server-side to `slug`/`name`/`key` in
   `catalogue-authoring-routes.ts`'s create-catalogue route, add matching
   client-side checks to `AuthoringModal.svelte`'s create-catalogue form.
   Addresses feedback-input-validation-reject-and-defense-in-depth-fc7d
   F002.
5. **Phase 2 authoring: add-song field validation** `[artifacts:
   infrastructure]` [parallel] — apply the same reusable helper server-side
   to `artist`/`title`/`submitterName` in the add-song route, add matching
   client-side checks to `AuthoringModal.svelte`'s add-song form. Addresses
   feedback-input-validation-reject-and-defense-in-depth-fc7d F002.
6. **e2e: fixture-drift sweep** [parallel] — fix `.first()`-based song
   selection in `host-transfer.spec.ts`, `multi-participant.spec.ts`,
   `single-participant.spec.ts`, `small-screen.spec.ts`,
   `song-part-modal.spec.ts`, `lyrics-only-view.spec.ts`. Addresses
   feedback-e2e-fixture-song-selection-drift-60d7 F001.

## Open Questions

- What format constraint (if any) the join-code field should actually
  enforce is left to Phase 3's implementation-time judgment — the artifact
  doesn't currently pin one down.
- Exact max lengths for the Phase 2 authoring fields (`slug`/`name`/`key`/
  `artist`/`title`/`submitterName`) are left to implementation-time
  judgment, following `input-validation.ts`'s existing precedent
  (64/256-char caps) as a starting point rather than a fixed rule.
