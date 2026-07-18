---
slug: hover-long-press-tooltip-for-i
status: implemented
logged: 2026-07-18
plan: plan-hover-long-press-tooltip-for-i-2026-07-18-c2e5.md
tasks: tasks-hover-long-press-tooltip-for-i-9124.md
---

Show a visible tooltip/hovertext for the bar's icon-only buttons (Song & part, Toggle lyrics, Settings, Start/Pause/Resume/Stop, Leave session) on mouse hover, and on touch screens via long-press, so sighted mouse/touch users can identify a button's function without a screen reader. Button.svelte already sets a native title attribute on iconOnly buttons (works for mouse hover in most browsers already, but not reliably discoverable and does nothing for touch/long-press) — this would add an explicit, styled, touch-aware tooltip component instead of relying on the native title attribute alone.
