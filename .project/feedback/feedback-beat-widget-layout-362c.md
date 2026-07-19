---
status: open      # open -> planned
created: 2026-07-19
plan: null
---

# Feedback

Context: user inspecting the just-shipped count-in/metronome beat widget
(`client/src/components/BeatWidget.svelte`, ui.md Count-In & Metronome
Beat Widget) live in the Bar.

## UX

- [ ] F001 Place the measure display to the LEFT of the beat count, so
  the beat count keeps the same screen position in both modes: during
  count-in only the beat number shows, and when playback starts the
  measure display appears to its left — the countdown seamlessly
  "becomes" the metronome instead of the beat number relocating to make
  room for the measure label. [artifacts: ui]
- [ ] F002 Render the measure display as the measure number stacked
  over a small "MES" label (number on top, compact caption beneath)
  instead of the horizontal "Measure 12" text, so it takes much less
  horizontal space in the Bar. [artifacts: ui]
