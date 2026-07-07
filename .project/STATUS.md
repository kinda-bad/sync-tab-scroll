# sync-tab-scroll — Project Status

_Updated: 2026-07-07 (`/ardd-analyze`, full manual pass after the theme
rework, lyrics-sheet redesign, gap-timing-indicator, and README-docs
merges). Repo is on `main`, pushed to `origin/main`. One new finding this
pass: `brand.md` has a stale internal claim about `HazardBar`'s scope —
see Cross-Artifact Issues._

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

- [CONFLICT] `brand.md`'s "Signature element" and "Motion & Vibe" sections
  both describe `HazardBar` (`.hazard-stripes`/`.led-marquee`) as carrying
  three jobs, including "the lyric-timing drain/fill visual" — but
  `brand.md`'s own newer "Lyrics Gap Indicator" section explicitly states
  the gap-timing drain bar is a **separate element**, not a second
  `HazardBar` instance. Verified against code: `HazardBar`'s `progress`
  prop (`client/src/components/Bar.svelte:16`) only ever receives
  `barProgress` (`client/src/App.svelte:73`), which is either the Lobby
  readiness ratio or Playback progress — nothing feeds it a lyric-timing
  signal. The "third job" claim reads as stale, predating (or never
  matching) what was actually built. Worth a `/ardd-refine` pass on
  `brand.md` to drop or correct it.
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

## Constitution Compliance

No violations found this pass. Principle VIII's CI half remains a known,
explicitly-deferred gap — see Code-vs-Artifact Defects below.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-render ui` — the theme-control Preferences
  tab, the full-lyrics-sheet redesign, and the gap-timing-indicator design
  have all landed since this was last rendered)

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06, **before**
the theme rework, lyrics-sheet redesign, and gap-timing-indicator all
merged — a fresh `/ardd-verify` pass is overdue given how much client code
has changed since (it would likely also independently catch this pass's
new `HazardBar`/lyric-timing finding above). Both already declined for
inclusion in prior plans — won't re-prompt via `/ardd-plan`:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed (`track.isPercussion`).
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 10 implemented — see
`.project/features/`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — the only remaining backlog item.

## In Flight

None — everything merged and pushed to `main` as of this pass.

## Recommended Next Step

1. Run `/ardd-verify` — overdue given the volume of client code that
   changed across the theme-rework, lyrics-sheet-redesign, and
   gap-timing-indicator merges; would also likely catch/confirm this
   pass's `HazardBar`/lyric-timing finding independently.
2. Run `/ardd-refine brand` to fix (or remove) the stale "lyric-timing
   drain/fill" claim in the Signature element / Motion & Vibe sections.
3. Run `/ardd-render ui` to refresh the stale UI diagram.
4. Run `/ardd-plan participant-selected-part` when ready to design the
   last backlogged feature.
5. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
6. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the `connectionStatus` naming overlap, and the missing
   `installCountInCursorGuard` mention.
