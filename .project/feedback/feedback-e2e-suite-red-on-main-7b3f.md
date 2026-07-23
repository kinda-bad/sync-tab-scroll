---
status: planned
created: 2026-07-20
---

# Feedback

Context: surfaced incidentally during
`tasks-tempo-stable-drift-threshold-d00e.md`'s T005 verification run. The
implementing agent checked whether the e2e failure it hit was caused by
its own change, found the same failure on the baseline commit, and
reported it rather than working around it. Not caused by the threshold
conversion.

## Bugs

- [x] F001 **The Playwright e2e suite is red on `main`, and has been for
  an unknown period.** `client/e2e/host-controls.spec.ts` — the
  Start/Pause/Resume/Stop-reflected-to-a-member spec — fails identically
  on baseline `cc23caa` and on the threshold-conversion branch. The
  failure is **timeout-shaped**, not an assertion mismatch, which usually
  points at the harness (webServer startup, port binding, a hung
  navigation) rather than at product behavior.

  **Why this matters more than one failing spec.** `host-controls` is the
  most sync-sensitive e2e in the repo: it is the closest automated proxy
  for "does a host action actually reach a participant". A red e2e suite
  is a verification blind spot rather than a cosmetic annoyance — every
  future "full suite green" claim silently excludes whatever this spec
  covers, and a genuine sync regression would land unnoticed. Two plans
  now in flight (`plan-recording-drift-foundation-2026-07-20-9ca3.md`
  Phase 5, and the just-completed threshold conversion) lean on e2e as
  their end-to-end evidence, so this undermines their strongest checks.

  **Wanted:** determine whether this is environmental (a harness/config
  problem that a correctly-configured run would pass) or a real product
  regression, and either fix it or record explicitly what is broken and
  why the suite may be run red in the meantime. Establishing *when* it
  started (the suite passed on 2026-07-19 per that day's
  explicit-readiness run notes, so the window is narrow) is probably the
  cheapest first step.

  Note also: `client/src/recording-drift.ct.spec.ts` is an *intentional*
  `test.fail()` from the recording-drift diagnosis and exits 0 — do not
  confuse it with this failure when triaging.

## Reconsidered

- [x] F002 **A "full suite green" claim should not be reportable while a
  tier of the suite is known-red.** This session repeatedly treated
  "tests pass" as verification evidence — including, at the user's
  decision, as the basis for closing
  `tasks-tempo-stable-drift-threshold-d00e.md`'s T006 live-verification
  task without a live check. That reasoning is materially weaker if a
  whole tier is failing and excluded by habit rather than by decision.

  Wanted: a convention for what "green" means when a tier is red —
  minimally, that a run reporting suite results must state which tiers
  actually ran and which are known-red, so the phrase cannot quietly
  overstate its coverage. Whether that belongs in `constitution.md`'s
  Quality Standards (alongside the existing deterministic-gates
  expectations) or stays a working practice is the decision to make.
  `[artifacts: constitution]`
