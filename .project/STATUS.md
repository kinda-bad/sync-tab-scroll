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

## Open Questions

None formally tracked in the artifacts. See "Implementation vs. Artifact
Findings" below for two real items surfaced by the completed
implementation that aren't yet captured anywhere durable.

## Cross-Artifact Issues

None.

## Implementation vs. Artifact Findings

(Outside `/ardd-analyze`'s strict artifact-to-artifact scope, but real and
worth tracking now that implementation is complete.)

- **[RESOLVED]** `datamodel.md`'s `Session.lobbyCursorTick` states "null
  once playback starts." `server/src/handlers/playback-control.ts` now
  enforces this: the `'start'` action nulls `lobbyCursorTick` before
  broadcasting. Verified with a live two-message test (set cursor → 9600,
  send `start`, confirm broadcast shows `lobbyCursorTick: null` and
  `status: running`).
- **[GAP]** Song selection, catalog listing, in-lobby part selection, and
  the Lobby → Playback view transition are not wired end-to-end anywhere.
  `ui.md`'s Lobby View reads as if this flow exists. It was repeatedly
  noted as inline code TODOs across the implementation (fixed test
  fixtures used instead of real selection) but never surfaced as a
  project-level open item until this analysis.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations.

## Diagrams

- datamodel.md — up to date ✅
- infrastructure.md — up to date ✅
- ui.md — up to date ✅

## Implementation Status

**Complete.** `tasks-live-rendering-pivot-d9c2.md` — 27/27 tasks done,
`status: completed`. Plan `plan-live-rendering-pivot-2026-07-01.md` fully
implemented on branch `live-rendering-pivot`: monorepo scaffolding, lyrics
pipeline, server protocol, live client-side alphaTab rendering (dark +
light mode), playback sync, in-tab lyrics overlay + full lyrics view,
loading/empty/error states, lobby cursor. All verified against real
fixtures/browser sessions, not assumed.

Known limitations, documented in code and task notes, not silently
glossed over:
- Full live-audio verification blocked by Chrome's autoplay policy in
  browser-automation testing (real user clicks will work fine).
- No song-selection/catalog-listing flow — see Implementation vs.
  Artifact Findings above.

## Recommended Next Step

If continuing feature work, the song-selection/catalog-listing flow is
the natural next slice — recommend a fresh `/ardd-plan` pass for it
rather than an ad hoc addition, since it touches server (new handlers),
client (new UI), and possibly datamodel (a song-listing message shape).
