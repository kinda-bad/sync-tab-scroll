# Defects

_Last verified: 2026-07-10_

No defects found — artifacts match the codebase as of this run.

Scoped re-verification following the `song-select-unlock-guard` merge: the
only defect from the earlier 2026-07-10 full pass (`31c5630a` —
`infrastructure.md`'s Song Catalog Delivery section claiming a locked-catalogue
song-select is rejected, which the code didn't enforce) is now resolved.
`server/src/handlers/song-select.ts:29-33` rejects a private, not-yet-unlocked
catalogue's song with the same `not found` error as an unknown id, matching
the artifact's contract; covered by `server/src/handlers/song-select.test.ts`'s
"catalogue-unlock guard" cases. No other code changed since the full pass, so
the rest of that pass's clean findings (datamodel, pipeline, infrastructure
deployment, ui, constitution, brand) stand.
