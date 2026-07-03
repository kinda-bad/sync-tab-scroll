---
status: planned
created: 2026-07-03
plan: plan-lyrics-ticker-2026-07-03.md
---

# Feedback

## UX
- [x] The rendered tab notation needs enough bottom padding/scroll room that a user can scroll the tab to a position where the fixed-position lyrics strip (see Reconsidered below) doesn't obscure the last few rows of notation. [artifacts: ui]

## Reconsidered
- [x] The in-tab lyrics overlay (just shipped this session as a fixed-position flowing text strip pinned above the persistent Bar, wrapping across multiple lines) should instead be a single-line horizontal ticker: still fixed at the bottom of the tab viewport, but lyrics scroll right-to-left with no line breaks or vertical grouping of any kind. The currently active syllable snaps to the horizontal center of the strip when it becomes active (a CSS-transitioned recenter on each syllable change, not continuous per-frame scrolling — that's an explicitly deferred future refinement, not part of this reversal). This reverses this session's just-merged fix to `ui.md`'s Lobby/Playback View lyrics-overlay description (multi-line flowing strip) in favor of the ticker design. [artifacts: ui]
