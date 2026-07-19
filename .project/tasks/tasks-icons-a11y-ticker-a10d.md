---
plan: plan-icons-a11y-ticker-2026-07-19-2584.md
generated: 2026-07-19
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Tooltip stacking fix (feedback F005)

- [x] T001 [artifacts: constitution, ui] Test-first fix for the tooltip
  z-index bug: Bar tooltips (`client/src/components/Button.svelte`'s
  Tooltip) render underneath the alphaTab tab view during Playback. Red
  CT first (assert the tooltip element's resolved stacking places it
  above the alphaTab container / is actually visible when the tab
  surface is present), then fix — raise the tooltip's z-index above the
  alphaTab surface or portal it out of the Bar's stacking context;
  check the lyrics overlay's layering isn't broken by the fix (ticker
  still above tab, tooltip above both). Client CT green.

## Phase 2: Icon swaps (feedback F001/F002/F004)

- [x] T002 [artifacts: ui, brand] Icon reassignment, test-first (CT
  assertions on the rendered icon per control): Leave/End session
  changes from `log-out` to lucide `bone` (use the closest
  fracture-styled lucide variant if one exists — check the installed
  lucide set; plain `bone` is the accepted default; intent: "breaking
  up the band"); the account menu's Sign out action gets `log-out`;
  Sign in gets `log-in`; the Settings control changes `cog` →
  `settings`. Update tooltips/labels to stay accurate. Update any CT
  specs asserting the old icons.
- [x] T003 [artifacts: ui] Replace the "HOST" text badge in the
  participant list (and anywhere else the host is marked) with a crown
  icon (lucide `crown`), test-first. Keep an accessible name so the
  host designation is still announced (coordinate with Phase 4's
  audit — at minimum aria-label="Host" or visually-hidden text now).

## Phase 3: Lyrics toggle + ticker position + desktop sizes

- [x] T004 [artifacts: ui] F006 (confirmed reversal): make the Bar's
  "Toggle lyrics" control always visible; disabled (not absent) when no
  ticker is available — song has no lyrics track, or the participant is
  on the tab-less Lyrics part — with a tooltip + aria reason (e.g. "No
  lyrics for this song" / "Lyrics part shows the full sheet").
  Test-first CT: enabled with lyrics+instrument part; disabled with
  reason in both unavailable cases; never absent. Then revise ui.md's
  Playback View text (the "absent entirely for a participant on the
  tab-less Lyrics part" decision → always-visible-but-disabled with
  reason; note the reversal source: feedback
  feedback-icon-refresh-a11y-39d8 F006) and stamp `last_updated`.
- [x] T005 [artifacts: ui] Feature `lyrics-ticker-position-preference`,
  test-first: create `client/src/lyrics-ticker-position-preference.ts`
  (top | bottom, default bottom, persisted client-side — mirror
  `lyrics-ticker-font-size-preference.ts`), a Preferences-tab control
  for it, and apply the position in the ticker's placement
  (`lyrics-overlay.ts` — fixed to top vs bottom of viewport). CT: pref
  round-trip, control renders, overlay carries the position class/style
  for both values.
- [ ] T006 [artifacts: ui, brand] F007, test-first where practical:
  scale the ticker font-size steps up substantially on desktop
  viewports — media query (~1024px breakpoint) raising the four step
  values to roughly 1.5–2× their current rem sizes (exact values are
  visual judgment; keep small-screen values roughly unchanged; keep
  the steps clearly distinct per ui.md). CT/unit: assert the
  breakpoint styles exist/apply (e.g. computed size differs across
  viewport sizes in CT). Flag the chosen values in the T009 live check
  for user eyeballing.

## Phase 4: Accessibility sweep (feedback F003)

- [ ] T007 [artifacts: ui] Audit every icon-only control and status
  icon across the Bar, settings modal (incl. TrackRow's mute buttons),
  part picker, participant list (crown), and account menu: each
  icon-only control gets an aria-label (tooltip/title complements, not
  substitutes); decorative icons get aria-hidden with adjacent/SR-only
  text where the meaning must still be announced. Test-first: CT
  assertions that every iconOnly Button instance has a non-empty
  accessible name (a sweep-style CT helper is fine), plus targeted
  checks for the crown and disabled lyrics-toggle reason.
- [ ] T008 [artifacts: ui] Revise ui.md: add a short accessibility rule
  to the components/Bar description (icon-only controls always carry
  an accessible name; tooltips complement; status icons announced) so
  the standard is recorded, not just implemented (feedback F003).
  Stamp `last_updated`. No code.

## Phase 5: Live verification + close-out

- [ ] T009 Live verification in a real browser (own server+client on
  non-default ports, scratch public catalog; clean up after):
  (a) tooltips visible over the rendered tab during Playback;
  (b) icons — bone on Leave session, log-out/log-in in the account
  menu, settings icon, crown on the host row; (c) lyrics toggle
  present-but-disabled on a no-lyrics song and on the Lyrics part,
  enabled otherwise; (d) ticker position pref moves the ticker to the
  top and back, persisting across reload; (e) desktop font sizes —
  screenshot the four steps at a desktop viewport for user eyeballing
  (record the chosen rem values in the note); (f) VoiceOver/accessible-
  name spot check via the accessibility tree for 3-4 controls. Record
  all outcomes in a tasks-file note.
