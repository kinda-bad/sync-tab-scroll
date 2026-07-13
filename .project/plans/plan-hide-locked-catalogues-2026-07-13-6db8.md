---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: hide-locked-catalogues   # the branch inline implementation would use; may never be created (solo mode, on default)
created: 2026-07-13
features: []
surfaced-defects: []
---

# Plan: Hide Locked Catalogues Until Unlocked

## Goal

Locked (private, not-yet-unlocked) catalogues no longer appear in the Lobby
song picker at all; the host reaches them through a single standalone "Enter
activation key" control that resolves the key without ever naming the locked
catalogue (feedback F001).

## Scope

**Scope grew beyond the feedback's `[artifacts: ui]` tag.** Making the picker
hide locked catalogues while still letting a host unlock one requires the
host to type *only* a key — they no longer pick a catalogue. The server today
resolves `catalogue-unlock` **by** `catalogueId`
(`server/src/handlers/catalogue-unlock.ts`, infrastructure.md), so key-only
unlock is a protocol + server change, not a UI-only change. Hiding the
catalogues also means the server should stop sending their names to the
client (it does today, to render the locked header).

**In scope**
- Revise `ui.md`: reverse the "locked catalogue shows its name + locked
  indicator, host sees an inline Enter-activation-key control on the group
  header" decision → locked catalogues absent from the picker; one standalone
  host-only key control (feedback F001).
- Revise `infrastructure.md` Catalogue Activation Key Unlock: the message
  drops `catalogueId` (server resolves by trying the key against every locked,
  not-yet-unlocked catalogue); `visibleCatalog` stops emitting locked
  catalogue metadata.
- `packages/shared`: change the `catalogue-unlock` message shape (drop
  required `catalogueId`).
- `server/src/handlers/catalogue-unlock.ts`: resolve the key against all
  locked catalogues instead of a named one.
- `server/src/catalog-loader.ts` `visibleCatalog`: exclude locked catalogue
  records from the emitted `catalogues`.
- `client/src/components/SongPartModal.svelte`: no locked groups; one
  standalone host-only "Enter activation key" control.
- Tests for each changed layer (shared/server/client), test-first.

**Out of scope**
- Signed-in membership auto-unlock and key-persistence — unchanged (still
  keys on the resolved catalogue id, just resolved server-side now).
- Non-host participant experience beyond seeing fewer groups — a non-host
  already has no unlock control.
- Rate limiting / lockout on wrong keys — constitution Production Posture
  scopes it out; the existing production annotation in the handler stays.

## Technical Approach

Reference decisions live in ui.md (picker), infrastructure.md (unlock
protocol, `visibleCatalog`), datamodel.md (`Catalogue.public`, Activation
Key salt/hash/epoch), and constitution Principle VI (shared named types),
VII (test-first), VIII (n/a — no new env).

1. **Key-only resolution (server).** `handleCatalogueUnlock` iterates the
   locked, not-yet-unlocked catalogues (`!public && salt && hash &&
   !unlockedIds.includes(id)`) and `scrypt`+`timingSafeEqual`-compares the
   typed key against each. First match → unlock that catalogue (append to
   `unlockedCatalogueIds`, `recordKeyUnlock`, broadcast `session-state` +
   fresh `catalog`, best-effort membership persist — all unchanged from
   today). No match → the same terse `error` toast as a wrong key today, so
   the client still can't distinguish "wrong key" from "no such catalogue"
   (infrastructure.md's existing no-information posture). Host-only guard
   unchanged. Compare against every locked catalogue (don't early-return on a
   public/already-unlocked one) so timing/behavior doesn't leak which ids
   exist.
2. **Stop leaking locked metadata (server).** `visibleCatalog` returns only
   public + unlocked catalogues in `catalogues` (it already withholds their
   songs; now it withholds their existence). The client therefore never
   receives a locked catalogue's id or name.
3. **Shared type.** Drop the required `catalogueId` from the
   `catalogue-unlock` client message (Principle VI — one named type, updated
   in `packages/shared`, consumed by both ends).
4. **Client.** In `SongPartModal.svelte`: the `groups` array now only ever
   contains visible catalogues (server no longer sends locked ones), so the
   `locked` derivation, the locked-indicator span, and the per-group inline
   unlock form all go away. Add one host-only standalone "Enter activation
   key" control in the modal body (persistent, not attached to any group),
   reusing `keyInput`; `submitUnlock` sends `{ type: 'catalogue-unlock', key }`.
   On success the server's wider `catalog` broadcast makes the newly-unlocked
   catalogue's group appear. Base the `grouped` threshold on the (already
   visible-only) catalogue count.

