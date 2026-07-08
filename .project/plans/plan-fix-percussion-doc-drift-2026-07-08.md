---
status: approved
branch: fix-percussion-doc-drift
created: 2026-07-08
features: []
surfaced-defects: []
---

# Fix Percussion Doc Drift

## Goal

Correct `datamodel.md`'s stale claim about how percussion status is
detected, so it matches the actual code path (already fixed in
`infrastructure.md`'s copy of the same claim).

## Scope

**In scope**: the single wrong sentence in `datamodel.md`'s
`CatalogPart.trackIndex` row (DEFECTS.md defect `56f2bb95`, already
surfaced by `plan-github-actions-ci-workflow-2026-07-07.md`, now being
fixed on its own dedicated branch at the user's direction).

**Out of scope**: everything else in `DEFECTS.md` (there is nothing
else currently listed), any of the 18 `planned`-status feedback files
(none targeted this run), and any feature work (backlog is empty).

## Technical Approach

Documentation-only change. `datamodel.md`'s `CatalogPart.trackIndex`
Notes cell currently reads:

> Percussion status (`staveProfile` selection, infrastructure.md) is
> read from the track's own parsed data (alphaTab exposes this natively
> — `track.percussionArticulations`/instrument metadata) rather than
> stored here, per constitution Principle V

Replace `track.percussionArticulations`/instrument metadata` with
`track.isPercussion`, matching both the actual code
(`client/src/tab-renderer.ts:111,144`) and `infrastructure.md`'s
already-correct copy of the same claim (that artifact's Tab Rendering
section comment: "`isPercussion` is read directly from the parsed
track's own data (`track.isPercussion`, `client/src/tab-renderer.ts`)").
No code changes — the code was already right; only the artifact text was
wrong.

## Phase Breakdown

### Phase 1 — Fix the artifact (single phase, no dependencies)

1. Edit `datamodel.md`'s `CatalogPart.trackIndex` Notes cell: replace
   `track.percussionArticulations`/instrument metadata` with
   `track.isPercussion``, so the sentence reads the same way
   `infrastructure.md`'s already-fixed copy does. `[defect: 56f2bb95]`
2. Stamp `datamodel.md`'s frontmatter: `last_updated` to the
   implementation date via `ardd-state.sh stamp`. No `diagram_status`
   change — this row isn't part of the rendered ERD (the diagram already
   omits implementation-level detail like the percussion-detection
   mechanism, per `/ardd-render`'s own scoping rule).
3. Update `DEFECTS.md` to drop this entry (or mark it resolved,
   matching how the CI-claim defect was previously handled in that
   file) — `/ardd-verify` owns this file, so this step is a manual
   same-session edit acknowledging the fix, not a new `/ardd-verify`
   pass; a full `/ardd-verify` re-run remains the authoritative way to
   confirm no defects remain.

This phase is independently demonstrable: `git diff` shows exactly the
one-line wording fix plus the frontmatter stamp, and a fresh read of
`datamodel.md`'s `CatalogPart.trackIndex` row now matches
`infrastructure.md`'s.

## Complexity Tracking

Not applicable — no new mechanism, pattern, or deviation introduced.

## Open Questions

None. This is a fully-specified, single-sentence text correction.

## Production Annotation Summary

None — no production shortcuts introduced or touched by this change.
