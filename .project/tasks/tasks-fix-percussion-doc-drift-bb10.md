---
plan: plan-fix-percussion-doc-drift-2026-07-08.md
generated: 2026-07-08
status: completed
---

# Tasks

## Phase 1: Fix the artifact

- [x] T001 [artifacts: datamodel] Documentation-only change — no test
      required (constitution Principle VII's documentation-only carve-out).
      In `.project/artifacts/datamodel.md`'s `CatalogPart` entity table,
      the `trackIndex` row's Notes cell currently reads: "Percussion
      status (`staveProfile` selection, infrastructure.md) is read from
      the track's own parsed data (alphaTab exposes this natively —
      `track.percussionArticulations`/instrument metadata) rather than
      stored here, per constitution Principle V". Replace
      `` `track.percussionArticulations`/instrument metadata `` with
      `` `track.isPercussion` `` so the sentence reads: "...(alphaTab
      exposes this natively — `track.isPercussion`) rather than stored
      here...". This matches the real code
      (`client/src/tab-renderer.ts:111,144`, `const isPercussion =
      track.isPercussion`) and `infrastructure.md`'s already-correct copy
      of the same claim (its Tab Rendering section comment: "isPercussion
      is read directly from the parsed track's own data
      (`track.isPercussion`, `client/src/tab-renderer.ts`)"). `[defect:
      56f2bb95]`

- [x] T002 [artifacts: datamodel] Stamp `datamodel.md`'s frontmatter after
      T001's edit: run `.claude/skills/ardd-scripts/ardd-state.sh stamp
      .project/artifacts/datamodel.md last_updated <today's date>`. Do
      not change `diagram_status` — the percussion-detection mechanism is
      implementation detail the rendered ERD already omits (per
      `/ardd-render`'s own scoping rule: "Omit index and normalization
      detail — the diagram represents structure, not implementation"), so
      this edit doesn't make the diagram stale.

- [x] T003 Update `.project/DEFECTS.md` to drop the now-fixed
      `CatalogPart.trackIndex` percussion-detection entry under its
      `## datamodel.md` heading (the only entry there), following the
      same in-place "confirmed resolved" pattern already used earlier in
      the same file for the CI-workflow defect (a short note under the
      file's intro stating this entry is resolved, rather than deleting
      the historical record outright) — this is a same-session
      acknowledgment of the fix, not a full `/ardd-verify` pass; a later
      `/ardd-verify` run remains the authoritative check that no defects
      remain.

- [x] T004 Verify: `git diff` against `main` shows exactly the
      one-line wording change in `datamodel.md`, the frontmatter
      `last_updated` stamp, and the `DEFECTS.md` update — no code files
      touched. Confirm `datamodel.md`'s `CatalogPart.trackIndex` note now
      reads identically in substance to `infrastructure.md`'s corrected
      copy.
