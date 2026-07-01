# sync-tab-scroll — Project Status

_Updated: 2026-07-01. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

## Open Questions

None formally tracked in the artifacts.

## Cross-Artifact Issues

None. `CatalogSong.id`, the URL-rewritten `gpFilePath`/`lyricsLrc` fields,
and the new catalog-delivery/song-selection design (added this pass via
`/ardd-feature`) are referenced consistently across `datamodel.md`,
`infrastructure.md`, and `ui.md`.

## Implementation vs. Artifact Findings

- **[RESOLVED]** `datamodel.md`'s `Session.lobbyCursorTick` "null once
  playback starts" invariant is enforced in
  `server/src/handlers/playback-control.ts` and verified live.
- **[IMPLEMENTED, UNVERIFIED]** Song catalog listing/selection and the
  Lobby → Playback view transition are now wired end-to-end (server
  catalog delivery/song-select handlers, a real catalog fixture at
  `catalog/radiohead-creep/` built with the real `extract-lyrics`
  pipeline CLI, and client-side Landing/Lobby/Playback wired through one
  shared session with a persistent renderer created at part-selection
  time). `vite build` passes with no errors. **Not yet verified in a real
  browser** — the claude-in-chrome extension was unavailable this
  session; the user is verifying manually against the server/client
  already running locally (`:8080`/`:5173`). Do not treat this as done
  until that manual pass confirms it.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. The new HTTP static-file surface is a small addition, not
a new architectural layer — no Complexity Tracking entry warranted.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Implementation Status

**live-rendering-pivot: complete.** `tasks-live-rendering-pivot-d9c2.md` —
27/27 tasks done, merged to `main`. All verified against real
fixtures/browser sessions, not assumed.

**song-catalog-selection: implemented, pending manual browser
verification.** `tasks-song-catalog-selection-275d.md` — 8/14 tasks
checked (server phases 1-3, fully WS-verified); T009-T014 (client phases
4-6) are code-complete and build clean but unchecked pending the user's
manual browser pass.

Known limitations, documented in code and task notes, not silently
glossed over:
- Full live-audio verification blocked by Chrome's autoplay policy in
  browser-automation testing (real user clicks will work fine).

## Recommended Next Step

Manually verify the song-catalog-selection flow in a browser at
`localhost:5173` (server already running on `:8080`, `CATALOG_ROOT`
pointed at `catalog/`): Landing → create/join → Lobby (pick
`radiohead-creep`, pick a part) → readiness reaching `ready` pre-start →
Start → Playback rendering the real tab/lyrics. Report anything broken;
once confirmed, check off T009-T014 and flip the tasks file to
`completed`.
