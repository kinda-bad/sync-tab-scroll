---
status: planned      # open -> planned
created: 2026-07-04
plan: plan-server-failure-banner-2026-07-04.md
---

# Feedback

## Bugs
- [x] When the UI loads but the server is unreachable, nothing indicates why — things "don't whirl properly" (loading/readiness UI just sits, no explanation) instead of surfacing a clear connection-failure state. The client should detect this (WS never connects, or drops with no server-side error message) and show a persistent error banner until contact is restored, rather than relying on the existing toast-based error handling (ui.md's documented Error state only covers WS-message-level errors like a bad join code — not total server unreachability, which has no current handling at all). [artifacts: ui, infrastructure]
