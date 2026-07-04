---
status: planned   # UX item via plan-settings-modal-followup-2026-07-04.md (now superseded); Reconsidered item confirmed by user 2026-07-04 and consumed by the superseding plan below, which also carries the UX item's work forward
created: 2026-07-04
plan: plan-worktree-ui-improvements-2026-07-04.md
---

# Feedback

Split from `feedback-manual-verification-pass-4b3c.md` for parallel
planning (grouped by subsystem: Settings modal layout/copy follow-up to
the already-implemented `settings-modal-redesign` and
`metronome-count-in-toggle` features).

## UX

- [x] The Participants tab's settings under "lobby cursor" are all crammed
  onto one line and are too wide; they should be split across
  related/grouped tabs instead. Also, the purpose of "set lobby cursor" and
  how it relates to Spotlight mode is unclear from the UI alone — needs
  clearer labeling/description. [artifacts: ui]

## Reconsidered

- [x] Metronome should be toggleable per participant rather than forced by
  the host for everyone. Low priority. [artifacts: ui, datamodel]
  (User confirmed the override 2026-07-04 — metronome becomes a personal
  per-participant setting; count-in stays host-controlled session-wide.)
