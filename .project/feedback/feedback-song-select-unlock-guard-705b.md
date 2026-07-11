---
status: planned      # open -> planned
created: 2026-07-10
plan: plan-song-select-unlock-guard-2026-07-10.md
---

# Feedback

## Bugs
- [x] F001 `song-select` accepts a song from a catalogue the session hasn't
      unlocked. `server/src/handlers/song-select.ts` looks the id up in the
      full server-global `ctx.catalog.songs` list with no
      `unlockedCatalogueIds`/`catalogueId` guard, so a stale/tampered client
      can select a locked private catalogue's song and it broadcasts as the
      session's `selectedSong`. `infrastructure.md`'s Song Catalog Delivery
      section already documents the intended behavior ("Selecting a song
      from a catalogue the session hasn't unlocked is rejected as an error"),
      so this is a code-change to honor the existing contract — the artifact
      needs no revision. Add a server-side check: reject with an `error`
      (mirroring the invalid-`CatalogSong.id` path) when the looked-up
      song's catalogue is private and not in `session.unlockedCatalogueIds`.
      Recorded in `DEFECTS.md` (2026-07-10 verify pass) as a broken-contract
      defect. [artifacts: infrastructure]
