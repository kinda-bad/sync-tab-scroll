# Defects

_Last verified: 2026-07-05_

Full unscoped pass across all artifacts (constitution, datamodel,
infrastructure, ui, pipeline, brand) — the first since the scoped
2026-07-04 pass. `features.md` is not an artifact this skill checks code
against.

## infrastructure.md

- **Claim:** Tab Rendering section's code block/comment describes
  percussion detection as reading `track.percussionArticulations` /
  instrument metadata.
  **Actual:** `client/src/tab-renderer.ts:106` reads `track.isPercussion`
  directly — a plain boolean property alphaTab exposes, not the
  metadata-sniffing described. The underlying conclusion this claim
  supports (percussion status comes from alphaTab's own parsed data, not
  stored in the datamodel, per constitution Principle V) still holds.
  **Location:** `client/src/tab-renderer.ts:28-29,106`
  **Severity:** cosmetic

- **Gap:** The Tab Rendering section doesn't mention small-screen render
  scaling at all.
  **Actual:** `client/src/tab-renderer.ts:59-62` sets
  `settings.display.scale = tabScaleForViewportWidth(window.innerWidth)` —
  a viewport-width-based render scale for phone legibility. Undocumented,
  not contradictory.
  **Location:** `client/src/tab-renderer.ts:59-62`
  **Severity:** drift

- **Gap:** No artifact (`infrastructure.md`'s Host Transfer/Host Succession
  sections, `ui.md`, or `datamodel.md`) documents a host-can-remove-a-
  participant feature.
  **Actual:** `host-remove-participant` is a fully implemented wire message
  (`packages/shared/src/messages.ts:8`) with a server handler
  (`server/src/handlers/host-remove-participant.ts`, dispatched from
  `server/src/dispatch.ts`) that lets the host filter a participant out of
  `session.participants` and broadcasts the resulting state. It has no
  client-side entry point anywhere in `client/src/` — no button, no message
  send call — so the feature is server-reachable but not reachable through
  the actual UI. This may be dead/unfinished surface rather than a doc gap;
  worth a human decision on whether to finish the UI, remove the handler,
  or document it as intentionally server-only (e.g. for a future admin
  tool).
  **Location:** `server/src/handlers/host-remove-participant.ts`,
  `packages/shared/src/messages.ts:8`
  **Severity:** drift

No other defects found in infrastructure.md — session/real-time sync,
close-handler broadcast, reconnect-by-identity, connection-loss/retry
(`ws-client.ts`), host succession/transfer (`host-succession.ts`,
`host-delegate.ts`, `request-host.ts`, `host-request-decline.ts`,
`disconnect.ts`), song catalog delivery (`catalog-loader.ts`,
`server.ts`), consent gate (`config.ts`, `catalog-loader.ts`), and the
in-tab lyrics overlay (`lyrics-overlay.ts`) all match.

## ui.md

