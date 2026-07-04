---
status: planned      # open -> planned
created: 2026-07-04
plan: plan-session-lifecycle-2026-07-04.md
---

# Feedback

Split from `feedback-manual-verification-pass-4b3c.md` for parallel
planning (grouped by subsystem: session join/leave lifecycle robustness).

## Bugs

- [x] After joining a session and selecting a song part, the tab/lyrics
  sometimes silently fail to render — no error, no visible loading
  indicator — and only a full page refresh fixes it. Needs an explicit
  "still loading" state rather than a silent stall. [artifacts: ui]

## UX

- [x] Need a "leave session" control that clears local session state, so a
  participant can join a different session without a manual workaround
  (e.g. clearing storage or refreshing). [artifacts: ui]
