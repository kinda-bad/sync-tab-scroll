# sync-tab-scroll — Project Status

_Updated: 2026-07-04 (`/ardd-refine datamodel`: fixed the one cross-artifact drift the prior `/ardd-analyze` pass found — `Participant.selectedPart`'s note now correctly attributes only the shared *clock* to the lyrics part's headless alphaTab instance, with the metronome described as this participant's own personal preference applied locally, not a session-level setting. `datamodel.md` stays `status: draft` (its 3 pre-existing open questions — consent-record shape, ToS text, CLI-vs-web submission — are documented defaults with rationale, unrelated to this fix, left untouched). Two minor, non-blocking notes from that `/ardd-analyze` pass remain outstanding (see Cross-Artifact Issues): `features.md`'s stale "Metronome toggle" entry, and a same-name-different-concept note between `ui.md`'s "Connection lost" state and `datamodel.md`'s `Participant.connectionStatus`. 0 open feedback files. `DEFECTS.md`'s last pass was scoped to the lyrics-only-view fix and Principle VIII only — most of this session's other work has not had a code-vs-artifact `/ardd-verify` pass yet. Keep this current as artifacts are refined and open questions are resolved._

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

These are documented defaults, not blockers.

## Cross-Artifact Issues

- [MINOR] `features.md`'s "Metronome toggle" entry (logged 2026-07-02)
  still describes the original host-controlled `Session.metronomeEnabled`
  design — fully superseded. `features.md` is owned by
  `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`/`/ardd-implement`/
  `/ardd-converge`, not this skill — flagged for a future pass.
- [GAP] `ui.md`'s new "Connection lost" state (client's own WS
  reachability) and `datamodel.md`'s `Participant.connectionStatus` field
  (server's per-participant socket state) share a name but describe
  different concepts. Not contradictory — each artifact is internally
  correct — but worth a one-line disambiguation in either doc if it causes
  confusion later. Not blocking.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations found this pass. Principle I (Single Source of State): the
new client-local metronome preference (localStorage, read once at
startup, applied directly to the engine) follows the same already-
established pattern as `theme.ts`'s persisted preference — genuinely
personal, not shared cross-module state, so not a violation. Principle
III (one connection entry point) upheld by `server-failure-banner`'s
reconnect mechanism, which reuses the existing reconnect-by-participantId
path (`session-join.ts`) rather than adding a second one. No shortcuts
found lacking a production annotation this pass.

Principle VIII (Config via `.env`, Synced by Example) remains implemented
and merged — see `DEFECTS.md` for the one open, explicitly-deferred item
(CI provider decision).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-04. That pass was
scoped to `feedback-lyrics-only-view-d7d8`'s fix (worker/build config,
`infrastructure.md`'s Font & Worker Setup section, `ui.md`'s lyrics-view
section) plus Principle VIII — **not** a full survey. `datamodel.md`,
`pipeline.md`, `brand.md`, and the rest of `ui.md` have not been checked
against the code since 2026-07-03, despite substantial work landing on
`main` since (host-transfer, settings-modal restructure, pre-singing
lyrics placeholder, small-screen responsiveness, leave-session,
metronome-as-preference, lobby-cursor debounce, connection-loss banner).
A full unscoped `/ardd-verify` pass is recommended soon — not assumed
clean by omission. The one known defect: Principle VIII's "run ... in CI"
half is unmet (no CI provider/workflow/remote exists in this repo) — an
explicitly deferred human decision, not a silent gap.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 7 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` (participant
list shows each member's currently selected part) remains backlogged —
target it with `/ardd-plan participant-selected-part` when ready.

## Recommended Next Step

1. Run a full unscoped `/ardd-verify` pass — the current `DEFECTS.md`
   excludes most of this session's merged work.
2. Manually validate the metronome-per-participant implementation in the
   running app (design confirmed by the user; implementation not yet
   exercised live).
3. Re-sign the full unsigned commit range before pushing anything to a
   remote — every commit this session was made with `--no-gpg-sign`
   (1Password locked throughout).
4. Decide the CI-provider question for constitution Principle VIII
   whenever a remote/CI system exists.
5. Not blocking: `/ardd-render` the three artifacts marked stale above;
   the two minor cross-artifact notes above (`features.md`'s stale
   metronome-toggle entry, `connectionStatus` naming overlap).
