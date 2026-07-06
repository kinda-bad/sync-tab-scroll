---
slug: count-in-toggle
status: implemented
logged: 2026-07-02
plan: plan-metronome-count-in-toggle-2026-07-03.md
tasks: tasks-metronome-count-in-toggle-eb7d.md
---

The host can turn the pre-playback count-in on or off (`Session.countInEnabled`, already wired to alphaTab's `countInVolume` in `playback-sync.ts`, but nothing currently lets the host set the flag — no message type or server handler exists for it).
Why: same research question as metronome-toggle — check alphaTab's own count-in UI/mechanism before building a custom one (constitution Principle V). Likely resolved together with `metronome-toggle` in the same `/ardd-plan` pass, since both need the same session-settings message/handler shape.