## Phase Breakdown

### Phase 1 — Artifact revisions
- **T001 [artifacts: ui]** Revise `ui.md`'s Lobby song-picker paragraph
  (~lines 97–113) and reconcile the Account "What signing in changes" /
  "States" bullets: locked private catalogues do not appear in the picker;
  the host has one standalone "Enter activation key" control that, on success,
  makes the unlocked catalogue's group appear. Preserve signed-in-member
  pre-unlock and key-persistence behavior. (Feedback F001.)
- **T002 [artifacts: infrastructure]** Revise the Catalogue Activation Key
  Unlock section (~lines 316–342): message is `catalogue-unlock { key }` (no
  `catalogueId`); server resolves by comparing the key against every locked,
  not-yet-unlocked catalogue and unlocks the match, same two-broadcast success
  path; no-match reuses the existing terse `error`. Note `visibleCatalog` no
  longer emits locked catalogue metadata. Keep the persistence and
  no-rate-limiting paragraphs. [parallel with T001 — different artifact]

### Phase 2 — Shared + server (depends on T002)
- **T003 [artifacts: infrastructure]** In `packages/shared`, change the
  `catalogue-unlock` message type to drop `catalogueId`. Update any type-level
  consumers. Test-first: adjust/extend the shared type's tests if present,
  and let the server/client test suites in T004/T005 exercise the shape.
- **T004 [artifacts: infrastructure, datamodel]** Rewrite
  `handleCatalogueUnlock` to resolve by key across all locked catalogues
  (constant-ish work over the locked set, no early public/unlocked exit that
  could leak ids), and change `visibleCatalog` in `catalog-loader.ts` to
  exclude locked catalogues from the returned `catalogues`. Test-first
  (Principle VII): extend `catalogue-unlock.test.ts` — a correct key unlocks
  the right catalogue with no id supplied; a wrong key errors; host-only still
  enforced; already-unlocked/public keys don't match; and a `visibleCatalog`
  test that locked catalogues are absent from `catalogues` (not just their
  songs).

### Phase 3 — Client (depends on T001, T003, T004)
- **T005** Update `SongPartModal.ct.spec.ts` first (red): a locked private
  catalogue's name and songs never render; a single host-only standalone
  unlock control is present; submitting a correct key reveals the catalogue's
  group and songs; a non-host sees neither locked groups nor the control.
  Then implement in `SongPartModal.svelte`: drop the `locked` derivation /
  indicator / per-group unlock form, add the standalone host-only control
  sending `{ type: 'catalogue-unlock', key }`, base `grouped` on the visible
  catalogue count. Playwright CT (memory: browser tests use Playwright).

## Open Questions

- **Metadata non-leak — confirm desired.** This plan has the server stop
  sending locked catalogue names to the client (step 2). It's the consistent
  reading of "hidden," but it's slightly more than the literal feedback (which
  spoke only of the *picker*). If you'd rather keep the change minimal and
  purely client-side presentation — server still sends locked metadata, client
  just doesn't render it — say so and T004's `visibleCatalog` change / T002's
  note drop out. (Recommended: keep the non-leak; hiding names is the point.)
- **Multiple locked catalogues sharing behavior on no-match.** With key-only
  resolution, a wrong key is indistinguishable from "no locked catalogues
  exist," which is intentional (no-information posture). Confirm that's
  acceptable UX — the host gets one generic "Incorrect activation key" toast.
