---
slug: phone-playback-layout-fixes
status: backlogged
logged: 2026-11-27
---

Three layout problems in the Playback view at phone width (390 px, the
iPhone 14/15 size), seen in screenshots on 2026-11-27 in both Riot and
Mono, so they come from the app, not from a theme:

1. **The bar overflows.** Its buttons don't fit on one row: the check
   (ready) button wraps to a second row, and the last button on the first
   row is cut off at the right edge. The page itself doesn't scroll
   sideways, so the bar is clipping its own contents. The bar should fit
   every control at 360 px and up, e.g. by shrinking buttons, dropping
   labels or moving less-used controls into an overflow menu.
2. **The Pause tooltip covers the song title.** The tooltip for the
   focused or hovered bar button sits on top of the title and artist line
   above the buttons.
3. **Lyric lines overlap at the top of the tab.** Two lines of alphaTab's
   own lyrics row (under the staff, not the app's lyrics strip) draw on top
   of each other and can't be read. Check alphaTab's lyric spacing settings
   before working around it (constitution Principle V).
