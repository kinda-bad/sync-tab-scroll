# Defects

_Last verified: 2026-07-06_

Full unscoped pass across all artifacts (constitution, datamodel,
infrastructure, ui, pipeline, brand), refreshing the prior 2026-07-06 pass
after the `defects-followup` branch merged into `main`. `features.md` is
not an artifact this skill checks code against.

4 of the prior pass's 5 defects are now fixed in code (verified directly,
not assumed): `infrastructure.md`'s percussion-detection wording and
missing render-scale mention, the `host-remove-participant` client UI/docs
gap, and `pipeline.md`'s lrclib wording. They no longer appear below.

## datamodel.md

- **Claim:** `CatalogPart.trackIndex`'s note describes percussion status as
  read from the track's own parsed data via
  `track.percussionArticulations`/instrument metadata.
  **Actual:** the actual code path is the plain `track.isPercussion`
  boolean (`client/src/tab-renderer.ts:106,139`), not articulations/
  instrument metadata. `infrastructure.md`'s copy of this same claim was
  fixed by the `defects-followup` branch; this artifact's independent copy
  was not in that branch's scope and still carries the stale wording.
  **Location:** `client/src/tab-renderer.ts:106,139`
  **Severity:** cosmetic

## constitution.md

- **Claim:** Principle VIII requires the `.env`/`.env.example` key-parity
  lint to run "both pre-commit and in CI."
  **Actual:** The pre-commit half is implemented and confirmed working
  (`scripts/check-env-parity.mjs`, wired into `.githooks/pre-commit`). No
  CI provider or workflow exists anywhere in the repo — `.github/
  workflows/` is absent (confirmed this pass). A git remote (`origin` →
  `git@github.com:kinda-bad/sync-tab-scroll.git`) exists, so the CI half
  is unmet for its own sake now (no provider chosen/configured), not
  because there's nowhere to run it.
  **Location:** repo root (`.github/workflows/` absent)
  **Severity:** drift (pre-existing, explicitly deferred — see STATUS.md's
  recommended next steps)

No defects found in `ui.md`, `infrastructure.md`, `pipeline.md`, or
`brand.md` this pass. `brand.md`/`ui.md`'s draft `grunge-cyberpunk-themes`
design changes (on the unmerged `grunge-cyberpunk-themes` branch) were not
checked against code, since none of that work is implemented yet —
checking a not-yet-built theme against code would be checking against
nothing.
