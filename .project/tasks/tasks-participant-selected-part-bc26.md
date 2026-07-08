---
plan: plan-participant-selected-part-2026-07-07.md
generated: 2026-07-08
status: completed
---

# Tasks

## Phase 1: Part-label derivation
- [x] T001 [artifacts: ui] Write a CT test in
  `client/src/components/SettingsModal.ct.test.ts` (or the existing CT
  test file covering the Participants tab, if one already exists — check
  first) asserting the Participants tab's `ListRow` sublabel content for
  four cases: (a) a non-host participant with an instrument part selected
  shows the instrument's `instrumentName` (e.g. "Lead Guitar"); (b) a
  participant with `selectedPart === 'lyrics'` shows "Lyrics"; (c) the
  host with a part selected shows `"HOST · <part>"`; (d) a participant
  with `selectedPart === null` shows no part text (sublabel is `"HOST"`
  only, or omitted entirely, matching today's no-part behavior). Run the
  test and confirm it fails (red) before any implementation — this
  project follows TDD (constitution Principle VII).
- [x] T002 [artifacts: ui] In `client/src/components/SettingsModal.svelte`,
  inside the Participants tab's `{#each session.participants as p (p.id)}`
  loop, add a `partLabel` derivation matching
  `client/src/views/Playback.svelte`'s existing `currentPartLabel` logic:
  `p.selectedPart === 'lyrics' ? 'Lyrics' : session.availableParts.find(ap
  => ap.trackIndex === p.selectedPart)?.instrumentName`, yielding
  `undefined` when `p.selectedPart === null`.
- [x] T003 [artifacts: ui] In the same loop, combine `partLabel` with the
  existing `p.role === 'host' ? 'HOST' : undefined` into a single
  `sublabel` value passed to `ListRow`: `"HOST · <part>"` when both are
  present, just `"HOST"` or just `<part>` when only one is present, and
  `undefined` when neither applies — replacing the current inline
  `sublabel={p.role === 'host' ? 'HOST' : undefined}` expression. Run
  T001's test and confirm it now passes (green).

## Phase 2: Verification
- [x] T004 Run the full client test suite (`pnpm --filter
  @sync-tab-scroll/client test` and `pnpm --filter @sync-tab-scroll/client
  test:ct`) and confirm no regressions in other Participants-tab or
  Settings-modal coverage (e.g. existing "Make host"/"Remove"/pending-
  request row tests, which also render `ListRow` sublabels).
