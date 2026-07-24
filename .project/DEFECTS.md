# Defects

_Last verified: 2026-07-23_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

No defects found — artifacts match the codebase as of this run.

All 3 previously-recorded defects are now confirmed closed by direct
inspection (not carried forward from task-completion claims):
- infrastructure.md's `scriptFile` citation now correctly reads
  `client/src/tab-renderer.ts:84` (`createTabRenderer`), matching the
  code.
- infrastructure.md's `bars-per-row-set`/`early-stop-set` field names now
  correctly read `barsPerRow`/`tickPosition`, matching
  `packages/shared/src/messages.ts:18-19`.
- infrastructure.md's Input Validation reject-behavior claim is now true:
  `server/src/input-validation.ts`'s `validateField`/`validateDisplayName`/
  `validateActivationKey` return a `ValidationResult` discriminated union
  and reject (never sanitize/mutate) invalid input; `session-create.ts`,
  `session-join.ts`, and `catalogue-unlock.ts` all send `{ type: 'error',
  message: ... }` on rejection instead of proceeding with a mutated value.

This pass covered all six artifacts (datamodel, infrastructure, ui,
pipeline, constitution, brand), with priority depth on this session's
third merged bundle (`tasks-input-validation-e2e-hardening-e2da.md`, 17
tasks): the reject-behavior fix and its three call sites (above); the new
`client/src/input-validation.ts` and `TextInput.svelte`'s `error`/`onblur`
props (non-authoritative client-side checks, correctly layered on top of
server enforcement, no artifact claim contradicted); `session-store.ts`'s
`isValidJoinCodeFormat` (join-code format now enforced at both layers —
an internal hardening detail, not a user-facing capability shift, so no
artifact documentation gap); and the generalized `validateField` helper's
application to Phase 2 authoring's `catalogue-authoring-routes.ts` and
`song-upload-route.ts` fields (`slug`/`name`/`key`/`artist`/`title`/
`submitterName`) — closing the previously-unvalidated
`buildStagedFilename()` path-construction input with no artifact
contradicted (ui.md/infrastructure.md don't claim these fields were
validated before, so this is new hardening, not a fix to a documented
claim).

No documented-but-never-built capabilities were found during this pass —
everything checked traces to real, working code.
