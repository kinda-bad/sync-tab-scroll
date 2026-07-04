---
status: approved
branch: config-env-convention
created: 2026-07-04
features: []
---

# Plan: Config via `.env`, Synced by Example (Constitution Principle VIII)

## Goal

Replace the current scattered `process.env.X ?? <inline default>` / shell-
env-var-prefix config surface (server's `PORT`/`CATALOG_ROOT`/
`HOST_REASSIGN_GRACE_MS`/`REQUIRE_SONG_CONSENT`, client's
`VITE_BACKEND_PORT`) with a single, git-ignored `.env` per app, a committed
`.env.example` kept in lockstep by a lint check, and that check wired into
the existing pre-commit hook — per constitution.md Principle VIII (already
ratified at 1.4.0, not yet implemented).

## Scope

**In scope:**
- `server/.env` (git-ignored, local-only) and `server/.env.example`
  (committed) covering the four existing server config keys.
- `client/.env` (git-ignored) and `client/.env.example` (committed)
  covering `VITE_BACKEND_PORT`.
- Migrating `server/src/config.ts` to source values from `process.env`
  populated by Node's native `--env-file-if-exists` flag, wired through
  `server/package.json`'s `dev`/`start`/`test` scripts — keeping the
  existing inline defaults as the boot fallback when no `.env` exists
  (fresh clone, CI), per Principle V (no `dotenv` dependency needed; Node
  20.6+ already does this natively — confirmed available on this repo's
  Node 20.20.2).
- Migrating `client/vite.config.ts` to load `.env` via Vite's `loadEnv()`
  for the `/catalog` proxy's `VITE_BACKEND_PORT` read (`import.meta.env`
  already auto-receives `.env` values at build time for `ws-client.ts`;
  `vite.config.ts` itself runs in Node and does **not** get `.env` in
  `process.env` automatically — this is the one place actual code change
  is required on the client side).
- A shape-lint script comparing an app's `.env`/`.env.example` key sets
  (same keys present on both sides), test-first per Principle VII, wired
  into `.githooks/pre-commit` for both apps.
- Preserving the existing dev/test port scheme exactly: server dev=6080/
  test=6081, client dev=6000/test=6001 — including the shell-prefixed
  `VITE_BACKEND_PORT=6081`/`PORT=6081` overrides in
  `client/playwright.config.ts`'s e2e `webServer` command, which must
  continue to win over any `.env`-supplied default.

**Out of scope:**
- Adding a CI workflow to run the lint check "in CI" as Principle VIII's
  text specifies — this repo has no CI provider, no `.github/workflows`,
  and no configured remote yet. See Open Questions.
- Any new config keys — this plan only relocates the five that already
  exist.
- Secrets management — no real secret exists yet; `.env.example` entries
  stay non-secret placeholders.

## Technical Approach

**Precedence, verified empirically before this plan was written:**
- A shell-set env var (e.g. `PORT=6081 node --env-file-if-exists=.env ...`)
  wins over a value loaded from `--env-file-if-exists` — confirmed via a
  throwaway script (`PORT=1234` shell + `.env` with `PORT=9999` →
  `process.env.PORT` reads `1234`). This is what keeps
  `client/playwright.config.ts`'s e2e port overrides authoritative once a
  `.env` exists on a developer's machine.
