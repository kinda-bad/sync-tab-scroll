---
slug: hover-long-press-tooltip-for-i
status: backlogged
logged: 2026-07-18
---

Show a visible tooltip/hovertext for the bar's icon-only buttons (Song & part, Toggle lyrics, Settings, Start/Pause/Resume/Stop, Leave session) on mouse hover, and on touch screens via long-press, so sighted mouse/touch users can identify a button's function without a screen reader. Button.svelte already sets a native title attribute on iconOnly buttons (works for mouse hover in most browsers already, but not reliably discoverable and does nothing for touch/long-press) — this would add an explicit, styled, touch-aware tooltip component instead of relying on the native title attribute alone.
