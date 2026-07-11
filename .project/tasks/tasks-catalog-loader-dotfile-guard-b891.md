---
plan: plan-catalog-loader-dotfile-guard-2026-07-11.md
generated: 2026-07-11
status: in-progress
---

# Tasks

## Phase 1: Artifact contract

- [x] T001 [artifacts: infrastructure] [parallel] In
      `.project/artifacts/infrastructure.md`, update the Song Catalog
      Delivery section to state that `loadSong` ignores dotfile / macOS
      AppleDouble (`._*`) entries when selecting a song's `.gp` file —
      treating them as non-song noise, consistent with the section's existing
      "malformed/unrecognized entry is skipped, not fatal" posture. Prose
      only; the container diagram layout is unchanged. Stamp `last_updated`
      to 2026-07-11 via
      `.claude/skills/ardd-scripts/ardd-state.sh stamp <file> last_updated 2026-07-11`
      (do not set `diagram_status stale` — no diagram change). Addresses
      F001/F002 at the contract level.

## Phase 2: Code fix (test-first, constitution Principle VII)

- [x] T002 Write a FAILING test in `server/src/catalog-loader.test.ts`:
      construct (or fixture) a song directory containing BOTH a real
      `Song-Title.gp` and a macOS AppleDouble sidecar `._Song-Title.gp` (plus
      the usual `meta.json`), load it via `loadCatalog`/`loadSong`, and assert
      the resulting `CatalogSong.gpFilePath` ends with the real
      `Song-Title.gp`, never the `._`-prefixed name. Confirm the test FAILS
      against the current `.find((f) => f.endsWith('.gp'))` implementation
      before writing the fix. Fixes F001, F002.
- [x] T003 In `server/src/catalog-loader.ts`, change `loadSong`'s `.gp`
      selection from `fs.readdirSync(songDir).find((f) => f.endsWith('.gp'))`
      to also reject dotfiles:
      `f.endsWith('.gp') && !f.startsWith('.')` (covers `._*` AppleDouble
      sidecars and any hidden file). Make T002's test pass; run the full
      server vitest suite (`pnpm --filter server test`) to confirm no
      regressions.

## Phase 3: Runbook + live verification

- [ ] T004 [parallel] In `README.md`'s "Deploying to Railway" populate
      steps, add an AppleDouble-free transfer note: when streaming the
      catalog to the Railway volume from macOS, use
      `COPYFILE_DISABLE=1 tar czf - -C catalog .` (or `--no-mac-metadata` /
      `--exclude='._*'`) so macOS never emits `._*` xattr sidecars onto the
      volume. Reference why (they get selected as bogus `.gp` files
      otherwise).
- [ ] T005 Verify end-to-end on the live deployment: after the branch is
      merged/pushed and `railway redeploy` completes, connect over WebSocket
      (`session-create`) and confirm every advertised `CatalogSong.gpFilePath`
      resolves to a real `.gp` (no `._` prefix), and that selecting a song
      renders its tab and pressing Start begins playback (no perpetual
      "Loading tab…") at https://sync-tab-scroll.up.railway.app. Note any
      residual `._*` files on the volume — they are now inert (loader skips
      them) but may be deleted for tidiness per the plan's open question.
      This is the demonstrable increment.
