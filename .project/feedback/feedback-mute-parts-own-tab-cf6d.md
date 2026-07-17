---
status: planned      # open -> planned
created: 2026-07-17
plan: plan-1619-2026-07-17-39c6.md
---

# Feedback

## UX

- [x] F001 The per-part "Mute parts" control currently lives inside the
  Settings modal's Preferences tab, alongside unrelated personal settings
  (Theme, Metronome) — `ui.md`'s Lobby View section documents it there. It
  should get its own dedicated Settings tab instead (a 4th tab alongside
  Participants/Session/Preferences), with one row per part — same
  `Session.availableParts` source the existing control already reads, just
  promoted out of Preferences into its own home. [artifacts: ui]

See also the backlog: `solo-mute-button-per-part` (per-part "mute all but
this" button, filed separately as a new capability, not a fix to existing
behavior).
