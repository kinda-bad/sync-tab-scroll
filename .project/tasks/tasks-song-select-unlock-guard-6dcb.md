---
plan: plan-song-select-unlock-guard-2026-07-10.md
generated: 2026-07-10
status: ready
---

# Tasks

## Phase 1: Guard + test

- [ ] T001 [artifacts: infrastructure] Write a failing test (constitution
      Principle VII, test-first) in
      `server/src/handlers/song-select.test.ts`. Extend the existing
      `makeCtx` helper so its `catalog.catalogues` includes a private
      catalogue (e.g. `{ id: 'premium-pack', name: 'Premium Pack', public:
      false }`) alongside the default public one, and add a
      `fakeSong('bonus', 'premium-pack')`-style song tagged to it (the
      existing `fakeSong` sets `catalogueId: 'default'`; add a variant or
      parameter for the catalogue id). Cover, for a **host** sender:
      (a) selecting the private-catalogue song while its id is **not** in
      `session.unlockedCatalogueIds` sends an `error` and leaves
      `session.selectedSong` unchanged (no broadcast/state mutation);
      (b) selecting that same song **after** pushing its catalogue id into
      `session.unlockedCatalogueIds` succeeds — `selectedSong` is set and
      the normal `session-state` broadcast fires;
      (c) selecting a public/`"default"` catalogue song still succeeds
      (regression guard for today's path). Confirm (a) and (b) fail before
      implementing — `infrastructure.md` (Song Catalog Delivery) documents
      this rejection as the intended behavior, so this is context only, no
      artifact edit. Addresses feedback F001 / `[defect: 31c5630a]`.
- [ ] T002 Implement the guard in `server/src/handlers/song-select.ts`:
      after the existing `if (!song)` not-found check, resolve the song's
      catalogue via `ctx.catalog.catalogues.find((c) => c.id ===
      song.catalogueId)` and, when that catalogue is private
      (`!catalogue.public`) and its id is not in
      `session.unlockedCatalogueIds`, send the **same** `Song
      ${message.songId} not found` error the invalid-id path uses and
      `return` before mutating any session state (keeping "locked" and
      "nonexistent" indistinguishable, per the plan's no-information posture
      and `infrastructure.md`'s "mirroring an invalid `CatalogSong.id`").
      `session` is already resolved in the handler. Make T001's tests pass,
      then run the full server vitest suite (`pnpm --filter
      @sync-tab-scroll/server exec vitest run`) to confirm no regression to
      the existing song-select cases. Addresses feedback F001 / `[defect:
      31c5630a]`.

Demonstrable: a scripted/stale client selecting a locked private
catalogue's song is rejected exactly like an unknown id, while an unlocked
or public song still selects normally.
