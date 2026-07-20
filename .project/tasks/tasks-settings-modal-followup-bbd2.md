---
plan: plan-settings-modal-followup-2026-07-04.md
generated: 2026-07-04
status: completed
# Corrected 2026-07-20. This carried the invalid status `superseded`
# (a *plan* status, not a tasks-file one) with the note "do not
# implement" — but all 6 tasks are checked and the work is verifiably in
# the codebase: `SettingsModal.svelte` contains both T003's exact hint
# text ("Spotlight mode forces every participant's view to follow the
# lobby cursor") and T002's "Playback audio" section label. The plan was
# superseded, but this tasks file was implemented anyway before that
# happened. `completed` is the truthful terminal state; `abandoned`
# (which the linter suggested) would misrepresent shipped work as
# dropped.
---

# Tasks

## Phase 1: Test first, then split the control row

- [x] T001 [artifacts: ui] In `client/src/components/SettingsModal.ct.spec.ts`, add a new test "shows a Spotlight-mode hint under the Lobby cursor group" that mounts the harness as host and asserts a hint paragraph containing the text "Spotlight mode forces every participant's view to follow the lobby cursor" is visible. Confirm this test fails against the current markup (no such hint exists yet) — Principle VII (constitution.md).
  - Done. Written first, confirmed red (no such hint existed), then made green by T002/T003.
- [x] T002 [artifacts: ui] In `client/src/components/SettingsModal.svelte`, split the single `.cursor-controls` div (lines 97-116) into two sibling groups within the existing `{#if isHost}` block: keep the tick `<input>`, "Set lobby cursor", "Clear", and "Spotlight mode" toggle in the existing `.cursor-controls` row (now only 4 controls); add a new `<span class="section-label">Playback audio</span>` immediately after, followed by a new `.cursor-controls`-styled row (reuse the class — same `display: flex; gap: var(--space-2); align-items: center` need, no new CSS rule required) containing only the Metronome and Count-in `Button`s, moved out of the first row.
  - Done as specified.
- [x] T003 [artifacts: ui] In the same file, add a `<p class="hint">` directly under the first ("Lobby cursor") group's controls, host-only (inside the same `{#if isHost}` block), with the exact copy: "Spotlight mode forces every participant's view to follow the lobby cursor. Off: it's just a marker — cursor position and Spotlight state both reset when playback starts." Run T001's test and confirm it now passes.
  - Done, exact copy used. T001 now passes.
- [x] T004 Run `pnpm --filter client test:ct` scoped to `SettingsModal.ct.spec.ts` and confirm all existing tests (Metronome/Count-in visibility and click-handler tests) still pass unchanged — they use `getByText` selectors, which aren't affected by which row/section an element sits in, but confirm this empirically rather than assuming it.
  - Confirmed: 12/12 pass (10 pre-existing + T001's new hint test + lobby-cursor-race's earlier debounce test), no regressions.

## Phase 2: Artifact revision

- [x] T005 [artifacts: ui] Revise `ui.md`'s Participants-tab description (lines ~110-131) to describe two separate control groups instead of one row: "Lobby cursor" (tick input, Set, Clear, Spotlight-mode toggle, plus the new in-UI hint explaining the Spotlight/lobby-cursor relationship) and "Playback audio" (Metronome, Count-in toggles) — note the in-UI hint now carries the Spotlight-mode explanation directly, reducing (not eliminating) reliance on this artifact as the only place that relationship is explained. Bump `last_updated` to 2026-07-04. Leave `diagram_status` as currently set — this is a layout-only change, no new view/state introduced.
  - Done. `last_updated` was already `2026-07-04` from an earlier task in this same worktree session; `diagram_status` left as `stale` (unchanged, already set by that earlier task).

## Phase 3: Full regression

- [x] T006 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client typecheck` (or the project's equivalent typecheck command). Confirm no regressions. Report final test/file counts.
  - `pnpm --filter client test`: 8 files, 31 tests, all pass. `pnpm --filter client test:ct`: 37 tests, all pass. `pnpm --filter client check` (this project's typecheck script): clean, no errors.
