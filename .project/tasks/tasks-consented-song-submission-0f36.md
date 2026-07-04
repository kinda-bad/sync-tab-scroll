---
plan: plan-consented-song-submission-2026-07-03.md
generated: 2026-07-03
status: completed
---

# Tasks

## Phase 1: Consent-gated catalog loading (server)

- [x] T001 [artifacts: infrastructure] Write a failing test for
  `loadConfig()` (`server/src/config.test.ts`) confirming
  `REQUIRE_SONG_CONSENT=true` sets `ServerConfig.requireSongConsent` to
  `true`, and that it defaults to `false` when the env var is unset —
  matching the existing `HOST_REASSIGN_GRACE_MS`/`hostReassignGraceMs`
  pattern in the same file. Confirm it fails (Principle VII, test-first).

- [x] T002 [artifacts: infrastructure] Add `requireSongConsent: boolean`
  to `ServerConfig` and wire `REQUIRE_SONG_CONSENT` parsing into
  `loadConfig()` (`server/src/config.ts`), following the exact
  `hostReassignGraceMs` pattern already there. Confirm T001's test now
  passes.

- [x] T003 [artifacts: datamodel] Write a failing test for a new
  `hasConsent(songDir: string): boolean` helper: returns `false` when the
  song directory's consent-record file is absent or malformed, `true`
  when present and matches the `ConsentRecord` shape (datamodel.md's
  Consent Record section: `submitterName`, `tosVersion`, `acceptedAt`).
  Confirm it fails.

- [x] T004 [artifacts: datamodel] [parallel] Implement the `ConsentRecord`
  type and the `hasConsent` helper in a new `server/src/consent.ts`
  module. Confirm T003's test now passes. This task is file-independent
  of T001/T002 (different module, no shared state) so can run in parallel
  with them.

- [x] T005 [artifacts: infrastructure, datamodel] Write a failing test for
  `catalog-loader.ts`: when `requireSongConsent` is `true`, a song
  directory lacking a valid consent record is excluded from the returned
  `CatalogSong[]`; when `false` (the default), every song directory loads
  exactly as it does today regardless of consent-record presence or
  absence. Confirm it fails. Depends on T002 and T004 (needs both
  `ServerConfig.requireSongConsent` and `hasConsent` to exist).

- [x] T006 [artifacts: infrastructure, datamodel] Wire the `hasConsent`
  check into `catalog-loader.ts`, gated on
  `ServerConfig.requireSongConsent`, logging a startup line naming any
  song directory skipped for missing consent (not a silent skip — mirror
  the existing malformed-directory skip-with-log pattern already in this
  file). Confirm T005's test passes, and run the full existing
  `server` test suite to confirm no regression to the ungated
  (`requireSongConsent: false`) default path.

## Phase 2: Consent-recording CLI companion (pipeline)

- [x] T007 [artifacts: datamodel] [parallel] Write a failing test for a
  new `record-consent` script (`packages/pipeline/src/record-consent.ts`
  or equivalent): given a song slug, submitter name, and ToS version, it
  writes a well-formed `ConsentRecord` file into that song's
  `catalog/<slug>/` directory without touching any of the pipeline's
  existing extraction outputs (`.lrc`, `meta.json`, the `.gp` file
  itself). Confirm it fails. Depends only on T004 (the `ConsentRecord`
  shape) — independent of Phase 1's server-side files, so can run in
  parallel with T005/T006.

- [x] T008 [artifacts: datamodel] Implement the `record-consent` script
  and wire it as a `package.json` bin/script entry in
  `packages/pipeline`, following the existing single-consolidated-script
  convention (pipeline.md's `extract-lyrics` is the model). Confirm
  T007's test now passes.

## Phase 3: Documentation & production annotation

- [x] T009 [artifacts: constitution] Add a production annotation, per
  constitution's Development Workflow convention, at the point the
  placeholder `tosVersion` value/text lives in `record-consent`'s
  implementation (T008) — flagging that real ToS legal text must replace
  it before an actual public deployment. This is a documentation/comment
  task with no new test of its own (the behavior it annotates is already
  covered by T007's test).
