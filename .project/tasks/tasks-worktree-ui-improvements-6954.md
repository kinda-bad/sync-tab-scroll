---
plan: plan-worktree-ui-improvements-2026-07-04.md
generated: 2026-07-04
status: in-progress   # generating -> ready -> in-progress -> completed
---

# Tasks

Constitution Principle VII (Test-First Development) applies: each
behavioral task's test lands (and fails) before the implementation.
Pure-CSS/layout tasks are verified by Playwright viewport assertions
rather than unit tests.

## Phase 1: Viewport foundation + responsive modal shell

- [x] T001 [artifacts: constitution, ui] Add failing Playwright coverage
  for phone-width layout: a shared helper asserting no horizontal
  overflow (`document.documentElement.scrollWidth <=
  document.documentElement.clientWidth`, and same for `document.body`)
  at phone size, applied in `client/e2e/` to the landing view, lobby
  (with settings modal open and song/part modal open), and playback
  view. **Important (adviser-verified):** both Playwright projects use
  `devices['Desktop Chrome']` (`client/playwright.config.ts`), and
  desktop Chromium ignores `<meta name="viewport">` entirely — a plain
  390×844 desktop viewport never exercises T002's meta tag. The
  phone-width helper/tests must use mobile emulation (per-test
  `test.use({ ...devices['iPhone 13'] })` or equivalent with
  `isMobile: true`) so the meta tag is actually observable. Land
  T001+T002 together.
- [ ] T002 Add `<meta name="viewport" content="width=device-width, initial-scale=1" />`
  to `client/index.html` `<head>`. This is the root fix for "everything
  tiny on phone" (no viewport meta → ~980px virtual layout width).
- [ ] T003 [artifacts: ui, brand] Make the modals fit phone widths.
  Adviser-verified state of `client/src/components/Modal.svelte`: it
  already has `max-height: 80vh` and `.modal-body { overflow-y: auto }`,
  and the backdrop's `padding: var(--space-4)` + `width: 100%` already
  clamp the shell to viewport width — the real horizontal-overflow
  culprits are **non-wrapping children**, chiefly `SettingsModal.svelte`'s
  6-control `.cursor-controls` flex row (lines 160-164, no `flex-wrap`).
  So: keep/verify the shell clamp (a `width: min(32rem, calc(100vw - 2rem))`
  tidy-up is fine), prefer `100dvh` over `vh` for mobile URL-bar
  correctness, and fix child layouts to wrap/fit (the `.cursor-controls`
  row gets properly restructured in T008 — here just ensure no modal
  child forces horizontal scroll at 390px). T001's modal-open assertions
  go green.
- [ ] T004 [artifacts: ui, brand] Audit and fix the app shell at
  360–430px CSS widths: persistent Bar (`Bar.svelte`) contents must wrap
  or truncate rather than overflow, `HazardBar.svelte`, `Toasts.svelte`,
  the landing view's create/join forms, and the lobby hint line. T001's
  remaining assertions go green. Preserve brand.md's torn-edge/hazard
  motifs — this is layout only, no visual-identity changes.

## Phase 2: Tab readability on small screens

- [ ] T005 [artifacts: ui, infrastructure, constitution] Small-screen tab
  scale in `client/src/tab-renderer.ts`: first check alphaTab's own
  responsive idioms (Principle V — `settings.display.scale` is the
  supported zoom mechanism; check also layout/`scale` interactions with
  `LayoutMode.Page`) and pick a scale bump for narrow viewports (e.g.
  scale up when `window.innerWidth` is under a threshold, chosen so
  fret numbers are legible on a ~390px screen without pinch-zoom).
  Playwright CT test first (the CT harness with real rendering exists —
  see `client/src/playback-engine.ct.spec.ts` pattern): assert rendered
  glyph/font size or scale setting at a phone viewport. After
  implementation, verify alphaTab's native cursor overlay
  (`.at-cursor-bar`/`.at-cursor-beat`) and the lobby-cursor overlay
  still align with the scaled notation, and that no horizontal overflow
  is introduced.
- [ ] T006 [parallel] [artifacts: ui] Verify/fix the lyrics surfaces at
  phone widths: the bottom lyrics ticker (its DOM-measurement centering
  — `offsetLeft`/`offsetWidth` — must still center the active syllable
  after any scale/width change; it recomputes on window resize) and the
  full-lyrics (lyrics-part) view's large-font line display. E2E/CT
  assertions at 390px width.

## Phase 3: Settings modal semantic redesign (frontend-design skill)

