---
plan: plan-config-env-convention-2026-07-04.md
generated: 2026-07-04
status: in-progress
---

# Tasks

## Phase 1: Shape-lint script (test-first)

- [x] T001 [artifacts: constitution] Write `scripts/check-env-parity.test.ts`
  with failing tests for the shape-lint comparison logic: (a) matching keys
  on both sides pass; (b) a key present in `.env.example` but missing from
  `.env` fails with a message naming the key; (c) a key present in `.env`
  but missing from `.env.example` fails with a message naming the key; (d)
  an absent `.env` file passes trivially (nothing to drift against — this
  is the real, expected state on a fresh clone/CI, since `.env` is
  git-ignored). Confirm all four fail (no implementation exists yet).
- [ ] T002 [artifacts: constitution] Implement `scripts/check-env-parity.mjs`:
  a Node script taking two file paths as CLI args (`.env` path,
  `.env.example` path), parsing each as `KEY=value` lines (skip blank lines
  and `#`-comments), computing the symmetric difference of key sets, and
  exiting non-zero with a listing of mismatched keys if any exist — zero
  and silent if the `.env` side is absent or the key sets match. Make T001's
  tests pass.
- [ ] T003 [artifacts: constitution] [parallel] Add an npm script (e.g.
  root `package.json`'s `"check:env"`) invoking
  `node scripts/check-env-parity.mjs server/.env server/.env.example &&
  node scripts/check-env-parity.mjs client/.env client/.env.example`.
- [ ] T004 [artifacts: constitution] Extend `.githooks/pre-commit` to run
  `pnpm check:env` (or equivalent direct invocation) after the existing
  `pnpm check` step, so a key added to one file and forgotten in the other
  fails the commit.

## Phase 2: Server `.env` convention

- [ ] T005 [artifacts: constitution] [parallel] Create `server/.env.example`
  (committed) with `PORT=6080`, `CATALOG_ROOT=./catalog`,
  `HOST_REASSIGN_GRACE_MS=120000`, `REQUIRE_SONG_CONSENT=false` — same
  defaults `server/src/config.ts` currently falls back to — plus a comment
  noting `PORT` must stay equal to client's `VITE_BACKEND_PORT` (both encode
  the dev backend port).
- [ ] T006 [artifacts: constitution] Create `server/.env` locally (not
  committed — already covered by `.gitignore` line 3) with the same four
  keys, for exercising this change locally. Confirm `scripts/check-env-parity.mjs
  server/.env server/.env.example` passes.
- [ ] T007 [artifacts: constitution] Update `server/package.json`'s `dev`,
  `start`, and `test` scripts to load `--env-file-if-exists=.env` (via
  direct flag on `tsx`/`node`/`vitest` invocation, confirmed empirically to
  be forwarded correctly by `tsx` including `tsx watch`; use a
  `NODE_OPTIONS=--env-file-if-exists=.env` prefix only if a given script's
  runner doesn't accept the flag directly). Do not change
  `server/src/config.ts`'s `loadConfig()` logic — its `process.env.X ??
  default` shape is unchanged; only where `process.env.X` gets populated
  from changes.
- [ ] T008 [artifacts: constitution] Confirm/extend
  `server/src/config.test.ts`: add or verify a test that `loadConfig()`
  still returns all documented defaults when no env vars are set, and a
  test that explicit `process.env` values still override them — both
  should already pass unchanged, since `config.ts` itself isn't modified,
  but re-run to confirm the script/flag wiring didn't regress it.

## Phase 3: Client `.env` convention

- [ ] T009 [artifacts: constitution] [parallel] Create `client/.env.example`
  (committed) with `VITE_BACKEND_PORT=6080` and the same cross-reference
  comment as server's `.env.example`.
- [ ] T010 [artifacts: constitution] Create `client/.env` locally (not
  committed) with the same key. Confirm
  `scripts/check-env-parity.mjs client/.env client/.env.example` passes.
- [ ] T011 [artifacts: constitution] Update `client/vite.config.ts` to call
  `loadEnv(mode, process.cwd(), '')` and read
  `process.env.VITE_BACKEND_PORT ?? fileEnv.VITE_BACKEND_PORT ?? '6080'` for
  the `/catalog` proxy target in both the `server.proxy` and
  `preview.proxy` blocks — preserving shell-set-var precedence over `.env`
  (verified empirically: a shell-set var beats an `--env-file-if-exists`-
  loaded one; the same precedence must hold here since
  `client/playwright.config.ts`'s e2e command shell-prefixes
  `VITE_BACKEND_PORT=6081` and must keep winning). No change needed to
  `client/src/ws-client.ts` (Vite already auto-injects `.env` into
  `import.meta.env` for browser/build-time code) or to
  `client/playwright.config.ts` (its shell-prefixed override already wins
  under this precedence).

## Phase 4: Full verification

- [ ] T012 [artifacts: constitution] With no `.env` present (this worktree's
  actual state, matching a fresh clone/CI), run `pnpm -r --if-present run
  check`, client vitest (`pnpm --filter client test`), server vitest
  (`pnpm --filter server test`), and `npx playwright test --project=ct`
  (from `client/`). All must pass using code defaults, since `.env` is
  legitimately absent.
- [ ] T013 [artifacts: constitution] Populate `server/.env` (`PORT=6080`)
  and `client/.env` (`VITE_BACKEND_PORT=6080`) — the real-world scenario a
  populated `.env` on a developer's machine represents — start both dev
  servers (server on 6080, client on 6000), then run
  `npx playwright test --project=e2e` (from `client/`) and confirm it still
  targets 6081/6001 via `playwright.config.ts`'s shell-prefixed overrides,
  passes, and does not collide with the concurrently-running dev servers.
  This is the actual regression scenario the prior port-scheme fix
  protects against and the one T012 alone would miss.
- [ ] T014 [artifacts: constitution] Run the shape-lint check itself
  (`pnpm check:env`) with both `.env` files populated (from T006/T010) to
  confirm it passes, then deliberately remove one key from one side (e.g.
  comment out `CATALOG_ROOT` in `server/.env`) and confirm it fails with a
  clear message — restoring the key afterward.
