# sync-tab-scroll — Project Status

_Updated: 2026-07-02. Keep this current as artifacts are refined and open questions are resolved._

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

No new violations found this pass beyond what's already tracked in
`DEFECTS.md` (Principle VI inline-retyping of `Theme` in `Playback.svelte`).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

6 known defects — see `DEFECTS.md`, last checked 2026-07-02. Run
`/ardd-verify` to refresh.

## Feedback

No open feedback files. `feedback-lobby-cursor-mode-e13b.md` was consumed by
`plan-lobby-cursor-modes-2026-07-03.md` and is now `status: planned`.

## Feature Backlog

4 backlogged · 0 planned · 0 tasked · 0 implemented — see
`.project/artifacts/features.md`. Target a backlogged slug with
`/ardd-plan <slug>`.

## Plans

- `plan-lobby-cursor-modes-2026-07-03.md` — **approved**, not yet tasked.
  Introduces host-only `Session.spotlightMode`, gating the lobby cursor's
  force-follow effect (which doesn't exist in code yet and this plan
  builds). Artifact revisions to `datamodel.md`/`ui.md`/`features.md` are
  deferred to implementation (Phases 1 and 4).
- `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md` — implemented,
  merged to `main` (see Implementation Status below).
- `plan-live-rendering-pivot-2026-07-01.md` — implemented, merged to `main`.

## Implementation Status

**live-rendering-pivot: complete.** `tasks-live-rendering-pivot-d9c2.md` —
27/27 tasks done, merged to `main`.

**song-catalog-selection: complete.** Both `tasks-song-catalog-selection-275d.md`
and `tasks-song-catalog-selection-e8c3.md` fully checked and merged to `main`,
including browser-verified client phases.

**lobby-cursor-modes: not yet tasked.** Plan approved on branch
`lobby-cursor-modes`; no tasks file generated yet.

## Recommended Next Step

Run `/ardd-tasks` against `plan-lobby-cursor-modes-2026-07-03.md` to generate
its task list, then `/ardd-implement` to build it.
