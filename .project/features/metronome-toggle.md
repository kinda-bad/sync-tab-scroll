---
slug: metronome-toggle
status: implemented
logged: 2026-07-02
plan: plan-metronome-count-in-toggle-2026-07-03.md
tasks: tasks-metronome-count-in-toggle-eb7d.md
---

The host can turn the session's metronome on or off (`Session.metronomeEnabled`, already wired to alphaTab's `metronomeVolume` in `playback-sync.ts`, but nothing currently lets the host set the flag — no message type or server handler exists for it).
Why: before designing a custom toggle, research whether `@coderline/alphatab` already provides its own metronome-enablement UI/mechanism worth deferring to instead (constitution Principle V) — ejected from `plan-song-catalog-selection-2026-07-02.md` for this reason, rather than designed inline.
