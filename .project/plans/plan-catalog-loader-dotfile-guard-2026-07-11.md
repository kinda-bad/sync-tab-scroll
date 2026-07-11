---
status: approved
branch: catalog-loader-dotfile-guard
created: 2026-07-11
features: []
surfaced-defects: []
---

# Plan: catalog-loader dotfile/AppleDouble guard

Consumes `feedback-deployed-tab-loading-dc21.md` (F001, F002 — one confirmed
root cause).

## Goal

Make catalog loading robust to macOS AppleDouble/dotfile sidecar files so a
song's real `.gp` is always selected, restoring tab rendering and playback on
the Railway deployment.

## Scope

**In:**
- Harden `server/src/catalog-loader.ts` `loadSong()` so it never selects a
  dotfile (`.`-prefixed, which covers `._*` AppleDouble sidecars) as a song's
  `.gp`.
- Revise `infrastructure.md`'s Song Catalog Delivery section to state that the
  loader ignores dotfile/AppleDouble entries when resolving a song's `.gp`
  (same "malformed/unrecognized entry is skipped, not fatal" posture already
  documented there).
- Add an AppleDouble-free transfer note to the README's "Deploying to Railway"
  populate steps (`COPYFILE_DISABLE=1 tar …`) to prevent recurrence at the
  source.

**Out:**
- No change to the catalogue/consent model, the WS protocol, or client
  rendering/readiness — all alphaTab assets were confirmed serving HTTP 200 on
  prod; the fault is purely which `.gp` the server picks.
- No new upload mechanism. Catalog population stays operator-driven.
- Deleting the existing `._*` files already on the volume is an optional
  operator tidiness step, not a code task — the loader guard makes them inert.

## Technical Approach

`loadSong()` currently resolves the tab file with
`fs.readdirSync(songDir).find((f) => f.endsWith('.gp'))`. A macOS `tar`
transfer left `._<name>.gp` AppleDouble sidecars alongside the real files;
`._…` sorts/enumerates first and also ends in `.gp`, so the 163-byte xattr
blob is published as `gpFilePath` and alphaTab can't parse it (F001/F002).
`meta.json`/`lyrics.lrc`/`consent.json` are read by exact filename, so only
the `.gp` glob is affected — which is why songs still appear in the picker.

Fix: require the selected name to not start with `.`
(`f.endsWith('.gp') && !f.startsWith('.')`). Per constitution Principle VII,
the failing test comes first.

## Phase Breakdown

### Phase 1 — Artifact contract [artifacts: infrastructure]
- [ ] Update `infrastructure.md` Song Catalog Delivery: document that
      `loadSong` ignores dotfile/AppleDouble (`._*`) entries when selecting a
      song's `.gp`, treating them as non-song noise (skip-not-fatal). Stamp
      `last_updated`; no diagram change (this is prose, layout unchanged).
      Addresses F001/F002 at the contract level.

### Phase 2 — Code fix (test-first)
- [ ] Write a failing test in `server/src/catalog-loader.test.ts`: a song
      directory containing both `._Song-Title.gp` and `Song-Title.gp` must
      load the real file (assert `gpFilePath` ends with the non-dotfile name).
      Confirm it fails first. Fixes F001, F002.
- [ ] Implement the guard in `loadSong()`
      (`f.endsWith('.gp') && !f.startsWith('.')`). Make the test pass; run the
      full server vitest suite for regressions.

### Phase 3 — Runbook + live verification
- [ ] Add an AppleDouble-free transfer note to the README Railway populate
      steps (`COPYFILE_DISABLE=1 tar czf - -C catalog .`, or
      `--no-mac-metadata` / `--exclude='._*'`).
- [ ] Verify end-to-end: merge/push the branch, `railway redeploy`, then
      confirm over WS that every song's `gpFilePath` resolves to the real
      `.gp` (no `._` prefix) and the tab renders + playback starts on
      https://sync-tab-scroll.up.railway.app. This is the demonstrable
      increment.

## Complexity Tracking

None — a one-predicate guard plus a documentation/runbook note; no deviation
from the simplicity principle.

## Open Questions

- Optional: proactively delete the existing `._*` files from the Railway
  volume for tidiness (`railway ssh "find /data/catalog -name '._*' -delete"`).
  Not required for correctness once Phase 2 lands. Operator's call.

## Production Annotation Summary

None new.
