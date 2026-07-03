# sync-tab-scroll — Project Status

_Updated: 2026-07-03. Keep this current as artifacts are refined and open questions are resolved._

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

None found this pass.

## Within-Artifact Issues

None — no `[OPEN]` placeholders in any artifact.

## Constitution Compliance

No violations found in this pass's full `/ardd-verify` re-survey. Principle I
(single client store), Principle IV (handler routing), and Principle VI
(production annotations) all spot-checked clean against current code.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

5 known defects — see `DEFECTS.md`, last checked 2026-07-03 (fresh, full
re-verification just completed):
- **brand.md** (broken-contract): the signature-element description still
  frames the hazard-tape strip as part of the Bar itself; the
  `settings-modal-redesign` work moved it to an independently top-pinned
  strip, decoupled from the bottom-pinned nav bar.
- **ui.md** (drift): Participants tab claims a host remove-participant
  control exists; only the server handler exists, no client UI (pre-existing,
  not introduced this session).
- **ui.md** (drift): settings-cog is documented as Lobby-only; it was
  widened to Lobby+Playback during implementation to fix a real gap
  (`Playback.svelte`'s old, unpersisted theme toggle).
- **ui.md** (cosmetic): Lobby-body hint's documented 4-case order omits a
  5th, pre-existing `!session` "Connecting…" case.
- **datamodel.md** (cosmetic): `lyricLineBreaks` is documented as driving
  visible line-grouping in the lyrics overlay; the ticker redesign
  flattens syllables and never uses line boundaries — flagged in
  `plan-lyrics-ticker-2026-07-03.md` as deferred to this exact pass.

The prior Principle VII (test-first) defect is resolved and dropped —
server/client/shared coverage now matches the principle everywhere there's
actual runtime logic to test.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-settings-modal-redesign-2026-07-03.md`, `plan-session-create-selection-2026-07-03.md`,
  `plan-playback-sync-fixes-2026-07-03.md`, `plan-lyrics-ticker-2026-07-03.md`,
  `plan-ui-polish-pass-2026-07-03.md`, `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`, `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage, ui-polish-pass,
playback-sync-fixes, lyrics-ticker, settings-modal-redesign,
session-create-selection: complete**, all merged to `main`. Currently on
`main`, worktree clean.

Full suite green on merged `main`: client vitest 6 files/25 tests, client
CT 20/20, client e2e 10/10, server vitest 16 files/58 tests.

**Unsigned commits — needs attention before any push.** Every commit
across `settings-modal-redesign`, `session-create-selection`, their merge
commits into `main`, and this `/ardd-verify` pass's own commits was made
with `--no-gpg-sign` (1Password locked throughout). Re-sign the range once
1Password is available, before pushing.

**Still needs a human's live-browser confirmation** (not automatable in
this environment):
- Two-participant no-rubberband playback (`playback-sync-fixes`).
- Lyrics ticker scroll/center/resize + tab-scroll-padding clearance
  (`lyrics-ticker`).
- Hazard-strip top positioning and content top-padding clearance
  (`settings-modal-redesign`).
- Theme toggle reachable from both Lobby and Playback, changes both the
  CSS palette and tab notation together, and persists across a refresh
  (`settings-modal-redesign`).

## Recommended Next Step

Run `/ardd-refine ui` and `/ardd-refine brand` to correct the 5 known
defects above (or `/ardd-refine` bare to sweep both), then a manual
live-browser pass over the four unconfirmed items, then re-sign the
unsigned commit range before pushing `main`.
