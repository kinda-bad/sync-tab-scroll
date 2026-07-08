# sync-tab-scroll — Project Status

_Updated: 2026-07-08 (`/ardd-analyze`, after `/ardd-render` and
`/ardd-update`). ARDD tooling updated `3c72550` → `9189817` (no pending
migrations, no new install-time suggestions); `datamodel`/`infrastructure`/
`ui` diagrams regenerated and re-stamped current. No cross-artifact
contradictions found._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording — resolved for
  `consented-song-submission` as per-song; revisit only if re-recording
  consent per song becomes real friction for a repeat submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.
- Whether `CatalogSong.lyricLineBreaks` is worth keeping — computed and
  unit-tested, but the current single-line ticker overlay never uses the
  grouped line boundaries for layout.

These are documented defaults, not blockers. All three carry `[OPEN:
...]` markers in the artifact text despite already stating a resolved
answer inline — cosmetic labeling drift, not an unresolved decision (see
Within-Artifact Issues).

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state (client's own WS reachability)
  and `datamodel.md`'s `Participant.connectionStatus` field (server's
  per-participant socket state) share a name but describe different
  concepts. Not contradictory, just worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). Not a
  contradiction, just drift for a future `/ardd-verify` to record.
- [MINOR] The feature register's pre-convention "Metronome toggle"/
  "Count-in toggle" entries still carry their original logging-time
  descriptions, superseded by the implemented design.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [VAGUE] `lyricLineBreaks` retention — still unresolved whether it's
  worth keeping given nothing reads the grouped result for layout
- [VAGUE] All three `[OPEN: ...]` inline markers in the Consent Record
  section already state a resolved decision in the same sentence (e.g.
  "chosen for this plan as the simpler shape") — the `[OPEN:` tag reads
  as still-undecided even though the surrounding prose isn't. Consider
  switching these to the `**Resolved**:`-with-caveat phrasing the rest of
  the artifact set uses elsewhere, or leave as intentionally-revisitable
  markers — either way, non-blocking.

## Constitution Compliance

No violations found this pass. Principle VIII is **fully satisfied** —
the `.env`/`.env.example` key-parity lint runs pre-commit, and typecheck
+ the full test suite (minus e2e, deliberately deferred) run in CI on
every push/PR to `main` (`.github/workflows/ci.yml`).

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅ (re-rendered; Server node and the
  WebSocket edge label now mention host removal. CI deliberately left off
  the container diagram — a build-time workflow, not a runtime component)
- ui.md — current ✅ (re-rendered; no structural change — the "Every row
  shows which part..." addition is row content, not a new component)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-07. Unchanged
this pass:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed (`track.isPercussion`).

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 12 implemented — see
`.project/features/`. Backlog is empty.

## In Flight

Nothing in flight — no other worktrees, no draft PRs, working tree clean
except an untracked `.project/.lock` (worth a manual look; not something
this pass writes or removes).

## Recommended Next Step

1. Commit `.project/STATUS.md`, `.project/ardd-version.md`,
   `.project/artifacts/infrastructure.md`, `.project/artifacts/ui.md`, and
   `README.md` — all currently uncommitted from this session's
   `/ardd-render` + `/ardd-update` + `/ardd-analyze` pass.
2. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
3. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in the Consent Record section.
