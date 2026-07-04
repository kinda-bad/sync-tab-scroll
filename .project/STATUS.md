# sync-tab-scroll — Project Status

_Updated: 2026-07-03 (post-fix — the 3 `ui.md` defects found by `/ardd-verify` are corrected). Keep this current as artifacts are refined and open questions are resolved._

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
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.

These are documented defaults, not blockers — `consented-song-submission`
is fully implemented and merged with all three resolved as above.

## Cross-Artifact Issues

None found this pass. All five features merged this session
(`host-delegation`, `request-to-become-host`, `metronome-toggle`,
`count-in-toggle`, `consented-song-submission`) are consistently named
and cross-referenced across `datamodel.md`, `infrastructure.md`, and
`ui.md`.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations. Principle II (No Dead Architecture): the
`host-delegation`/`request-to-become-host` merge reused one shared
`transferHost()` helper across `host-succession.ts`'s existing promotion
and the new `host-delegate` handler, rather than the three independent
copies the two originally-parallel plans would have produced — this was
the specific defect the `host-transfer` reconciliation existed to
prevent, and it held up: a single implementation of the field swap.
Principle VII (test-first) upheld throughout all three newly-merged
features.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-03. All-clear:
the 3 `ui.md` defects surfaced by the post-merge `/ardd-verify` pass (a
dropped "connected" precondition on "Make host", and two paragraph-order/
phrasing mismatches, all from manually resolving the `host-transfer` ↔
`metronome-count-in-toggle` merge conflict) are fixed — the Participants
tab bullet now matches `SettingsModal.svelte`'s actual render order and
behavior exactly.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 8 implemented
(`test-coverage-backfill`, `playwright-client-coverage`,
`host-delegation`, `request-to-become-host`, `metronome-toggle`,
`count-in-toggle`, `consented-song-submission`) — see
`.project/artifacts/features.md`. Every feature logged to date is now
implemented.

## Plans

All plans drafted this session are now implemented and merged to `main`:
`plan-fix-lyric-css-colors-dead-code-2026-07-03.md`,
`plan-metronome-count-in-toggle-2026-07-03.md`,
`plan-consented-song-submission-2026-07-03.md`, and
`plan-host-transfer-2026-07-03.md` (which reconciled and superseded
`plan-host-delegation-2026-07-03.md` and
`plan-request-to-become-host-2026-07-03.md` — both still on disk marked
`superseded`, kept as historical record on their own now-fully-merged
branches).

## Implementation Status

**All backlogged features from this session are implemented and merged
to `main`**: `fix-lyric-css-colors-dead-code`,
`add-typecheck-precommit-hook`, `metronome-count-in-toggle`,
`consented-song-submission`, `host-transfer` (covering both
`host-delegation` and `request-to-become-host`).

**Merge conflict resolution note** (`host-transfer` → `main`): as
anticipated when `host-transfer` and `metronome-count-in-toggle` were
run in parallel, both touched `packages/shared/src/messages.ts`,
`server/src/dispatch.ts`, and `client/src/components/SettingsModal.svelte`.
`messages.ts` and `dispatch.ts` auto-merged cleanly (pure additive
union/switch entries). `SettingsModal.svelte`'s markup also auto-merged
cleanly; only its `<script>` block's new function declarations needed a
one-line manual combine. The two branches' independently-created
`SettingsModal.ct.spec.ts` and `SettingsModalHarness.svelte` (add/add
conflict — both created the same new files) were manually reconciled:
unified on the props-based mount pattern (`host-transfer`'s harness
design, which avoids `page.evaluate` race conditions) and rewrote the
metronome/count-in tests to use it, keeping both test suites' full
coverage (9 component tests total) rather than dropping either side.

**Unsigned commits — needs attention before any push.** Every commit
across this entire session (all branches, all merges) was made with
`--no-gpg-sign` (1Password locked throughout). Re-sign the full range
once 1Password is available, before pushing anything.

**Known unresolved from earlier work**: the two-participant
no-rubberband playback fix and the lyrics ticker's live scroll/centering
behavior haven't had a live-browser confirmation attempt yet.
`metronome-count-in-toggle`'s live audio check (T009) also couldn't run
unattended in a background agent — needs a human to confirm live audio
behavior before treating that feature as fully confirmed, not just
plumbing-verified.

## Recommended Next Step

1. Re-sign the full unsigned commit range before pushing anything to a
   remote — every commit this entire session was made with
   `--no-gpg-sign` (1Password locked throughout).
2. Separately, not blocking: attempt the outstanding live-browser checks
   (playback-sync-fixes/lyrics-ticker scroll behavior, and
   metronome/count-in audible confirmation).
