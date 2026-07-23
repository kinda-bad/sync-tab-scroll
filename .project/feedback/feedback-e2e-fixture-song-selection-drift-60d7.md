---
status: open      # open -> planned
created: 2026-07-23
plan: null        # set to the consuming plan's filename once planned
---

# Feedback

## Bugs
- [ ] F001 While fixing feedback-e2e-suite-red-on-main-7b3f F001 (tasks-c75f-1349.md T023/T024), the diagnosis found `client/e2e/host-controls.spec.ts`'s timeout-shaped failure was environmental: new fixture catalog songs shifted `.first()`-based song-selection order, so the spec was selecting a different song than intended. Fixed there by selecting the fixture song by name instead of position. The same root cause (a `.first()`/positional song-selection assumption that no longer holds against the current fixture catalog) likely affects several other e2e specs that weren't in that task's scope: `host-transfer`, `multi-participant`, `single-participant`, `small-screen`, `song-part-modal`, and `lyrics-only-view`. Worth a dedicated sweep to select fixture songs by name across all of `client/e2e/`.
