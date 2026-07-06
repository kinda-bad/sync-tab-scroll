---
status: planned
created: 2026-07-03
plan: plan-lobby-cursor-modes-2026-07-03.md
---

# Feedback

## Bugs

## UX

## Reconsidered
- [x] The host's lobby-cursor pointer should only force all participants' pointers to follow it while a session is in a (new) "Spotlight mode" — outside of that mode, each participant should be free to set/scroll their own pointer independently. This reverses the current "Lobby cursor" design (`features.md`, added 2026-07-01), which has the host's pointer always broadcast and shown identically to every participant with no per-participant override; `datamodel.md`'s `Session.lobbyCursorTick` and `ui.md`'s Lobby View description both currently assume the single-shared-pointer behavior throughout. "Spotlight mode" (originally proposed as "presentation mode") doesn't exist yet as a concept anywhere in the artifacts — introducing it, and the participant-local-pointer state it implies, is part of this reversal, not just a behavior tweak. [artifacts: datamodel, ui]
