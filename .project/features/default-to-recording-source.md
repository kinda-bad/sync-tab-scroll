---
slug: default-to-recording-source
status: implemented
logged: 2026-11-27
plan: plan-default-to-recording-source-2026-11-27-a3c7.md
tasks: tasks-default-to-recording-source-a3c7.md
---

When the selected song ships a recording (`recordingPath` plus
`syncPoints`), the session plays the recording by default instead of the
synth. A song without one stays on synth. The host can still switch a song
to synth; the next song applies the default again.
Why: the user (2026-11-27): "i want to default to recordings when we have
them, rather than synth". Reverses the earlier "synth stays the default"
stance in ui.md's recording-mode carve-out.
