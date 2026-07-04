---
status: planned      # open -> planned
created: 2026-07-04
plan: plan-lobby-cursor-race-2026-07-04.md
---

# Feedback

Split from `feedback-manual-verification-pass-4b3c.md` for parallel
planning (grouped by subsystem: lobby-cursor set/broadcast race
condition).

## Bugs

- [x] As host, clicking multiple lobby-cursor positions in quick succession
  causes the cursor to rapidly flip between those spots instead of settling
  on the most recent one. Only one cursor position should ever be active at
  a time. [artifacts: ui]
