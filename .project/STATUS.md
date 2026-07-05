# sync-tab-scroll — Project Status

_Updated: 2026-07-05 (`/ardd-analyze` after fixing the count-in cursor bug:
the beat cursor no longer slides during the count-in bar —
`installCountInCursorGuard` in `client/src/playback-sync.ts` wraps
alphaTab's public `customCursorHandler` extension point, degrading cursor
transitions to plain placements while the count-in window is open.
Committed as `75e2a43` on `main`; the repo is currently checked out on
branch `lyrics-ticker-font-size` (which contains that commit) with
uncommitted `/ardd-verify` + `/ardd-plan` outputs in the working tree:
modified `DEFECTS.md`/`STATUS.md`, the two untracked draft plans, and the
consumed `feedback-defects-followup-743b.md`. All 280 commits in history
now verify as signed — the earlier "re-sign before pushing" item is
resolved._

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
- Per-song vs. per-submitter consent recording (Consent Record section) —
  resolved for `consented-song-submission` as per-song; revisit only if
  re-recording consent per song becomes real friction for a repeat
  submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.
- Whether `CatalogSong.lyricLineBreaks` is worth keeping — computed and
  unit-tested, but the current single-line ticker overlay never uses the
  grouped line boundaries for layout (flagged in the field's own notes as
  "an open question for a future pass").

These are documented defaults, not blockers.

## Cross-Artifact Issues

- [MINOR] `features.md`'s "Metronome toggle" and "Count-in toggle" entries
  (logged 2026-07-02) still carry their original logging-time descriptions
  — `Session.metronomeEnabled` as a session-level flag, and "nothing
  currently lets the host set the flag" — both superseded by the
  implemented design (metronome is a client-local preference,
  `metronome-preference.ts`; count-in has a host toggle in the Settings
  modal). `features.md` is owned by `/ardd-feature`/`/ardd-plan`/
  `/ardd-tasks`/`/ardd-implement`/`/ardd-converge`, not this skill —
  flagged for a future pass.
- [GAP] `ui.md`'s "Connection lost" state (client's own WS reachability)
  and `datamodel.md`'s `Participant.connectionStatus` field (server's
  per-participant socket state) share a name but describe different
  concepts. Not contradictory — each artifact is internally correct — but
  worth a one-line disambiguation in either doc if it causes confusion
  later. Not blocking.
- [GAP — new, from the count-in cursor fix] `ui.md`'s Playback View
  describes the beat cursor as "alphaTab's own native cursor overlay" and
  neither `ui.md` nor `infrastructure.md` mentions
  `installCountInCursorGuard` (`client/src/playback-sync.ts`), which now
  supplies a `customCursorHandler` mirroring alphaTab's default handler
  except that the cursor is pinned in place while the count-in bar plays.
  The cursor elements and render-pass claim still hold; this is
  undocumented drift for the next `/ardd-verify` to confirm/record, not a
  contradiction.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [OPEN] `lyricLineBreaks` retention (see above)

## Constitution Compliance

No violations found this pass. The count-in cursor guard uses alphaTab's
public `customCursorHandler` extension point (Principle V: defer to
alphaTab's own mechanisms rather than building a parallel cursor) and
mirrors the built-in handler's behavior byte-for-byte outside the count-in
window; it carries unit tests (Principle VII). Principle I (Single Source
of State): the guard's window state is local to the installed handler, not
shared cross-module state.

Principle VIII (Config via `.env`, Synced by Example) remains implemented
— see `DEFECTS.md` for the one open, explicitly-deferred item (CI provider
decision).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

5 known defects — see `DEFECTS.md`, last checked 2026-07-05 (first full
unscoped pass across all six artifacts; note the working-tree copy of
`DEFECTS.md` on this branch is uncommitted). Summary:

- `infrastructure.md` — cosmetic: percussion detection is described as
  reading track metadata but actually reads `track.isPercussion` directly
  (`client/src/tab-renderer.ts:106`); conclusion unaffected.
- `infrastructure.md` — drift: undocumented small-screen render-scaling
  (`tabScaleForViewportWidth`, `client/src/tab-renderer.ts:59-62`).
- `infrastructure.md` — drift: `host-remove-participant` is a fully
  implemented server message/handler with no client-side entry point and
  no documentation. User decision recorded: finish the client UI (planned
  in `plan-lyrics-ticker-font-size-defects-2026-07-05.md`).
- `pipeline.md` — drift: wording implies GP owns the lyric text even in
  the lrclib-assisted-line-break branch; actually lrclib supplies the
  text there, GP only supplies timestamps/line-break counts.
- `constitution.md` — drift (pre-existing, re-confirmed): Principle VIII's
  "run ... in CI" half is unmet (no CI provider/workflow/remote exists) —
  an explicitly deferred human decision, not a silent gap.

`datamodel.md`, `ui.md`, `brand.md` came back fully clean that pass. The
count-in cursor guard (added after it) is flagged above as a new
documentation-drift candidate for the next `/ardd-verify`.

## Feedback

0 open feedback files. (`feedback-defects-followup-743b.md` is
`status: planned`, consumed by
`plan-lyrics-ticker-font-size-defects-2026-07-05.md` — the file itself is
still untracked in git.)

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 7 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` (participant
list shows each member's currently selected part) remains backlogged —
target it with `/ardd-plan participant-selected-part` when ready.

## Recommended Next Step

1. Commit the outstanding `.project/` working-tree changes on
   `lyrics-ticker-font-size` (modified `DEFECTS.md`/`STATUS.md`, the two
   draft plans, `feedback-defects-followup-743b.md`) — they're the durable
   record of today's `/ardd-verify` + `/ardd-plan` runs.
2. Run `/ardd-tasks` to approve one or both draft plans on this branch:
   `plan-lyrics-ticker-font-size-2026-07-05.md` (ticker font-size CSS fix)
   and/or `plan-lyrics-ticker-font-size-defects-2026-07-05.md`
   (host-remove-participant UI + the three doc-wording fixes).
3. Have the user listen through a real count-in once (cursor should hold
   at the start until the clicks finish — fix verified by automation and
   unit tests, but the automated environment's audio pipeline is
   unreliable, so one human ear-check closes the loop).
4. Decide the CI-provider question for constitution Principle VIII
   whenever a remote/CI system exists.
5. Not blocking: `/ardd-render` the three stale diagrams; the minor
   cross-artifact notes above (`features.md`'s stale toggle entries,
   `connectionStatus` naming overlap, count-in cursor guard doc drift).
