---
status: approved     # draft -> approved -> superseded
branch: worktree-ui-improvements
created: 2026-07-04
features: []
---

# Plan: Small-screen UI adaptation + settings modal semantic redesign

## Goal

Make the app genuinely usable on phone-sized screens (readable tab, no
horizontal scrolling anywhere, modals that fit) and redesign the settings
modal into semantically coherent tabs — including the confirmed reversal
of the metronome from a host-forced session setting to a personal
per-participant one.

## Scope

**In scope**:
- Mobile viewport foundation: `client/index.html` currently has **no
  `<meta name="viewport">` tag** — confirmed by inspection; this is the
  root cause of the "everything is tiny, must pinch-zoom" complaint
  (mobile browsers lay the page out at ~980px virtual width and shrink
  it). Adding it, then making every view actually work at real phone
  widths (360–430px CSS px).
- Responsive modal shell (`Modal.svelte`: `max-width: 32rem` with no
  small-screen clamp today) and both modal contents (`SettingsModal`,
  `SongPartModal`): vertical scroll within the modal is acceptable;
  horizontal scroll is never acceptable.
- Tab notation readability on small screens (alphaTab
  `settings.display.scale`, container padding — check alphaTab's own
  responsive idioms first, constitution Principle V).
- Settings modal redesign: semantic tabs (up to 4), designed with the
  **frontend-design skill** per the feedback's approach note. Folds in
  the superseded `plan-settings-modal-followup-2026-07-04.md`'s work:
  splitting the overcrowded lobby-cursor control row, the Spotlight-mode
  hint copy, and its test updates.
- Metronome per-participant (user-confirmed override, 2026-07-04):
  remove `Session.metronomeEnabled`, the `metronome-set` message, and
  its server handler; metronome becomes a client-local personal
  preference. Artifact revisions to `datamodel.md`, `infrastructure.md`,
  `ui.md`.
- A frontend-design pass over the remaining views at small widths
  (landing, lobby, playback incl. lyrics ticker/full-lyrics view, the
  persistent Bar and HazardBar).
- `ui.md` revisions documenting the responsive behavior and the new
  settings-tab structure.

**Not in scope**:
- Count-in stays a host-controlled session-wide setting (it gates
  playback start for everyone — inherently shared; only the metronome
  was reconsidered).
- No changes to brand identity (`brand.md` palettes, typography, motion)
  — this is layout/structure, not look-and-feel redirection.
- No native-app/PWA work; this is responsive web only.

## Technical Approach

**Why metronome becomes client-local, not per-`Participant` server
state**: metronome audio is generated locally by each participant's own
alphaTab instance (`api.metronomeVolume`, `client/src/playback-sync.ts`).
No other participant's behavior depends on whether mine clicks, so the
server has no reason to know. The minimal correct design is a personal
preference stored client-side (persisted like the theme choice,
`client/src/theme.ts` pattern) and applied directly to the local alphaTab
instance — a *removal* of schema/message/handler surface
(`Session.metronomeEnabled`, `metronome-set` in
`packages/shared/src/messages.ts`, `server/src/handlers/metronome-set.ts`,
its `dispatch.ts` case), not a relocation of it into `Participant`. This
satisfies constitution Principle II (no dead architecture) — the
session-level plumbing would otherwise remain with no consumer.

**Settings modal tab structure** (to be validated during the
frontend-design pass; up to 4 tabs allowed, 3 proposed):
1. **Participants** — the live participant list, readiness, Host
   Transfer controls. (Unchanged semantics.)
2. **Session** — host-controlled, broadcast-to-everyone controls: lobby
   cursor set/clear + tick readout, Spotlight mode (with the
   folded-in hint copy explaining the Spotlight/cursor relationship and
   playback-start reset), and Count-in. Visible read-only/hidden for
   non-hosts per existing per-control rules.
3. **Preferences** — personal, this-device-only settings: theme toggle
   and the new local metronome toggle (every participant sees this,
   not just the host).

This preserves `ui.md`'s established semantic split (session-wide
broadcast vs. personal preference) while giving each cluster room —
the exact thing the old two-tab structure crammed into one tab.

**Responsive strategy**: add the viewport meta first (Phase 1), which
makes phone widths real — then fix what breaks, view by view, using
`@media (max-width: …)` sparingly and preferring intrinsically fluid
layout (flex-wrap, `min()`/`clamp()`, `max-width: 100%`) so most
components need no breakpoints at all. Modals get
`width: min(32rem, calc(100vw - 2rem))` plus a `max-height` with
`overflow-y: auto`. Playback's alphaTab container gets a small-screen
`display.scale` bump (alphaTab renders SVG; scale is its supported
zoom idiom) — verify the native cursor overlay and lobby-cursor overlay
still align after a scale change, and that the lyrics ticker's DOM
measurement centering still holds.

