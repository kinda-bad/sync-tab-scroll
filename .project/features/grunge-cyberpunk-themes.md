---
slug: grunge-cyberpunk-themes
status: implemented
logged: 2026-07-06
plan: plan-grunge-cyberpunk-themes-2026-07-06.md
tasks: tasks-grunge-cyberpunk-themes-4982.md
---

Offer two additional selectable themes, each a fully distinct dark/light pair, alongside the current default: (1) a louder, wilder variant of the current theme drawing visual inspiration from Yeah Yeah Yeahs and Nirvana album cover art (see `~/Documents/art/`); (2) a cyberpunk theme, drawing color palette and design ideas from the predecessor project `sync-scroll` (`~/dev/sync-scroll/`).
Why: `brand.md` already anticipated this extensibility path — themes are selected via a `[data-theme='...']` attribute against semantic role names (not theme-specific tokens), specifically so a new theme is an additive `tokens.css` block plus a toolbar entry with no component touching theme-specific logic. `/ardd-plan` will need to review the referenced album art and the `sync-scroll` codebase directly (both outside this repo, so not derivable from artifacts alone) to derive concrete palettes before designing the `brand.md`/`tokens.css` changes.