- `--env-file-if-exists` (Node ≥20.6, available in this repo's 20.20.2)
  does not throw when the file is absent — it logs
  "`<path> not found. Continuing without it.`" and continues. This matters
  because `.env` is git-ignored and genuinely absent in this worktree, in
  fresh clones, and in any future CI runner.
- `tsx` (including `tsx watch`, used by `server`'s `dev` script) forwards
  `--env-file-if-exists` through to the underlying Node process — verified
  directly, not assumed.

**Server:** `server/package.json`'s `dev`, `start`, and `test` scripts gain
`--env-file-if-exists=.env` (via `tsx`'s/`node`'s/`vitest`'s own flag-
forwarding, or a `NODE_OPTIONS=--env-file-if-exists=.env` prefix if a
script's runner doesn't accept the flag directly — decided per-script
during implementation). `server/src/config.ts`'s `loadConfig()` keeps its
current `process.env.X ?? default` shape unchanged in code — the only
change is *where* `process.env.X` gets populated from (a `.env` file
loaded by the runtime, instead of a shell prefix), which is exactly the
class of change Principle VIII asks for (single inspectable file) without
requiring a rewrite of `config.ts`'s logic or a new dependency.

**Client:** `client/vite.config.ts` calls `loadEnv(mode, process.cwd(), '')`
and merges its result under (not over) `process.env` so an already-set
shell var still wins:
```ts
const fileEnv = loadEnv(mode, process.cwd(), '');
const backendPort = process.env.VITE_BACKEND_PORT ?? fileEnv.VITE_BACKEND_PORT ?? '6080';
```
`client/src/ws-client.ts` needs no change — Vite already injects `.env`
into `import.meta.env` for browser/build-time code, which is what it reads.
`client/playwright.config.ts`'s e2e `webServer` command needs no change
either, since its shell-prefixed `VITE_BACKEND_PORT=6081` already wins over
`.env` under the precedence above.

**Shape-lint script:** a small Node script (e.g.
`scripts/check-env-parity.mjs`), parameterized by a pair of file paths, run
once per app. Logic: parse both files' keys (ignore blank lines/comments);
if the `.env` side is absent, pass trivially (nothing to drift against —
`.env` is legitimately absent on a fresh clone/CI); if present, fail
listing any key present on one side and missing on the other. Test-first:
write `scripts/check-env-parity.test.ts` covering (a) matching keys pass,
(b) a key missing from `.env.example` fails, (c) a key missing from `.env`
fails, (d) an absent `.env` file passes trivially — before writing the
script itself.

**Pre-commit wiring:** `.githooks/pre-commit` gains a step running the
shape-lint script against both `server/` and `client/` pairs, after the
existing `pnpm check` step.

## Phase Breakdown

### Phase 1 — Shape-lint script (test-first)
1. Write `scripts/check-env-parity.test.ts` with failing tests for all four
   cases above. Confirm they fail (no implementation exists yet).
2. Implement `scripts/check-env-parity.mjs` (or `.ts` run via `tsx`) to
   make the tests pass.
3. Wire it into `.githooks/pre-commit`, invoked once per app
   (`server/.env`+`server/.env.example`, `client/.env`+`client/.env.example`).

### Phase 2 — Server `.env` convention
1. Create `server/.env.example` (committed) with `PORT`, `CATALOG_ROOT`,
   `HOST_REASSIGN_GRACE_MS`, `REQUIRE_SONG_CONSENT`, each with the same
   default value `config.ts` currently falls back to, plus a comment
   flagging that `PORT` here must match client's `VITE_BACKEND_PORT`.
2. Create `server/.env` locally (not committed — already covered by
   `.gitignore`) with the same keys, for local dev/testing of this change.
3. Update `server/package.json`'s `dev`/`start`/`test` scripts to load
   `--env-file-if-exists=.env`.
4. Confirm/extend `server/src/config.test.ts` — defaults still apply with
   no `.env`/env vars set; explicit `process.env` values still override
   (behavior unchanged, but re-run to confirm the migration didn't regress
   it).

### Phase 3 — Client `.env` convention
1. Create `client/.env.example` (committed) with `VITE_BACKEND_PORT`,
   defaulted to `6080`, with the same cross-reference comment as server's.
2. Create `client/.env` locally (not committed).
3. Update `client/vite.config.ts` to use `loadEnv()` with shell-precedence
   preserved, per the Technical Approach above.

### Phase 4 — Full verification
1. Run `pnpm -r --if-present run check`, client vitest, server vitest,
   `npx playwright test --project=ct` with **no** `.env` present (matches
   this worktree's actual git-ignored-and-absent state, and a fresh clone).
2. Populate `server/.env` (`PORT=6080`) and `client/.env`
   (`VITE_BACKEND_PORT=6080`), start dev servers on 6000/6080, then run
   `npx playwright test --project=e2e` and confirm it still targets
   6081/6001 (via `playwright.config.ts`'s shell-prefixed overrides) and
   passes without colliding with the concurrently-running dev servers —
   this is the actual real-world regression scenario the prior port-scheme
   fix was protecting against, and the one naive testing (no `.env` in this
   worktree) would silently miss.

## Complexity Tracking

None — no new dependency, no new runtime abstraction. `--env-file-if-exists`
is a native Node flag; `loadEnv()` is Vite's existing built-in.

## Open Questions

- **CI provider.** Principle VIII's text says the shape-lint check runs
  "both pre-commit and in CI," but this repo has no CI workflow, no
  `.github/workflows`, and no configured git remote. This plan implements
  the pre-commit half fully and leaves the CI half as a human decision
  (which provider, once a remote exists) rather than inventing one.

## Production Annotation Summary

None new. `.env`'s eventual real-secret use (once a public-deployment
posture is pursued) is already annotated in constitution.md Principle VIII
and not re-litigated here.
