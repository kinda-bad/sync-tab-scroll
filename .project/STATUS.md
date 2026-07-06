# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-plan readme-local-setup-and-gp-ingestion`, on
its own branch). Repo is on `main`, pushed to `origin/main`
(`lyrics-gap-timing-indicator` merged and pushed this session). No
cross-artifact contradictions found._

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

These are documented defaults, not blockers.

## Cross-Artifact Issues

- [MINOR] The feature register's "Metronome toggle"/"Count-in toggle"
  entries still carry their original logging-time descriptions,
  superseded by the implemented design. Owned by
  `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`, not this skill.
- [GAP] `ui.md`'s "Connection lost" state and `datamodel.md`'s
  `Participant.connectionStatus` field share a name but describe different
  concepts. Not contradictory, just worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). Not a
  contradiction, just drift for a future `/ardd-verify` to record.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [OPEN] `lyricLineBreaks` retention (see above)

## Constitution Compliance

No new violations found this pass. Principle VIII's CI half remains a
known, explicitly-deferred gap — see Code-vs-Artifact Defects below.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-render ui` — the theme-control Preferences
  tab, the full-lyrics-sheet redesign, and the gap-timing-indicator design
  have all landed since this was last rendered)

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06, **before**
the theme rework, lyrics-sheet redesign, and gap-timing-indicator all
merged — worth a fresh `/ardd-verify` pass given how much client code has
changed since. Both already declined for inclusion in prior plans — won't
re-prompt:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim that `infrastructure.md`'s copy
  already fixed.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists.

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 9 implemented — see
`.project/features/`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — backlogged.
- `readme-local-setup-and-gp-ingestion` — a plan now exists
  (`plan-readme-local-setup-and-gp-ingestion-2026-07-06.md`, draft, on
  its own unmerged branch); the register on `main` still says
  `backlogged` since `/ardd-tasks` is what flips it to `planned`.

## In Flight

- Branch `readme-local-setup-and-gp-ingestion` (plain branch, not a
  worktree) — `plan-readme-local-setup-and-gp-ingestion-2026-07-06.md`
  drafted (not yet approved/tasked), committed there, not yet on `main`.
  Documentation-only plan: no artifact changes, adds a "Getting Started"
  section (dev setup, the Chrome port-6000 gotcha discovered this
  session), "Adding a song" (`.gp` ingestion CLI), and "Running tests" to
  `README.md` — every command verified by actually running it, not
  transcribed from memory.

## Recommended Next Step

1. Run `/ardd-tasks` on
   `plan-readme-local-setup-and-gp-ingestion-2026-07-06.md` to approve it
   and generate its task list, then implement.
2. Consider a fresh `/ardd-verify` pass — a large amount of client code
   changed across the theme-rework, lyrics-sheet-redesign, and
   gap-timing-indicator merges, and the last verify pass predates all
   three.
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the other minor cross-artifact notes above, and running `/ardd-render
   ui` to refresh the stale UI diagram.
