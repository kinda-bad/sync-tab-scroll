# Defects

_Last verified: 2026-07-19_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

No drift or broken-contract defects found — artifacts match the codebase
as of this run. Full pass over all six artifacts (datamodel,
infrastructure, ui, pipeline, constitution, brand) against server,
client, shared, pipeline, infra/Terraform, Dockerfile, and CI. All
Phase-2 capabilities documented as live are genuinely built (including
the co-owner invite flow); the 2026-07-18/19 lyric-dispatch and
beat-widget sections match their implementations verbatim; constitution
principles I/II/VI/VIII spot-checks are clean.

Three cosmetic-only notes (recorded for completeness; none warrants a fix
task on its own — fold into a nearby edit if one ever touches these
spots):

## infrastructure.md
- **Claim:** Catalogue Activation Key Unlock — server "computes
  `crypto.scrypt(key, storedSalt, 64)`".
  **Actual:** `crypto.scryptSync(key, salt, storedHash.length)` —
  synchronous, keylength derived from the stored hash (which is 64
  bytes), then `timingSafeEqual`. Behaviorally identical.
  **Location:** `server/src/handlers/catalogue-unlock.ts:16-18`
  **Severity:** cosmetic
- **Claim:** (omission) the env-var discussion doesn't list
  `SONG_UPLOAD_ENABLED`, a real config/env var backing the Phase-2
  song-upload feature flag (mentioned only indirectly as a "runtime
  feature flag").
  **Actual:** wired in `server/src/config.ts` and `.env.example`.
  **Location:** `server/src/config.ts`
  **Severity:** cosmetic

## ui.md (code-comment staleness, artifact itself correct)
- **Claim:** ui.md correctly documents the song/part modal as
  dismissible.
  **Actual:** a stale code comment still calls the backdrop
  "non-dismissible"; runtime behavior is dismissible and matches the
  artifact.
  **Location:** `client/src/views/Lobby.svelte:14-18` (comment only;
  behavior at `App.svelte:232` `dismissible={true}` is correct)
  **Severity:** cosmetic
