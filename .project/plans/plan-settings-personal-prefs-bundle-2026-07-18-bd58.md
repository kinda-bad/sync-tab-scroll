---
status: approved
branch: lyrics-overlay-measure-lines-a
created: 2026-07-18
features: [lyrics-overlay-measure-lines-a, lyrics-ticker-font-size-prefer, solo-mute-button-per-part]
surfaced-defects: []
---

# Plan: Settings personal-preferences bundle (measure markers, ticker font size, solo mute)

## Goal

Add three independent personal, this-device-only preferences to the Settings modal — in-tab lyrics ticker measure markers, in-tab lyrics ticker font size, and a per-part "Solo" button — bundled into one plan because all three edit the same `SettingsModal.svelte` file and would conflict if planned/implemented in separate parallel worktrees.

## Scope

**In scope:**
- `lyrics-overlay-measure-lines-a`: vertical measure-boundary line + number markers in the in-tab lyrics overlay ticker, gated behind a new "Measure markers" Preferences toggle (default off).
- `lyrics-ticker-font-size-prefer`: a 4-step "Lyrics ticker font size" Preferences control (small/medium/large/huge, default medium = today's fixed `1.125rem`).
- `solo-mute-button-per-part`: a "Solo" control alongside each part's existing mute toggle in the Tracks tab — mutes every other part, personal/client-local.
- `ui.md` updates for all three (already applied this run — see below).

**Out of scope:**
- Any change to the full lyric sheet (Lyrics-part tab-less view) — none of these three touch it; the font-size and measure-marker preferences apply only to the in-tab ticker.
- A "solo mode" tracked as separate persisted state — per `ui.md`, Solo is just a one-shot mute-state change, not a mode the UI remembers.
- The `hover-long-press-tooltip-for-i` feature (parallel-set item from the same slate run, unrelated file footprint — planned separately).

## Technical Approach

- **Measure markers** (`client/src/lyrics-overlay.ts`): reuse `lyrics-gap-timing.ts`'s existing local-tempo/time-signature measure-duration derivation to compute each measure's start tick from the loaded score. Since the ticker's `.lyrics-track` lays out by text-flow width (no continuous tick→pixel mapping — `centerActiveSyllable()` positions only via `getBoundingClientRect()` on the *active* syllable), a marker's position is only well-defined by inserting a marker element into the `flat` syllable-span sequence at the correct tick-sorted point — mirroring the existing `gap-dot`/`gap-drain` insertion pattern in the full lyric sheet (`playback-engine.ts`), applied here to the in-tab ticker instead. `updateActiveSyllable()`/`activeIndex` must keep indexing only the real syllable array — markers ride along in the DOM without being part of that indexing, so inserted markers don't shift syllable-highlight logic.
- **Ticker font size**: new `client/src/lyrics-ticker-font-size-preference.ts`, mirroring `metronome-preference.ts`'s load/persist shape (`localStorage`, default `'medium'`). `client/src/lyrics-overlay.ts`/`motifs.css`'s `.lyrics-overlay` font-size becomes a CSS custom property (e.g. `--lyrics-ticker-font-size`) set from the preference at overlay-creation/preference-change time, with four large, clearly-distinct step values (e.g. roughly 0.85rem / 1.125rem / 1.5rem / 2rem — exact values are an implementation-time visual-judgment call, not a design commitment).
- **Solo button**: `client/src/components/SettingsModal.svelte`'s Tracks tab, alongside the existing per-part mute toggle. Clicking "Solo" for part *P* calls `api.changeTrackMute()` (already used by the individual mute toggles) to mute every part in `Session.availableParts` except *P*, and persists that as an ordinary mute-state change via the existing `track-mute-preference.ts` (keyed per song+track, same as today) — no new "solo" persisted concept, matching `ui.md`'s explicit call-out that Solo isn't a tracked mode.
- All three are personal/client-local only, following the constitution's Principle V precedent (check existing idioms first): each reuses an established pattern already in the codebase (`metronome-preference.ts`'s persistence shape, `gap-dot`/`gap-drain`'s marker-insertion shape, `changeTrackMute()`'s existing mute call) rather than inventing a new mechanism.

## Phase Breakdown

### Phase 1: Ticker font-size preference
- T001 — Create `client/src/lyrics-ticker-font-size-preference.ts` (load/persist small|medium|large|huge, default medium), mirroring `metronome-preference.ts`. `[artifacts: ui]` (feature: lyrics-ticker-font-size-prefer)
- T002 — Wire the preference into `client/src/lyrics-overlay.ts`/`client/src/styles/motifs.css`'s `.lyrics-overlay` font-size via a CSS custom property; add the "Lyrics ticker font size" control to `SettingsModal.svelte`'s Preferences tab. `[artifacts: ui]` (feature: lyrics-ticker-font-size-prefer) `[parallel with T004]`

### Phase 2: Measure markers
- T003 — Extend `lyrics-overlay.ts` to accept measure-boundary tick data (reusing `lyrics-gap-timing.ts`'s measure-duration math) and insert marker elements (vertical line + number) into the syllable-span sequence at the correct tick-sorted points, without altering `activeIndex`/`updateActiveSyllable`'s syllable-only indexing. `[artifacts: ui]` (feature: lyrics-overlay-measure-lines-a)
- T004 — Create a "Measure markers" toggle preference (new small preference module, same load/persist shape as T001, default off) and wire it into `SettingsModal.svelte`'s Preferences tab and `lyrics-overlay.ts`'s marker rendering from T003. `[artifacts: ui]` (feature: lyrics-overlay-measure-lines-a) `[parallel with T002]`

### Phase 3: Per-part Solo button
- T005 — Add a "Solo" button to each part row in `SettingsModal.svelte`'s Tracks tab, calling `api.changeTrackMute()` to mute every other part and persisting via the existing `track-mute-preference.ts`. `[artifacts: ui]` (feature: solo-mute-button-per-part) `[parallel with T001, T003]`

## Open Questions

- Exact font-size step values for small/large/huge — left to implementation-time visual judgment (per `ui.md`'s own precedent for cosmetic specifics), constrained only by "each step is a clearly noticeable jump."
- Exact marker visual treatment (line style, number placement/typography) — same implementation-time visual-judgment deferral `ui.md` already uses for the gap-timing indicator's sizing.

## Production Annotation Summary

Not applicable — constitution.md declares no production-annotation principle.
