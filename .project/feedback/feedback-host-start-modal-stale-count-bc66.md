---
status: planned      # open -> planned
created: 2026-07-23
plan: plan-host-start-modal-fix-2026-07-23-0a6a.md
---

# Feedback

## Bugs
- [x] F001 As host, starting playback while participants aren't all ready opens the host's "N participants are not yet ready, start anyway?" confirmation modal (ui.md Start Negotiation modals; infrastructure.md Start Negotiation). If all remaining participants ready up while that modal is still open, the modal stays open and its count goes stale — reported symptom: it reads "0 participants are not ready yet, start anyway? / Cancel" instead of recognizing the not-ready count has dropped to 0 and just starting playback directly, same as an ordinary host Start when everyone was already ready. [artifacts: ui, infrastructure]
