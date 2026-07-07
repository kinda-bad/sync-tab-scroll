# Defects

_Last verified: 2026-07-07_

Full unscoped pass across all artifacts (constitution, datamodel,
infrastructure, ui, pipeline, brand), refreshing the 2026-07-06 pass —
this time also covering the theme system, the full-lyrics-sheet redesign,
the gap-timing indicator, and the Preferences tab UI for the first time,
none of which had been checked against code before.

**Confirmed clean this pass** (verified directly against code, not
assumed): all four theme token blocks (`tokens.css`) match `brand.md`'s
tables exactly; all motif gating (`.torn-edge`/`.hazard-stripes`/
`.signature-tape`/`.gap-drain-tape` riot-only, `.signature-glitch`/
`.glitch-cut-edge`/`.led-marquee`/`.gap-drain-led`/`.glitch-text`
cyberpunk-only) matches `brand.md`'s claims; `client/src/lyrics-gap-
timing.ts` correctly derives local tempo from `score.masterBars`'
`tempoAutomations` rather than `CatalogSong.bpm`, matching `ui.md`'s
claim, and neither `ui.md` nor `brand.md` references the nonexistent
`api.tickPositionToTimePosition()` method the implementing plan
originally specified (the artifacts were already worded generically);
the full-lyrics sheet's immediate population, active-line highlighting,
and `scrollIntoView`-based auto-scroll (respecting `prefers-reduced-
motion`) match `ui.md`; the gap-indicator's 4 dots + drain bar and
`--gap-fill` mechanism match both `ui.md` and `brand.md`'s "separate
element, not a second `HazardBar`" claim; the Preferences tab's two
orthogonal controls (`themeFamily`/`themeMode` derived from one stored
value) match `ui.md`; and `README.md`'s `.gp`-ingestion CLI usage, the
`pnpm --filter` cwd gotcha, and the Chrome port-6000 claim all check out
against the real scripts/config.

## datamodel.md

- **Claim:** `CatalogPart.trackIndex`'s note describes percussion status
  as read from the track's own parsed data via
  `track.percussionArticulations`/instrument metadata.
  **Actual:** the actual code path is the plain `track.isPercussion`
  boolean (`client/src/tab-renderer.ts:111,144`), not articulations/
  instrument metadata. `infrastructure.md`'s copy of this same claim was
  fixed in a prior pass; this artifact's independent copy was not in that
  pass's scope and still carries the stale wording.
  **Location:** `client/src/tab-renderer.ts:111,144`
  **Severity:** cosmetic

## constitution.md

- **Claim:** Principle VIII requires the `.env`/`.env.example` key-parity
  lint to run "both pre-commit and in CI."
  **Actual:** The pre-commit half is implemented
  (`scripts/check-env-parity.mjs`, wired into `.githooks/pre-commit`). No
  CI provider or workflow exists anywhere in the repo — `.github/
  workflows/` is absent (confirmed this pass). A git remote (`origin`)
  exists, so the CI half is unmet for its own sake now (no provider
  chosen/configured), not because there's nowhere to run it.
  **Location:** repo root (`.github/workflows/` absent)
  **Severity:** drift (pre-existing, explicitly deferred — see
  `STATUS.md`'s recommended next steps)

No defects found in `ui.md`, `infrastructure.md`, `pipeline.md`, or
`brand.md` this pass.
