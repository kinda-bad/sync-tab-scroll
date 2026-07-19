---
status: open      # open -> planned
created: 2026-07-19
plan: null
---

# Feedback

Context: user inspecting the Settings → Tracks (Mute parts) tab live
(`client/src/components/SettingsModal.svelte`, ui.md part-mute/solo
section).

## UX

- [ ] F001 Each track in Settings → Tracks should be exactly one line —
  no wrapping. The track label is display-only (not interactable), and
  when the label doesn't fit its available width it scrolls
  marquee-style instead of wrapping to a second line. [artifacts: ui]
- [ ] F002 Replace the track mute control with a small icon-only button
  using volume icons — `volume-off` when muted, `volume-2` when audible
  (lucide names; consistent with the Bar's existing icon-only button +
  tooltip idiom). Solo stays a text "Solo" button — no good icon for it
  (user decision). [artifacts: ui]
