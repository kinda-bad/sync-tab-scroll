---
plan: plan-hide-locked-catalogues-2026-07-13-6db8.md
generated: 2026-07-13
status: completed   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Artifact revisions

- [x] T001 [artifacts: ui] Revise `ui.md`'s Lobby-View song-picker paragraph
  (currently ~lines 97–113, the "grouped by `Catalogue` … locked catalogue's
  group header" passage) and reconcile the Account & Sign-In "What signing in
  changes" / "States" bullets. New decision-of-record: a private,
  not-yet-unlocked catalogue **does not appear in the picker at all** (no name,
  no locked indicator, no song list). The host — and only the host — has a
  **single standalone "Enter activation key" control** in the modal (not
  attached to any catalogue group); submitting a valid key makes the unlocked
  catalogue's group appear in the list, same as an already-unlocked private
  catalogue. Preserve the signed-in-member pre-unlock behavior and the
  signed-in key-persistence sentence. Stamp frontmatter:
  `ardd-state.sh stamp .project/artifacts/ui.md last_updated 2026-07-13` and
  `diagram_status stale`. (Feedback F001.)

- [x] T002 [artifacts: infrastructure] [parallel] Revise `infrastructure.md`'s
  "Catalogue Activation Key Unlock" section (~lines 316–342). The message is
  now `catalogue-unlock { key }` — no `catalogueId`. The server resolves the
  key by hashing it (`scrypt` + `timingSafeEqual`) against **every** locked,
  not-yet-unlocked catalogue and unlocks the first match; the two-broadcast
  success path (`session-state` + fresh `catalog`) is unchanged. A no-match is
  the same terse `error` as a wrong key today (unchanged no-information
  posture — client still can't distinguish wrong-key from no-such-catalogue).
  Add that `visibleCatalog` no longer emits locked catalogue metadata (the
  client never learns a locked catalogue's id/name). Keep the persistence
  (logged-in host) and no-rate-limiting/production-annotation paragraphs.
  Stamp frontmatter: `last_updated 2026-07-13`, `diagram_status stale`.
  (Different artifact from T001 — safe to run in parallel.)

## Phase 2: Shared + server (depends on T002)

- [x] T003 [artifacts: infrastructure] In `packages/shared/src/index.ts`,
  change the `catalogue-unlock` client message type to drop the required
  `catalogueId` field, leaving `{ type: 'catalogue-unlock'; key: string }`.
  Update every type-level consumer that constructs or destructures the message
  (server handler, client `submitUnlock`, any tests) so the workspace
  typechecks. Named-type change per constitution Principle VI — one definition,
  both ends. Verify with a package build/typecheck; the behavioral assertions
  land in T004/T005's suites.

- [x] T004 [artifacts: infrastructure, datamodel] Test-first (constitution
  Principle VII). First extend `server/src/handlers/catalogue-unlock.test.ts`
  (red): with the new keyless-of-catalogueId message, a correct key unlocks the
  correct catalogue (assert it lands in `unlockedCatalogueIds` and the wider
  `catalog` broadcast); a wrong key returns the terse `error` and unlocks
  nothing; the host-only guard still rejects a non-host; a key matching an
  already-unlocked or public catalogue does not "re-unlock"; and add/adjust a
  `catalog-loader` test asserting `visibleCatalog` excludes locked catalogues
  from the returned `catalogues` array (not only their songs). Then implement
  (green): rewrite `handleCatalogueUnlock` in
  `server/src/handlers/catalogue-unlock.ts` to iterate the locked,
  not-yet-unlocked catalogues (`!public && salt && hash && !unlockedIds.includes(id)`)
  and `scrypt`+`timingSafeEqual`-compare the key against each, unlocking the
  first match — do not early-return on public/already-unlocked entries in a way
  that leaks which ids exist; keep `recordKeyUnlock`, both broadcasts, and the
  best-effort membership persist for a logged-in host intact. Change
  `visibleCatalog` in `server/src/catalog-loader.ts` to omit locked catalogues
  from `catalogues`.

## Phase 3: Client (depends on T001, T003, T004)

- [x] T005 Test-first (Principle VII; Playwright CT per project convention).
  First update `client/src/components/SongPartModal.ct.spec.ts` (red): a
  locked private catalogue's name and songs never render in the picker; a
  single **host-only** standalone "Enter activation key" control is present;
  submitting a correct key reveals the newly-unlocked catalogue's group and its
  songs; a non-host participant sees neither locked groups nor any unlock
  control. Then implement in `client/src/components/SongPartModal.svelte`
  (green): the server now sends only visible catalogues, so remove the `locked`
  derivation, the `locked-indicator` span, and the per-group inline unlock form
  and its `unlockingCatalogueId` state; add one persistent host-only standalone
  "Enter activation key" control in the modal body; have `submitUnlock` send
  `{ type: 'catalogue-unlock', key: keyInput }` (no `catalogueId`); base the
  `grouped` threshold on the visible-catalogue count. On success the server's
  wider `catalog` broadcast makes the group appear — no extra client wiring.