- [ ] T007 [artifacts: ui, constitution] Update
  `client/src/components/SettingsModal.ct.spec.ts` (and
  `SettingsModalHarness.svelte` as needed) FIRST for the new three-tab
  structure — **Participants** (participant list, readiness, Host
  Transfer controls; unchanged semantics), **Session** (host-broadcast
  controls: lobby-cursor tick input + Set/Clear, Spotlight toggle with
  new hint copy, Count-in toggle), **Preferences** (personal: theme
  toggle, plus the T011 metronome toggle) — including: the Spotlight
  hint text renders for the host ("Spotlight mode forces every
  participant's view to follow the lobby cursor. Off: it's just a
  marker — cursor position and Spotlight state both reset when playback
  starts."), Session-tab host-only visibility rules match today's
  per-control rules, and a no-horizontal-overflow assertion at a 390px
  viewport. Tests fail against the current two-tab modal.
- [ ] T008 [artifacts: ui, brand] Invoke the **frontend-design skill**
  and restructure `client/src/components/SettingsModal.svelte` to the
  three tabs above (tab names/count may be adjusted during the design
  pass within the ≤4 budget — update T007's specs in the same commit if
  so). Fold in the superseded followup plan's work: the old single
  `.cursor-controls` row is split into labeled groups (lobby-cursor
  controls vs. audio), the hint copy lands under the Spotlight group.
  Layout must be easy to use and good-looking at both phone and desktop
  widths, vertical scroll OK, never horizontal; both themes; respect
  `prefers-reduced-motion`. T007 goes green.
- [ ] T009 [artifacts: ui] Revise `ui.md`'s settings-modal section
  (currently "two tabs": Participants/Settings) to describe the new tab
  structure, which controls live where and their host-visibility rules,
  and note the Spotlight hint is now in-UI copy. Bump `last_updated`,
  set `diagram_status: stale`.

## Phase 4: Metronome per-participant (user-confirmed reversal, 2026-07-04)

- [ ] T010 [artifacts: datamodel, infrastructure, constitution] Remove
  the session-level metronome plumbing, tests first: update/remove
  `server/src/handlers/metronome-set.test.ts`, then delete
  `server/src/handlers/metronome-set.ts`, its `dispatch.ts` import/case,
  the `{ type: 'metronome-set'; enabled: boolean }` member of
  `packages/shared/src/messages.ts:12`, and `Session.metronomeEnabled`
  from the shared session types (`packages/shared/src/index.ts:72`) and
  `server/src/session-store.ts:38` defaults. Count-in plumbing
  (`count-in-set`) is untouched. Adviser-verified full consumer list to
  update (typecheck backstops, but these are the known set):
  `client/src/playback-sync.ts:81`; `SettingsModal.svelte:39,107-110`
  (sends `metronome-set` — its removal happens naturally in T008's
  rewrite since Phase 3 runs first, see Dependencies) and
  `SettingsModal.ct.spec.ts:17,37-54`;
  `server/src/session-store.test.ts:16` (a behavioral expectation, not
  just a fixture); and fixtures in `client/src/playback-sync.test.ts:87-105`,
  `playback-engine.ct.spec.ts:118`, `ws-client.ct.spec.ts:54`,
  `session-persistence.test.ts:51`, `store.ct.spec.ts:21`. `client/e2e/`
  has zero metronome references.
- [ ] T011 [artifacts: ui, constitution] Client-local metronome
  preference, CT test first: a persisted personal setting following the
  `client/src/theme.ts` localStorage pattern (`persistTheme`/read-back),
  default off (matches the old server default), applied to the local
  alphaTab instance via `api.metronomeVolume` in
  **`applyPlaybackSettings`** (`client/src/playback-sync.ts:80` — note:
  not "applyAudioSettings") where it currently reads
  `session.metronomeEnabled` (count-in keeps reading
  `session.countInEnabled`). Both visible and headless instances flow
  through this single choke point (`playback-engine.ts:139`), so one
  edit covers both. Toggle rendered in the Preferences tab for
  **every** participant (not host-gated), effective immediately without
  restart, surviving refresh.
- [ ] T012 [artifacts: datamodel, infrastructure, ui] Artifact
  revisions for the reversal: `datamodel.md` — drop `metronomeEnabled`
  from the `Session` table and fix `spotlightMode`'s "same pattern as
  `metronomeEnabled`/`countInEnabled`" note (now `countInEnabled` only);
  `infrastructure.md` — adviser-verified it contains **no** metronome
  mention at all (no message-inventory entry to remove); only add a
  brief note that metronome is a client-local preference if a natural
  place exists, otherwise skip that file;
  `ui.md` — Session-tab prose says Count-in (only) is host-controlled
  session-wide; Preferences-tab prose gains the personal metronome
  toggle; Playback View's "toggled via `Session.metronomeEnabled`/
  `countInEnabled`" line updated. Bump each file's `last_updated`,
  `diagram_status: stale` where renderable.

## Phase 5: Full small-screen design pass + artifact sync

- [ ] T013 [artifacts: ui, brand] Frontend-design skill pass over the
  remaining views at phone widths (360–430px): landing chooser + forms,
  lobby, `SongPartModal.svelte` (catalog list + part picker), playback
  view chrome. Both themes, `prefers-reduced-motion` respected, no
  horizontal overflow anywhere (T001 helper reused for any new
  assertions). Layout/spacing/type-scale refinement only — brand.md's
  palette, typography roles, and motifs are fixed inputs.
- [ ] T014 [artifacts: ui] Document the app's responsive/small-screen
  behavior in `ui.md` as a new subsection (viewport meta, modal
  scroll-within rules, tab scale behavior, no-horizontal-overflow
  invariant), bump `last_updated`, `diagram_status: stale`.

## Dependencies & parallelism

- T001+T002 land together, before everything else (they define "phone
  width" for the whole plan).
- **Phase 3 runs fully before Phase 4** (adviser correction: they are
  NOT independent — T010's typecheck-clean requirement forces edits to
  `SettingsModal.svelte`/`SettingsModal.ct.spec.ts`, the exact files
  T007/T008 rewrite; running Phase 3 first also gives T011's toggle its
  Preferences tab). Phase 2 is independent of Phases 3–4 after Phase 1.
- Within phases: T007 → T008 → T009; T010 → T011 → T012.
- Phase 5 last — it audits the post-change UI.
- Adviser-flagged cross-plan collisions (for whoever implements the
  other ready tasks files): `tasks-lobby-cursor-race-c9f8.md` edits
  `SettingsModal.svelte`/`.ct.spec.ts` (T007/T008 here rewrite them);
  `tasks-session-lifecycle-836f.md` adds a Bar button (T004 here
  re-lays-out the Bar) and touches `views/Playback.svelte` (T013);
  `tasks-lyrics-pre-singing-e09e.md` edits `lyrics-overlay.ts` (T006).
  Implement this file and those on a shared sequence, not in parallel.
