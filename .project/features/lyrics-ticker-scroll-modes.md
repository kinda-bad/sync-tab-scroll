---
slug: lyrics-ticker-scroll-modes
status: backlogged
logged: 2026-11-27
---

Add personal (this-device-only) settings for how the in-tab lyrics ticker
moves. Today it does one thing: it centers the highlighted syllable, moving
on every syllable (`centerActiveSyllable` in `client/src/lyrics-overlay.ts`),
and centers empty bars on entry (`feat/center-empty-bars`). The user asked
(2026-11-27) for:

1. **Anchor:** center (today) or left. With left, the highlighted word sits
   near the strip's left edge, so more of what's coming is visible.
2. **Scroll style:** move constantly (today, on every syllable), or only when
   the highlight reaches an edge, then jump or slide a page so the reader's
   eye isn't chasing a moving strip.
3. **Maybe: whole-line mode.** Group the lyric into lines so a whole line is
   visible at once. The strip shows one line, highlights through it, and
   moves to the next line when it starts. A long line would need to wrap,
   shrink or split.

Notes for planning:
- **Existing behavior to keep working:**
  - The ticker's lines already exist: `lyricLineBreaks` / the `.lrc` lines.
    Whole-line mode could reuse them instead of inventing a grouping.
  - Empty-bar centering, bar-line highlight clearing and measure markers need
    a defined behavior in each mode. In edge-scroll mode, for example, does an
    empty bar still recenter?
  - The pre-singing placeholder needs the same.
- **Where the settings go:** they sit with the other lyrics ticker settings
  (font size, position, measure markers). Fit them into the menu
  reorganization (`settings-menu-reorganization.md`) rather than adding more
  separate rows.
- **Horizontal view:** the horizontal scroll view (`horizontal-scroll-view.md`)
  scrolls lyrics past a fixed playhead. Decide whether these modes apply
  there or only to the ticker.
- **Defaults:** keep today's behavior (center, constant) unless the user
  decides otherwise.

Why: constant centering keeps the strip moving all the time, and a centered
anchor shows only half a strip of what's coming next. Readers differ in which
is easier to follow while playing.
