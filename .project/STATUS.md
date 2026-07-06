# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-feature`, logging `lyrics-gap-timing-indicator`
after merging and pushing both the theme rework and the lyrics-only-view
fix/redesign). Repo is on `main`, pushed to `origin/main` (`2ffeb51` at
last push, this pass adds one more commit on top). No cross-artifact
contradictions found; nothing in flight._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

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

- [MINOR] `features.md`'s "Metronome toggle"/"Count-in toggle" entries
  still carry their original logging-time descriptions, superseded by the
  implemented design. Owned by `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`,
  not this skill — flagged for a future pass.
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
- ui.md — stale ⚠️ (run `/ardd-render ui` — Preferences tab's theme
  control and the Playback View's full-lyrics-sheet redesign both landed
  since this was last rendered)

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06 (confirmed
against current code, before the theme/lyrics merges below — worth a
fresh `/ardd-verify` pass at some point given how much code changed
since):

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim that `infrastructure.md`'s copy
  already fixed.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists.

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 8 implemented — see
`.project/artifacts/features.md`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — backlogged.
- `lyrics-gap-timing-indicator` (beat-synced dots + theme-styled drain
  bar during long `.lrc` gaps in the full-lyrics-sheet view) —
  backlogged, just logged this pass. Needs a `/ardd-plan` pass to work
  out measure/beat-boundary derivation for the headless alphaTab
  instance before design is final.

## In Flight

None. Both previously in-flight branches merged into `main` and pushed
this session:
- `grunge-cyberpunk-themes` — riot rework (true-black/near-white bases,
  saturated red/yellow, torn-paper/hazard-tape/tape-peel exclusive to it)
  and a new `cyberpunk` theme (glitch-cut bar edge, LED-marquee progress
  fill, glitch fringe + CRT scanline + RGB-split title text). Full suite
  green post-merge (88 server + 55 client vitest + 74 CT + 23 e2e).
- `lyrics-only-view-fix-2` — consolidated a real `.full-lyrics-view` CSS
  specificity bug, then redesigned the view per user feedback into a
  full scrollable lyric sheet (all lines visible immediately on mount,
  active line highlighted and auto-scrolled) rather than the prior
  blank-until-first-line single-line display.

## Recommended Next Step

1. Run `/ardd-plan lyrics-gap-timing-indicator` when ready to design the
   new gap-indicator feature — the open question is how to derive
   measure/beat boundaries from the headless alphaTab instance's own
   loaded score (tempo map), since `CatalogSong.bpm` is documented as
   display-only, not for tick-to-time math.
2. Consider a fresh `/ardd-verify` pass — a large amount of client code
   changed across the two merges above and the last verify pass predates
   both.
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the other minor cross-artifact notes above, and running `/ardd-render
   ui` to refresh the stale UI diagram.
