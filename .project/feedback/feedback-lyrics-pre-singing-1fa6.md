---
status: planned      # open -> planned
created: 2026-07-04
plan: plan-lyrics-pre-singing-2026-07-04.md
---

# Feedback

Split from `feedback-manual-verification-pass-4b3c.md` for parallel
planning (grouped by subsystem: lyrics overlay pre-singing state — this is
also the design decision `tasks-lyrics-ticker-75dd.md` T004's FAILED note
punted to a plan for, rather than fixing inline).

## UX

- [x] Lyrics overlay is left-aligned initially and snaps to centered the
  moment the first syllable is due, which reads as a jump. Should instead:
  show a "..." placeholder (highlighted) during any pre-singing portion of
  the song, and stay centered whenever there's no active playback state or
  cursor. [artifacts: ui]
