---
slug: mono-theme
status: implemented
logged: 2026-11-27
---

Add a third selectable theme, **Mono**: "no nonsense black and white, with
one lightly used accent color." A dark/light pair (`mono-dark`,
`mono-light`) of black, white and untinted grays, with a single signal-red
accent (`#ff3b30` on black, `#d70500` on white) used only for what's
happening right now: the playback cursor and current-bar highlight, the
sung syllable, the progress fill, focus rings and primary-button hover.
No signature edge shape, texture, motion or type flourish: a straight 1px
rule for the bar edge and a flat fill for progress.

Why: Riot and Cyberpunk are both loud by design; Mono is the quiet option
for players who want the notation and the cursor and nothing else.

Spec: `brand.md` Themes › Mono (palette, devices, contrast ratios), `ui.md`
View › Theme.
