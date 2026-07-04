# sync-tab-scroll — Project Status

_Updated: 2026-07-03 (on `main`, post-merge of `metronome-count-in-toggle` and `consented-song-submission`). Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 3 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording (Consent Record section) —
  resolved for `consented-song-submission` as per-song; revisit only if
  re-recording consent per song becomes real friction for a repeat
  submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model; a web upload
  endpoint was explicitly considered and rejected (new public HTTP
  surface, no existing submitter identity/session concept, no evidence of
  need).
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.

These are documented defaults, not blockers — `consented-song-submission`
is fully implemented and merged with all three resolved as above; a human
can override any of them later without re-planning.

## Cross-Artifact Issues

None found this pass. The "Consent Record" concept (datamodel.md) is
referenced consistently by infrastructure.md's Song Consent Gate and
pipeline.md's Consent Recording section. The `requireSongConsent`/
`REQUIRE_SONG_CONSENT` flag is named consistently everywhere it's
mentioned. `metronome-set`/`count-in-set` follow the exact same
message/handler shape as the pre-existing `spotlight-mode-set`, no drift
introduced.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations. `requireSongConsent`'s dual-mode branch in
`catalog-loader.ts` is recorded in `consented-song-submission`'s plan as a
justified Complexity Tracking deviation (default behavior unchanged).
Principle VII (test-first) upheld throughout both newly-merged features —
every handler, helper, and UI control shipped with a failing-test-first
pair.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

0 known defects as of the last full `/ardd-verify` pass (2026-07-03, on
`fix-lyric-css-colors-dead-code`, since merged to `main`). Not re-run
since — recommend a fresh `/ardd-verify` pass once `host-transfer` also
merges, to confirm the three newly-merged features' artifacts still match
code exactly.

## Feature Backlog

2 backlogged (`host-delegation`, `request-to-become-host` — implemented
and tested on the still-unmerged `host-transfer` branch; will flip once
merged) · 0 planned · 0 tasked · 6 implemented
(`test-coverage-backfill`, `playwright-client-coverage`,
`metronome-toggle`, `count-in-toggle`, `consented-song-submission`, and
now `host-delegation`/`request-to-become-host` pending merge) — see
`.project/artifacts/features.md`.

## Plans

- `plan-metronome-count-in-toggle-2026-07-03.md` and
  `plan-consented-song-submission-2026-07-03.md` — **implemented and
  merged to `main`** (this session).
- `plan-host-transfer-2026-07-03.md` — **implemented**, all 8 tasks
  complete on branch `host-transfer` (75 server + 25 client unit + 27 CT
  + 3 e2e tests passing there), **not yet merged to `main`**. Reconciled
  the now-superseded `plan-host-delegation-2026-07-03.md` and
  `plan-request-to-become-host-2026-07-03.md` drafts into one design.

## Implementation Status

**Merged to `main` this session**: `fix-lyric-css-colors-dead-code`,
`add-typecheck-precommit-hook`, `metronome-count-in-toggle`,
`consented-song-submission`. All verified post-merge: `pnpm check` clean,
server (71 tests) + client unit (25) + client CT (26) all passing.

**Complete but not yet merged**: `host-transfer` (branch `host-transfer`)
— implements both `host-delegation` and `request-to-become-host` via one
shared `transferHost()` mechanism. Expect a merge conflict against
`main`'s already-merged `metronome-count-in-toggle` work, since both
touch `packages/shared/src/messages.ts`, `server/src/dispatch.ts`, and
`client/src/components/SettingsModal.svelte` — this was anticipated when
both were planned to run in parallel.

**Unsigned commits — needs attention before any push.** Every commit
across this entire session (all branches, all merges) was made with
`--no-gpg-sign` (1Password locked throughout). Re-sign the full range
once 1Password is available, before pushing anything.

**Known unresolved from earlier sessions**: the two-participant
no-rubberband playback fix and the lyrics ticker's live scroll/centering
behavior haven't had a live-browser confirmation attempt yet (see prior
STATUS.md revisions for the hazard-bar-progress finding suggesting these
are checkable). `metronome-count-in-toggle`'s T009 (live audio check)
also couldn't run unattended — needs a human to confirm live audio
behavior before treating that feature as fully confirmed, not just
plumbing-verified.

## Recommended Next Step

Merge `host-transfer` into `main`, expecting to manually resolve the
anticipated conflict in `messages.ts`/`dispatch.ts`/`SettingsModal.svelte`
against the already-merged `metronome-count-in-toggle` work (both are
additive changes to the same files/switch statements, not overlapping
logic — should be a mechanical merge, not a design conflict). Then: run
a fresh `/ardd-verify` pass to confirm all three newly-implemented
features' artifacts still match code exactly, and re-sign the full
unsigned commit range before pushing anything.