No defects found. Full re-survey (the rest of this artifact hadn't been
checked since 2026-07-03/07-04, per the prior pass's note). Verified:
Landing View, Lobby View (song/part modal, settings modal — Participants/
Session/Preferences tabs, host transfer controls, lobby cursor/spotlight
mode, count-in/metronome split), persistent Bar (join code, leave session,
settings), Playback View (instrument-part ticker overlay incl. placeholder/
centering/one-way transition, lyrics-part headless view, host-only paused
seek), Small Screens (viewport meta, tab-scale 500px breakpoint, modal
85dvh clamp, no-horizontal-overflow e2e coverage), and States (Loading
banner, Error toasts, Connection-lost banner). All match current
`client/src/` code exactly, including the settings-modal-redesign and
metronome-as-preference reversal.

## pipeline.md

- **Claim:** The lrclib-assisted-line-break path (GP has lyrics but no
  marked line boundaries) implies the resulting `.lrc`'s lyric *text* is
  still GP's own syllable stream, with lrclib used only as a reference for
  where to insert line breaks — the artifact's phrasing frames this as a
  timing-only caveat ("all timing in the resulting `.lrc` still comes from
  GP").
  **Actual:** In this branch, `extract-lyrics.ts:59-62` sets
  `lines = parseLrclibLines(lrclibResult.syncedLyrics)` — lrclib's own
  lyric *text* — and only uses GP syllables/timing for timestamps via
  `buildLrc(lines, lyricLineBreaks, syllables, tickToMs)`
  (`lrc-writer.ts:17-35`), which emits `lines[i]` (lrclib's text) at each
  GP-derived timestamp. So in this branch the published `.lrc`'s visible
  words come from lrclib, not from GP's syllable stream — only the
  line-break counts and all timestamps come from GP. The behavior itself
  is intentional and correct; the artifact's wording is what's misleading
  about which source supplies the rendered lyric text in this case.
  **Location:** `packages/pipeline/src/extract-lyrics.ts:55-70`,
  `packages/pipeline/src/lrc-writer.ts:17-35`
  **Severity:** drift

No other defects found in pipeline.md — stages, dependencies, inputs/
outputs on disk, consent recording, source format, and re-run conditions
all check out against `catalog.ts`, `gp-parser.ts`, `line-breaks.ts`, and
`record-consent.ts`.

## brand.md

No defects found. Color tokens (dark/light `tokens.css`), the tab-notation
neon/hazard palette (`brand-colors.ts`, exact RGBA alpha values match), and
font tokens (`Bungee`/`IBM Plex Mono`) all match the artifact exactly.

## datamodel.md

No defects found. `Session`, `Participant`, `CatalogSong`, `CatalogPart`,
`PlaybackState` all match `packages/shared/src/index.ts` field-for-field,
including nullability and the `SelectedPart` union. The join-code charset/
length claim matches `server/src/session-store.ts` exactly (`ABCDEFGHJKLM
NPQRSTUVWXYZ23456789`, 4 characters). The Consent Record shape
(`submitterName`/`tosVersion`/`acceptedAt`) matches
`packages/pipeline/src/record-consent.ts` and its test.

## constitution.md

No new violations found this pass (beyond the already-tracked Principle
VIII CI-half gap below). Spot-checked: Principle I (Single Source of
State — single WS entry point per side, no shared mutable context
objects), Principle II (No Dead Architecture — no stale references, all
`package.json` `name` fields match real paths), Principle VI (Named Types
Over Inline Duplication — `SelectedPart` defined exactly once in
`packages/shared/src/index.ts:15`), production annotations (two correctly-
annotated shortcuts found: `server/src/session-store.ts:17`,
`packages/pipeline/src/record-consent.ts:4`; no un-annotated TODO/HACK/
FIXME found). Principle VII (test coverage) has a standing documented gap
per the constitution's own Sync Impact Report — not a new finding, not
re-litigated here. Principle III/IV (entry-file/dispatcher decomposition)
only spot-checked by line count (`client/src/main.ts` 11 lines,
`server/src/index.ts` 6 lines — both thin as expected); internal
dispatcher decomposition wasn't traced in depth this pass.

- **Claim:** Principle VIII — the `.env`/`.env.example` shape-lint check is
  "run both pre-commit and in CI."
  **Actual:** The pre-commit half is fully implemented and verified
  (`.githooks/pre-commit` runs `pnpm check:env`, which invokes
  `scripts/check-env-parity.mjs` for both `server/` and `client/`). No CI
  half exists — this repo has no `.github/workflows`, no CI provider, and
  no configured git remote. This is a known, explicitly deferred gap (see
  `plan-config-env-convention-2026-07-04.md`'s Open Questions), not an
  oversight — it needs a human decision (which provider, once a remote
  exists), not an invented workflow.
  **Location:** `.githooks/pre-commit`, `scripts/check-env-parity.mjs`
  **Severity:** drift (explicitly scoped-out, tracked as an open question —
  not a silent gap)

- **Note (not a defect):** even once a CI provider exists, `pnpm check:env`
  is structurally a no-op in CI as currently designed — `.env` is
  git-ignored and genuinely absent there, and `check-env-parity.mjs` passes
  trivially whenever `.env` is absent (by design, so a fresh clone/CI run
  doesn't fail over a file that's never supposed to exist there). The check
  only ever catches real drift on a developer's own machine, where a
  populated `.env` exists to compare against. This is a design tension with
  the constitution's literal "and in CI" text worth surfacing to a human
  alongside the CI-provider decision, not something code can resolve on its
  own.

- **Note (not a defect):** `server/src/config.ts`'s `loadConfig()` still
  contains inline defaults (e.g. `process.env.PORT ?? 6080`). These are
  intentionally retained as the boot fallback for a fresh clone/CI where no
  `.env` exists — Principle VIII's own text permits `.env.example` defaults
  to mirror code defaults; it objects to scattered ad hoc *sourcing*, not to
  a fallback existing. One residual: the default *values* now live in both
  `server/.env.example` and `config.ts`, and `check-env-parity.mjs` compares
  key *shape* only, not values — so those two defaults could silently drift
  from each other over time. Acceptable today (five values, no secrets),
  worth a one-line mention if a future feature adds more config keys.
