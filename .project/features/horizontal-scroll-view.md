---
slug: horizontal-scroll-view
status: backlogged
logged: 2026-11-27
---

Add a horizontal playback view. The tab shows as one long staff that
scrolls right to left past a fixed playhead, instead of wrapped rows that
scroll down the page. The lyrics get their own band of the screen and
scroll horizontally in step with the tab, so each syllable passes the
playhead as it's sung. This is the side-scrolling layout practice apps like
Yousician use (user, 2026-11-27).
Likely shape: alphaTab already has a horizontal layout
(`settings.display.layoutMode = LayoutMode.Horizontal`; the client uses
`LayoutMode.Page` today, in `client/src/tab-renderer.ts`), so check its
scrolling and cursor behavior before building anything custom (constitution
Principle V). The lyrics band would reuse the ticker's syllable stream on
the playback timeline (`lyrics-overlay.ts`, repeat-aware since
`fix/lyrics-timing-and-repeats`), positioned by tick rather than wrapped by
measure.
Decisions (user, 2026-11-27):
- **Personal preference.** It's a this-device-only view setting, like the
  ticker position, not host-controlled.
- **Fixed playhead.** The playhead stays put and the score moves under it
  smoothly. The view never jumps.
- **Lyrics above the tab.** The lyrics band sits above the tab band.
- **Host settings:**
  - It ignores host-mandated bars-per-row, since a single line has no rows.
  - It follows Spotlight and the session start and early-stop markers.
  - It allows click-to-seek if that can be made to work there.
- **Phones in portrait:** force landscape ("horizontal") orientation for
  now while the view is on. The user isn't sure about portrait yet, so
  revisit later. Planning should confirm this reading and how it's done:
  `screen.orientation.lock` only works in fullscreen on some browsers, so
  the fallback may be a "rotate your phone" prompt.

- **Band heights:** the lyrics band takes about 1/3 of the viewport height
  and the tab band about 2/3, as a starting point to tune.
- **Lyrics-only view:** it follows the same horizontal layout with no tab
  band. The lyrics band grows and sits vertically centered.
Why: a side-scrolling view keeps the next few bars in a steady place at
the playhead, which is easier to read while playing than following a
cursor down wrapped rows.
