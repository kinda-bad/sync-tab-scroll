# Defects

_Last verified: 2026-07-02_

## ui.md

- **Claim:** Playback View — "Host controls start/pause/resume/seek; a count-in countdown can precede playback start. The host's view exposes seek (click-to-position) when paused; participants' views don't."
  **Actual:** Only `start` is wired anywhere in the client — a single host-only "Start" button in `Lobby.svelte` sending `{ type: 'playback-control', action: 'start' }`. No UI anywhere sends `pause`, `resume`, or `seek`; the only place `api.pause()` is ever called client-side is inside `correctDrift()` (`client/src/playback-sync.ts:23`), which is passive drift correction reacting to a server broadcast, not a user-triggered control. There's no count-in toggle UI either, though `Session.countInEnabled` exists and `playback-sync.ts` does wire `api.countInVolume` from it. The server-side handler (`server/src/handlers/playback-control.ts`) fully supports all four actions — this is a client-UI gap only.
  **Location:** `client/src/views/Lobby.svelte`, `client/src/views/Playback.svelte` (no pause/resume/seek/count-in controls in either)
  **Severity:** broken-contract

## infrastructure.md

- **Claim:** Tab Rendering's code sample sets alphaTab's resource colors to CSS custom-property strings: `r.mainGlyphColor = 'var(--tab-foreground)'`, `r.staffLineColor = 'var(--tab-ruling-dim)'`, etc.
  **Actual:** `tab-renderer.ts`'s `applyThemeColors()` assigns `at.model.Color` instances (RGBA objects from `client/src/brand-colors.ts`'s `darkTabColors`/`lightTabColors`) directly — `resources.mainGlyphColor = colors.foreground`, etc. — switched by a `theme: 'dark' | 'light'` parameter passed into `createTabRenderer`/`setTheme`. No CSS custom properties are involved in alphaTab's resource colors at all; `RenderingResources` fields are typed as `Color`, not strings, so the documented sample wouldn't even compile as written. This section predates the dark/light theme-toggle implementation and was never updated to match it.
  **Location:** `client/src/tab-renderer.ts:13-21` (`applyThemeColors`), `client/src/brand-colors.ts`
  **Severity:** broken-contract

- **Claim:** "Font & Worker Setup" — "Two more implementation-verified deviations from what the render-settings block above might suggest at a glance" (lists only: the Vite plugin/font-directory substitute, and `core.useWorkers = false`).
  **Actual:** There's a third, undocumented deviation: `settings.core.scriptFile` is set to `/alphaTab.worker.js` (a classic, non-ESM script served as a static asset), because — per the code's own comment — "alphaTab's audio player spawns its own worker independent of `core.useWorkers` (which only controls the render worker) and needs a classic script it can load." This is a distinct root cause from the render-worker issue that's the only one currently documented.
  **Location:** `client/src/tab-renderer.ts:46-51`
  **Severity:** drift

- **Claim:** (implicit, via Overview's "requiring a SoundFont asset (multi-MB) that the client loads for playback") — no code sample or explicit statement of the actual player settings.
  **Actual:** `settings.player.enablePlayer = true` and `settings.player.soundFont = '/soundfont/sonivox.sf2'` are set in `tab-renderer.ts`, with a code comment explaining the choice ("using the Apache-2.0-licensed Sonivox soundfont alphaTab ships, rather than sourcing/licensing a separate one") that has no home in the artifact at all.
  **Location:** `client/src/tab-renderer.ts:68-69`
  **Severity:** cosmetic

- **Claim:** (implicit, via "Session & Real-Time Sync") — describes periodic `PlaybackState` broadcasts and drift correction, but doesn't mention that a closed socket broadcasts updated `connectionStatus` immediately.
  **Actual:** `server.ts`'s `close` handler broadcasts `session-state` to the remaining session right after marking a participant disconnected (added this session, to fix stale connectivity info) — a real, current behavior with no textual home in the artifact.
  **Location:** `server/src/server.ts:52-58`
  **Severity:** cosmetic

## constitution.md

- **Claim:** Principle VI (Named Types Over Inline Duplication) — "A type used in more than one place must be a named type with a single source of truth — not independently retyped at each usage site."
  **Actual:** `Playback.svelte` declares `let theme: 'dark' | 'light' = 'dark';` — an inline retyping of `tab-renderer.ts`'s exported `Theme` type (`export type Theme = 'dark' | 'light';`, also used in `playback-engine.ts`) instead of importing it. This is the exact pattern the principle prohibits; it predates the principle being written (added earlier this session) and the codebase wasn't swept afterward.
  **Location:** `client/src/views/Playback.svelte:5` (should be `import type { Theme } from '../tab-renderer'`)
  **Severity:** drift

- **Claim:** Principle II (No Dead Architecture) — "When an approach is replaced, the old approach is deleted in the same change."
  **Actual:** `client/src/brand-colors.ts`'s `darkTabColors.geometry` and `lightTabColors.geometry` fields are unused dead code — nothing in the codebase reads `.geometry` anywhere. They're a leftover of the originally-planned 3-way `mainGlyphColor` split (bright fret-number text / dim strokes / pink bend-slur geometry) that `infrastructure.md`'s "Revised during implementation" note and `brand.md` both explicitly say was abandoned in favor of one flat value, since alphaTab's SVG output carries no per-glyph-type class to target. The fields were never removed when that plan was reverted.
  **Location:** `client/src/brand-colors.ts:7,16`
  **Severity:** drift