**Testing**: constitution Principle VII (test-first). Playwright CT
specs updated/added ahead of each behavioral change
(`SettingsModal.ct.spec.ts`, harness). Server handler removal is
test-first too (delete/replace `metronome-set.test.ts` expectations
before the handler). Small-screen layout claims verified with
Playwright viewport-sized runs (e.g. 390×844) asserting no horizontal
overflow on each view.

## Phase Breakdown

### Phase 1: Viewport foundation + responsive modal shell
- [ ] T-A1 Add `<meta name="viewport" content="width=device-width, initial-scale=1" />`
  to `client/index.html`.
- [ ] T-A2 [feedback: 69bb "modals horizontal scroll"] Make `Modal.svelte`
  responsive: width clamp, max-height, internal vertical scroll,
  `overflow-x` never scrolls. CT spec at phone viewport first.
- [ ] T-A3 [feedback: 69bb "not adapted to small views"] Audit + fix the
  app shell at 360–430px: Bar, HazardBar, toasts, landing forms, lobby
  hint line. Playwright viewport assertions: no horizontal overflow.

### Phase 2: Tab readability on small screens
- [ ] T-B1 [feedback: 69bb "tab too small"] Small-screen alphaTab
  `display.scale` handling in `tab-renderer.ts` (check alphaTab idioms
  first, Principle V); verify cursor overlays and lobby-cursor overlay
  alignment, and lyrics-ticker centering, post-scale.
- [ ] T-B2 Verify/fix the full-lyrics view and lyrics ticker at phone
  widths.

### Phase 3: Settings modal semantic redesign (frontend-design skill)
- [ ] T-C1 [artifacts: ui] [feedback: 69bb "settings categorization",
  d914 UX item] Run the frontend-design skill pass; restructure
  `SettingsModal.svelte` into the Participants / Session / Preferences
  tabs above (adjust names/count during the pass, ≤4), folding in the
  superseded followup plan's control-row split and Spotlight hint copy.
  Tests first (`SettingsModal.ct.spec.ts` + harness), including a
  no-horizontal-overflow assertion at phone width.
- [ ] T-C2 [artifacts: ui] Revise `ui.md`'s settings-modal section for
  the new tab structure and in-UI Spotlight hint.

### Phase 4: Metronome per-participant (confirmed override)
- [ ] T-D1 Server/shared: remove `metronome-set` message, handler,
  dispatch case, and `Session.metronomeEnabled` (tests first).
- [ ] T-D2 Client: local metronome preference (persisted alongside the
  theme-choice pattern), applied via `api.metronomeVolume`; toggle in
  the Preferences tab for every participant. CT spec first.
- [ ] T-D3 [artifacts: datamodel, infrastructure, ui] Revise all three
  artifacts: drop `Session.metronomeEnabled` and the message; document
  metronome as a client-local personal preference; update `ui.md`'s
  "host-controlled session settings" prose (count-in only now) and
  `spotlightMode`'s "same pattern as" note in `datamodel.md`.

### Phase 5: Full small-screen design pass + artifact sync
- [ ] T-E1 [feedback: 69bb "frontend-design pass"] Frontend-design skill
  pass over landing, lobby, song/part modal, playback at phone widths —
  both themes, `prefers-reduced-motion` respected.
- [ ] T-E2 [artifacts: ui] Document the responsive/small-screen behavior
  in `ui.md` (new subsection); bump frontmatter, `diagram_status: stale`.

Dependencies: Phase 1 first (viewport meta changes what "small screen"
even means for every later check). Phases 2–4 independent of each other
after Phase 1; Phase 5 last.

## Complexity Tracking

None — the plan removes more architecture than it adds (session-level
metronome plumbing deleted; no new components, stores, or abstractions).

## Open Questions

- Exact tab names/count for the settings modal — proposed 3 (Participants
  / Session / Preferences); the frontend-design pass may adjust within
  the ≤4 budget. Not blocking.
- Whether the small-screen alphaTab scale should be user-adjustable
  (pinch/setting) or a fixed responsive default. Start fixed; revisit
  only if the fixed default proves wrong in live use.

## Production Annotation Summary

None — no shortcuts introduced by this plan.
