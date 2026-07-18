---
slug: count-in-metronome-beat-widget
status: backlogged
logged: 2026-07-18
---

Add a shared visual beat widget rendered in the persistent Bar for count-in and metronome. Single shape (not four separate segments) whose fill color animates on every beat, alternating direction each beat: primary->secondary on 1->2 and 3->4, secondary->primary on 2->3 and 4->1. During count-in it counts down 4->1, visible to every participant, gated on the host-broadcast Session.countInEnabled (same visibility as the audio click). During playback it counts up 1->4 and additionally tracks the measure number (shown less prominently than the beat count, and labeled, e.g. 'Measure 12') — personal/per-participant, gated on each participant's own Metronome preference (metronome-preference.ts), matching that toggle's existing personal scope. Timing must be driven by real beat boundaries (derived from api.tickPosition + tempo-lookup.ts's localTempoAtTick, the same tempo-lookup infrastructure correctDrift/lyrics-gap-timing already use), not a naive fixed-interval timer, so the animation stays sample-accurate with the actual audio click and doesn't drift. Colors: a theme-appropriate primary/secondary token pair from brand.md — exact pair and exact shape/layout (how the beat count and measure number are laid out together) left to implementation-time visual judgment.
