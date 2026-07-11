---
status: approved
branch: song-select-unlock-guard
created: 2026-07-10
features: []
surfaced-defects: [31c5630a]
---

# Song-Select Unlock Guard

## Goal

Make `song-select` reject selecting a song from a catalogue the session
hasn't unlocked, honoring the contract `infrastructure.md`'s Song Catalog
Delivery section already documents.

## Scope

**In scope**: a server-side visibility guard in
`server/src/handlers/song-select.ts` and its paired test in
`song-select.test.ts`.

**Out of scope**:
- Any artifact revision — `infrastructure.md` already states the intended
  behavior ("Selecting a song from a catalogue the session hasn't unlocked
  is rejected as an error (mirroring an invalid `CatalogSong.id`)"); this
  plan brings the code up to that claim, so no `[artifacts: ...]` task is
  needed. This addresses feedback **F001**
  (`feedback-song-select-unlock-guard-705b.md`) and clears defect
  **`31c5630a`** (`DEFECTS.md`, 2026-07-10 pass).
- Static asset access. `/catalog/<catalogue>/<song>/...` files remain served
  ungated (a known posture, unchanged here) — this guard is a session-state
  gate on *selection*, matching the catalog-listing gate `visibleCatalog`
  already applies, not a new asset-access control.
- Rate limiting / distinguishing failure reasons — out of posture, same as
  the `catalogue-unlock` handler.

## Technical Approach

`handleSongSelect` currently looks the id up in the full server-global
`ctx.catalog.songs` list (correct — song-select shouldn't re-derive
visibility from scratch) and accepts any match. Add one check after the
existing not-found guard: resolve the song's catalogue via
`ctx.catalog.catalogues.find((c) => c.id === song.catalogueId)`, and if that
catalogue is private (`!catalogue.public`) and its id is **not** in
`session.unlockedCatalogueIds`, reject.

Reject with the **same `Song ${message.songId} not found` error** the
invalid-id path already sends, rather than a distinct "not unlocked"
message — `infrastructure.md` specifies "mirroring an invalid
`CatalogSong.id`", and keeping the two indistinguishable matches the
no-information-to-a-brute-forcer posture the `catalogue-unlock` handler
already follows (a tampered client learns nothing about which private
catalogues exist). A `session` is already in scope in the handler (resolved
from the connection, just above the host check).

## Phase Breakdown

### Phase 1 — Guard + test (no dependencies)

1. `[artifacts: infrastructure]` (context only — no artifact edit) Test
   (constitution Principle VII, test-first): add cases to
   `server/src/handlers/song-select.test.ts`, using the existing
   `makeCtx`/`fakeSong` helpers extended with a private catalogue in
   `catalog.catalogues`. Cover, for a host sender:
   (a) selecting a song whose `catalogueId` is a private catalogue **not**
   in `session.unlockedCatalogueIds` sends an `error` and leaves
   `session.selectedSong` unchanged;
   (b) selecting that same song **after** its catalogue id is in
   `session.unlockedCatalogueIds` succeeds (sets `selectedSong`);
   (c) selecting a public/`"default"` catalogue song still succeeds
   (regression guard for the existing path).
   Confirm (a)/(b) fail before implementing. Addresses **F001** /
   `[defect: 31c5630a]`.
2. Implement the guard in `server/src/handlers/song-select.ts`: after the
   existing `if (!song)` not-found check, look up the song's catalogue in
   `ctx.catalog.catalogues` and, when it is private and not in
   `session.unlockedCatalogueIds`, send the same `Song ${message.songId}
   not found` error and return before mutating session state. Make the
   Phase 1 tests pass; run the full server vitest suite to confirm no
   regression to the existing song-select cases. Addresses **F001** /
   `[defect: 31c5630a]`.

Demonstrable: a scripted/stale client selecting a locked private
catalogue's song is rejected exactly like an unknown id, while an unlocked
or public song still selects normally.

## Complexity Tracking

None — a single lookup-and-compare guard reusing the existing error path,
no new message type, dependency, or state.

## Open Questions

None.

## Production Annotation Summary

None — no new production shortcut. (The existing "no rate limiting" posture
is already annotated at the `catalogue-unlock` handler; this plan adds
nothing that needs a new annotation.)
