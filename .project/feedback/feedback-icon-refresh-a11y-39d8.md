---
status: open      # open -> planned
created: 2026-07-19
plan: null
---

# Feedback

## Bugs

- [ ] F005 Bar tooltips (the icon-button hover text from
  `client/src/components/Button.svelte`'s Tooltip) render underneath
  the alphaTab tab view — wrong z-index/stacking context, so hovering a
  Bar control during Playback shows a clipped/hidden tooltip. Likely
  needs a higher z-index than the alphaTab surface (or portal-style
  rendering out of the Bar's stacking context); check against the
  lyrics overlay's layering too. [artifacts: ui]

## UX

- [ ] F001 Icon reassignment for session/account actions: "Leave/End
  session" changes from the current exit icon (`log-out`) to a
  bone-fracture icon (lucide `bone` — or the closest fracture-styled
  variant available; the "breaking up the band" pun is the intent);
  the freed `log-out` icon moves to the account menu's **Sign out**
  action, and **Sign in** gets `log-in` — so session-leaving and
  account-auth actions stop sharing visual language. [artifacts: ui]
- [ ] F002 Replace the "HOST" text badge (participant list / wherever
  the host is marked) with a crown icon. [artifacts: ui]
- [ ] F003 Accessibility audit of all icon usage: every icon-only
  control must have an accessible name (aria-label, and the existing
  tooltip/title mechanisms should complement, not substitute), and any
  purely decorative or status icons (e.g. the new crown) need
  aria-label/alt text or aria-hidden-plus-adjacent-text as appropriate,
  so screen readers announce every control and status. Verify across
  the Bar, settings modal, part picker, participant list, and account
  menu. [artifacts: ui]
- [ ] F004 The Settings control should use the lucide `settings` icon
  instead of the current `cog`. [artifacts: ui]

## Reconsidered

- [ ] F006 The Bar's "Toggle lyrics" control should be **always
  visible**, rendered disabled when no lyrics ticker is available for
  the current context (song has no lyrics track / participant is on the
  tab-less Lyrics part where there's no in-tab strip), instead of being
  absent. This reverses ui.md's recorded decision that the control is
  "absent entirely" for a Lyrics-part participant (and the general
  "absent, not disabled" pattern for this control) — a persistent
  disabled control keeps the Bar layout stable and teaches that the
  feature exists. Disabled state needs a tooltip/aria reason (ties into
  F003's a11y audit). [artifacts: ui]
