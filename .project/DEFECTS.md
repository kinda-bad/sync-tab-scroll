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

No other defects found — `datamodel.md`, `pipeline.md`, `infrastructure.md`,
`ui.md`, and `brand.md` are unchanged since the 2026-07-03 all-clear pass and
were not re-surveyed in depth this run (this pass was scoped to Principle
VIII per the config-env-convention implementation it was run to confirm).

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
