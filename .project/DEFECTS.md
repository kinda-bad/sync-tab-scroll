# Defects

_Last verified: 2026-07-04_

## constitution.md

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

## infrastructure.md

No defects found in the "Font & Worker Setup" section (re-surveyed this
run, scoped to feedback-lyrics-only-view-d7d8's fix): the section's
`core.scriptFile`/`core.useWorkers` claims were themselves corrected as
part of this fix (see the plan/tasks for `lyrics-only-view-fix`) to
reflect the actual, verified mechanism — dev works via
`optimizeDeps.exclude` changing alphaTab's own bundler-environment
detection, production build works via `client/vite.config.ts`'s
`alphaTabWorkerAssets()` plugin emitting the ESM worker files it requests.
Verified directly against `client/vite.config.ts`, `client/src/tab-renderer.ts`,
`client/playwright.config.ts`, and a real-browser network trace of both
the dev server and a production build/preview.

Rest of this artifact not re-surveyed in depth this run (scoped pass, see
below).

## ui.md

No defects found in "Playback View" → "Lyrics part selected" (re-surveyed
this run): the description (headless alphaTab instance, no visible staff,
full lyric text driven by `CatalogSong.lyricsLrc` line timestamps, custom
view not alphaTab's native lyrics rendering) matches
`client/src/playback-engine.ts`'s `ensurePlaybackEngine` (the
`isLyricsPart && song.lyricsLrc` branch) and `client/src/App.svelte`'s
`.full-lyrics-view` element exactly. The feedback item that prompted this
check (`feedback-lyrics-only-view-d7d8`) was filed against this artifact,
but the actual bug was a build-config issue (see `infrastructure.md`
above) that prevented this already-correctly-described behavior from ever
running in the production build — not a documentation defect in `ui.md`
itself.

Rest of this artifact not re-surveyed in depth this run (scoped pass, see
below) — `ui.md` has had substantial changes merged since the
2026-07-03/07-04 passes (settings modal restructure, pre-singing lyrics
placeholder, small-screen/responsive behavior, leave-session control) that
this run did not audit; a full re-survey of `ui.md` is recommended before
the next feature build that touches the Playback or Lobby views.

## Not re-surveyed this run

`datamodel.md`, `pipeline.md`, `brand.md`, and the rest of `ui.md` beyond
the section above were not re-surveyed in depth this run — this pass was
scoped to `feedback-lyrics-only-view-d7d8`'s fix (worker/build config and
the two artifact sections it touches), per the same scoping convention the
2026-07-04 Principle VIII pass used. Given how much has landed on `main`
since the last full pass (host-transfer, settings-modal redesign,
pre-singing lyrics placeholder, small-screen responsiveness, leave-session,
metronome-as-preference, lobby-cursor debounce), a full unscoped
`/ardd-verify` pass across all artifacts is recommended soon, not assumed
clean by omission here.

## Resolved since last verification (2026-07-03, post-merge)

The 3 `ui.md` defects from the prior pass (a dropped "connected"
precondition on "Make host", and two paragraph-order/phrasing mismatches
against `SettingsModal.svelte`'s actual merged markup — all introduced by
manual resolution of the `host-transfer` ↔ `metronome-count-in-toggle`
merge conflict) are fixed: the Participants tab bullet was rewritten to
match the real render order (participant rows with Host Transfer controls
first, then the lobby-cursor/Spotlight/Metronome/Count-in control row) and
to drop the incorrect "connected" qualifier. Re-verified directly against
`client/src/components/SettingsModal.svelte` — no remaining mismatch.

The single defect from the pass before that — `client/src/brand-colors.ts`'s
unused `lyricCssColors` export (constitution Principle II) — also does
not reproduce; it was deleted on `fix-lyric-css-colors-dead-code`, since
merged to `main`.
