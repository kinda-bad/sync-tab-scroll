---
slug: multipane-tab-and-lyrics-view
status: backlogged
logged: 2026-11-28
---

Add a multipane playback view: the tab in one pane and the lyrics in
another, side by side or stacked. The point is to show more of the
lyrics at once, laid out as lines and verses like a lyric sheet, rather
than the single scrolling line of the in-tab lyrics strip (user,
2026-11-28).

Likely shape:
- The lyrics pane reuses the Lyrics part's full-sheet rendering (lines
  from `lyrics.lrc`, the current line highlighted, kept in view), next to
  the normal tab view. That pane is what a Lyrics-part player sees today,
  but alongside a real part's tab instead of in place of it.
- Verses would come from the existing line breaks plus a gap between
  lines. Songs with tab-timed lyrics could also highlight the sung
  syllable within the current line, as the strip does.
- It's probably a personal (this-device) view setting, like the
  horizontal view and the strip's position.

To decide:
- Side by side, stacked, or both depending on the screen shape. A phone
  held upright may only have room for stacked panes, or none.
- Whether the pane split can be resized, and whether the sizes are
  remembered.
- How it combines with the in-tab lyrics strip (hide the strip when the
  pane is shown?) and with the horizontal view.
- How verses are found: blank-line gaps in the LRC, timing gaps, or
  hand-set breaks in `meta.json`.
