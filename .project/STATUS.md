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
- **[GAP]** Song catalog listing/selection and the Lobby → Playback view
  transition are still not wired in code — `Lobby.svelte` shows a
  placeholder, `Playback.svelte` hardcodes a test fixture, and
  `packages/shared/src/messages.ts` has no song-selection message. This
  pass resolved the *design* gap (datamodel/infrastructure/ui now fully
  specify `CatalogSong.id`, catalog delivery on session create/join, a
  host-only song-selection message, and the server's first HTTP
  static-file surface for serving `.gp`/`.lrc` assets) — the
  *implementation* gap remains and is the next `/ardd-plan` target.

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

**song-catalog-selection: design complete, implementation not started.**
Artifacts updated via `/ardd-feature` on branch `song-catalog-selection`;
no plan/tasks generated yet.

Known limitations, documented in code and task notes, not silently
glossed over:
- Full live-audio verification blocked by Chrome's autoplay policy in
  browser-automation testing (real user clicks will work fine).

## Recommended Next Step

Run `/ardd-plan` for the song-catalog-selection feature — artifacts are
stable and the design is now fully specified (datamodel: `CatalogSong.id`
+ URL-rewritten asset paths; infrastructure: catalog-delivery message +
HTTP static serving; ui: lobby picker + reset-on-reselect behavior).
