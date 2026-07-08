# Defects

_Last verified: 2026-07-07_

Scoped refresh of the 2026-07-07 full pass — checking `constitution.md`'s
Principle VIII CI claim specifically, since `.github/workflows/ci.yml`
merged since that pass. Nothing else has changed in the codebase since
then, so the rest of that pass's findings stand unchanged.

**Confirmed resolved this pass**: `.github/workflows/ci.yml` exists,
matching `infrastructure.md`'s Continuous Integration section exactly —
triggers on push/PR to `main`; runs `pnpm check`, then `server`/`client`/
`pipeline` test steps via `pnpm --filter @sync-tab-scroll/<pkg> test`,
then a Playwright chromium install followed by `client`'s CT tests; no
`check:env` step and no `e2e` step, both deliberately, matching the
artifact's stated scope exactly. Confirmed working via a real passing
run on `main` (28913418819) — this is no longer a defect.

## datamodel.md

- **Claim:** `CatalogPart.trackIndex`'s note describes percussion status
  as read from the track's own parsed data via
  `track.percussionArticulations`/instrument metadata.
  **Actual:** the actual code path is the plain `track.isPercussion`
  boolean (`client/src/tab-renderer.ts:111,144`), not articulations/
  instrument metadata. `infrastructure.md`'s copy of this same claim was
  fixed in a prior pass; this artifact's independent copy still carries
  the stale wording.
  **Location:** `client/src/tab-renderer.ts:111,144`
  **Severity:** cosmetic

No defects found in `constitution.md`, `ui.md`, `infrastructure.md`,
`pipeline.md`, or `brand.md` this pass.
