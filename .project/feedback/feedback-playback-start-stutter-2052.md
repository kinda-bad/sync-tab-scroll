---
status: planned      # open -> planned
created: 2026-07-17
plan: plan-1619-2026-07-17-39c6.md
---

# Feedback

## Bugs

- [x] F001 Playback is often glitchy/stuttering right when it first starts
  (audio and/or cursor). Suspected cause: alphaTab's audio engine (the
  Sonivox SoundFont, `settings.player.soundFont`/`enablePlayer`,
  infrastructure.md's Tab Rendering section) and/or the browser's Web
  Audio graph aren't fully "warmed up" the moment `start` is pressed —
  the existing per-participant "Loading" state (ui.md's States section)
  already tracks `.gp` parse/render + SoundFont *load*, but that's
  distinct from the audio engine actually being primed/pre-rolled and
  ready to output glitch-free audio at t=0. Requested direction: some form
  of pre-buffering/warm-up before the count-in/first note, so playback
  starts clean rather than stuttering in. Needs investigation into what
  alphaTab actually exposes for this (e.g. a silent pre-roll, warming the
  audio context, or a short readiness delay after `soundFontLoaded` before
  actually starting) before committing to a specific mechanism.
  [artifacts: infrastructure, ui]
