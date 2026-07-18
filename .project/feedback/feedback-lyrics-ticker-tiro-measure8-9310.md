---
status: open
created: 2026-07-18
plan: null
---

# Feedback

## Bugs
- [ ] F001 In-tab lyrics ticker still out of sync with the tab cursor, with a precise repro: on "TIRO" (Time Is Running Out), bass part, measure 8's last note is fret 3 on the lowest string — the singer is taking a breath there, so no syllable should highlight. Instead the ticker jumps ahead early and highlights "You're", which should actually be tied to the first note of measure 9. Pins the exact measure/note boundary where the ticker advances too early — a sharper repro than the earlier lyrics-timing feedback (feedback-lyrics-timing-tiro-c741.md, F001), which was accepted as research-only and left unresolved (`plan-1619-2026-07-17-39c6.md` Phase 3: alphaTab's public API doesn't expose AudioContext/outputLatency, so empirical device-latency comparison wasn't possible in that pass; findings filed as `feedback-audio-output-latency-t014-dfa8.md`, still open). This report suggests the root cause may not be output-latency at all — the described jump (highlighting a syllable a full note-tie ahead of where it belongs) looks like a note/tie-boundary computation bug in the syllable-tick walk itself. [artifacts: ui]
