# Defects

_Last verified: 2026-07-06_

Full unscoped pass across all artifacts (constitution, datamodel,
infrastructure, ui, pipeline, brand), refreshing the 2026-07-05 pass.
`features.md` is not an artifact this skill checks code against.

## infrastructure.md

- **Claim:** Tab Rendering section's code block/comment describes
  percussion detection as reading `track.percussionArticulations` /
  instrument metadata.
  **Actual:** `client/src/tab-renderer.ts:106,139` reads `track.isPercussion`
  directly — a plain boolean property alphaTab already exposes, not derived
  from articulations/instrument metadata.
  **Location:** `client/src/tab-renderer.ts:106,139`
  **Severity:** cosmetic

- **Claim:** (implicit — no mention) Tab Rendering's render-settings code
  block doesn't mention any viewport-responsive scaling.
  **Actual:** `settings.display.scale` is set from `tabScaleForViewportWidth
  (window.innerWidth)` (`client/src/tab-scale.ts`), an undocumented
  small-screen render-scaling behavior.
  **Location:** `client/src/tab-renderer.ts:3,62`
  **Severity:** drift

- **Claim:** (implicit — no mention) No subsection documents a
  `host-remove-participant` client-side entry point.
  **Actual:** `server/src/handlers/host-remove-participant.ts` (host-only,
  filters the target from `Session.participants`, broadcasts `session-state`
  normally) is a fully implemented server message/handler with no
  corresponding client UI or self-removal handling anywhere in `client/src/`
  — no `removeParticipant`/`host-remove-participant` reference exists
  client-side. A plan and generated tasks file
  (`tasks-lyrics-ticker-font-size-defects-c196.md`) now target closing this,
  but as of this verification pass it is still unimplemented and
  undocumented.
  **Location:** `server/src/handlers/host-remove-participant.ts`
  **Severity:** drift

## datamodel.md

- **Claim:** `CatalogPart.trackIndex`'s note describes percussion status as
  read from the track's own parsed data via
  `track.percussionArticulations`/instrument metadata.
  **Actual:** same as the `infrastructure.md` finding above — the actual
  code path is the plain `track.isPercussion` boolean
  (`client/src/tab-renderer.ts:106,139`), not articulations/instrument
  metadata. The wrong claim is duplicated in this artifact too, not just
  `infrastructure.md`.
  **Location:** `client/src/tab-renderer.ts:106,139`
  **Severity:** cosmetic

## pipeline.md

- **Claim:** In the lrclib-assisted-line-break branch, lrclib.net is used
  "only as a reference for where to insert line breaks in the GP-derived
  syllable stream" — implying the resulting `.lrc` line *text* is still
  GP's own syllable-derived text, just regrouped at lrclib-suggested break
  points, with only timing coming from GP.
  **Actual:** `extractLyrics` (`packages/pipeline/src/extract-lyrics.ts:58-
  67`) sets `lines = parseLrclibLines(lrclibResult.syncedLyrics)` in this
  branch — the emitted `.lrc` line text is lrclib's own line text, not a
  regrouping of GP's syllable stream. `lyricLineBreaks` is only an
  approximate word-count-proportional split (`distributeByWordCount`,
  `extract-lyrics.ts:16-23`), not an exact mapping of lrclib's marked break
  positions onto GP's syllable stream. Only the per-line start/end
  *timestamps* come from GP (`buildLrc`,
  `packages/pipeline/src/lrc-writer.ts:16-31`, via `tickToMs`).
  **Location:** `packages/pipeline/src/extract-lyrics.ts:58-67`,
  `packages/pipeline/src/lrc-writer.ts:16-31`
  **Severity:** drift

## constitution.md

- **Claim:** Principle VIII requires the `.env`/`.env.example` key-parity
  lint to run "both pre-commit and in CI."
  **Actual:** The pre-commit half is implemented
  (`scripts/check-env-parity.mjs`, wired into the pre-commit hook). No CI
  provider or workflow exists anywhere in the repo (`.github/workflows/`
  absent). A git remote (`origin` →
  `git@github.com:kinda-bad/sync-tab-scroll.git`) does now exist, so the
  prior verification's "no configured git remote" justification for this
  gap no longer applies — the CI half is unmet for its own sake now (no
  provider chosen/configured), not because there's nowhere to run it.
  **Location:** repo root (`.github/workflows/` absent)
  **Severity:** drift (pre-existing, explicitly deferred — see STATUS.md's
  recommended next steps)

No defects found in `ui.md` or `brand.md` this pass.
