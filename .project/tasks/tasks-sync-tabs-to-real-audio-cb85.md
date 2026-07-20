---
plan: plan-sync-tabs-to-real-audio-2026-07-19-62cf.md
generated: 2026-07-19
status: in-progress
---

# Tasks

## Phase 1: Diagnosis & Drift Foundation

- [x] T001 [parallel] Create a skewed recording fixture in `client/test-fixtures/fixture-catalog/`: a new synthetic song directory with a `meta.json`, a short `.gp`, a generated `recording.mp3` (a click/tone track is sufficient — no music needed), and a `syncPoints` array in `meta.json` using alphaTab's `FlatSyncPoint` shape (`{barIndex, barPosition, barOccurence, millisecondOffset}`). The recording's real tempo must diverge from the score's notated tempo by a known, documented Δbpm large enough to exceed the correction threshold (notated 120 bpm, recording ~130 bpm gives Δbpm=10, well past the ~3.1 threshold). Also add a second, low-divergence variant (Δbpm < 1) for the control case. Document both Δbpm values in a README in the fixture directory — later tasks assert against them.

- [ ] T002 Write a failing Playwright CT spec `client/src/recording-drift.ct.spec.ts` that mounts two alphaTab instances against the T001 high-divergence fixture — one in `PlayerMode.EnabledSynthesizer` acting as host, one in `PlayerMode.EnabledBackingTrack` acting as participant — drives the participant through the existing `correctDrift` against simulated `PlaybackState` broadcasts at ~1s intervals, and asserts that corrective seeks do NOT fire more than once per 10 seconds of playback. This test MUST fail first (constitution Principle VII): current `correctDrift` extrapolates via `localTempoAtTick` (notated tempo only) and will fire a seek roughly every second. Record the observed seek frequency and the peak position divergence in the test output — T005 consumes those numbers. [artifacts: infrastructure]

- [x] T003 [parallel] Author sync points for the T001 fixture using alphatab.net's Media Sync Editor, export them, and compare the exported JSON byte-for-byte against the `FlatSyncPoint[]` shape stored in `meta.json`. Record the finding in `.project/plans/research-recording-mode-drift-2026-07-19-b7c2.md` under a new "Resolved" note: either byte-compatible (store verbatim) or the exact adapter transformation needed. Then remove the corresponding `[OPEN: ...]` marker from `pipeline.md`. Documentation/verification task — no test requirement. [artifacts: pipeline]

- [ ] T004 Make `correctDrift`'s extrapolation rate host-source-keyed in `client/src/playback-sync.ts`, turning T002 green. Currently `elapsedTicks` is derived from `localTempoAtTick(api.score, ...)`, which walks `masterBar.tempoAutomations` and can never observe a backing track's `syncBpm` (a separate `MasterBar.syncPoints` collection). Choose between (a) inferring the host's effective rate from observed tick advance across consecutive `playback-tick-report` broadcasts, or (b) adding the host's source to the wire — (a) preserves this plan's zero-protocol-change property and is preferred unless T002's data shows it is too noisy to be stable. Extend `client/src/playback-sync.test.ts` with unit coverage of the chosen rate derivation before implementing. Then replace the `[OPEN: ...]` marker in `infrastructure.md`'s Session & Real-Time Sync section with the decision and its rationale. [artifacts: infrastructure]

> **T004 — STOPPED, work reverted, disposition deferred to the re-plan.**
> Left unchecked deliberately. The diagnosis phase found the drift seam to be
> materially different from what this plan assumed, and the plan is being
> revised rather than extended.
>
> What was established (full detail in
> `.project/plans/research-recording-mode-drift-2026-07-19-b7c2.md`):
>
> - **T004a — offset root cause.** `correctDrift`'s arithmetic is exact
>   (host deviation from its own projection is 0 ticks). The dominant fault
>   is a **per-`play()` start skew of ~275 ms** (not the ~83 ms first
>   reported — that was an artifact of measuring while correcting). It is
>   invariant under `bufferTimeInMilliseconds`, and re-rolled on every start
>   (275 ms → 342 ms across a seek), so **no compensation constant exists**.
>   A backing-track participant's reported position tracks its own
>   `HTMLAudioElement.currentTime` to ±5 ms, so the *recording* side is the
>   accurate one.
> - **T004b — acceptance criteria.** Defines the ~50 ms bar and, critically,
>   finds that reported-position alignment **cannot bound audible separation
>   for a mixed synth/recording pair** (the synth's output latency is
>   unmeasurable via alphaTab 1.8.3 and absent from the wire) — it may even
>   *create* a ~275 ms offset. Also records that **T004 is two phenomena**,
>   the per-start skew AND the unimplemented backing-host rate-keying, so the
>   task as written was never the whole job.
>
> A calibration mechanism was implemented and then **reverted** under
> constitution Principle II: it ratcheted (post-seek recalibration re-absorbed
> accumulated drift as skew), so its low seek count came from correction
> effectively stopping while participants ended ~900 ms apart.
> `client/src/playback-sync.ts` is byte-identical to the merge-base; the
> measurement rig (`client/src/test-harness/RecordingDriftHarness.svelte`)
> and the T001 fixtures are retained.

- [ ] T005 Using T002's measured seek frequency and peak position divergence at known Δbpm, derive the empirical safe margin for `recordingTempoDivergence` — the Δbpm above which a mixed synth/recording session separates unacceptably. Note that 3.125 BPM is the *correction* threshold (`50 ticks = Δbpm × 16 × 1s`), but the *musical* tolerance is likely tighter, since even uncorrected divergence accumulates ~26ms/sec at that value. Record the chosen margin and its derivation as a named exported constant with an explanatory comment in a new `client/src/recording-divergence-margin.ts`, with unit tests covering the boundary. Note the division of labour: T012 *measures* divergence server-side (a raw number published on `CatalogSong`), and T020 is the **only** consumer that applies this threshold to that number — the server never guards, it only publishes. So the margin is client-only; do not push it into `packages/shared` for a server consumer that does not exist.

## Phase 2: Catalog Assets & Delivery

- [ ] T006 [parallel] Re-export alphaTab's `FlatSyncPoint` type from `packages/shared/src/index.ts` rather than redefining it (constitution Principles V and VI — a bespoke `{barIndex, occurence, syncTimeMs}` shape was explicitly rejected in datamodel.md because alphaTab already round-trips this structure via `Score.applyFlatSyncPoints()`/`exportFlatSyncPoints()`). Add a `*.type-test.ts` assertion that the re-export stays structurally identical to alphaTab's own declaration, so an upstream shape change fails loudly. [artifacts: datamodel]

- [ ] T007 Add `recordingPath: string | null`, `syncPoints: FlatSyncPoint[] | null`, and `recordingTempoDivergence: number | null` to the `CatalogSong` interface in `packages/shared/src/index.ts`. All three are nullable and absent for a non-recording song, so no existing consumer changes. Update any existing `CatalogSong` fixtures/builders in the test suites to satisfy the new fields. [artifacts: datamodel]

- [ ] T008 Extend `SongMeta` in `server/src/catalog-loader.ts` with an optional `syncPoints` field, and extend `loadSong` to discover a `recording.mp3` in the song directory (same non-hidden-file discipline the `.gp` scan already uses — skip `._`-prefixed AppleDouble sidecars) and rewrite its on-disk path to a `/catalog/...` URL alongside `gpFilePath` and `lyricsLrc`. Write failing tests in `server/src/catalog-loader.test.ts` first covering: recording present + sync points present, recording absent, and sync points absent. [artifacts: datamodel, infrastructure]

- [ ] T009 In `server/src/catalog-loader.ts`, treat a song with a `recording.mp3` but no `syncPoints` as recording-less: set `recordingPath` to null and log a warning naming the song. An unanchored recording cannot be aligned to the score at all, so publishing it would offer a mode that cannot work. This follows the loader's existing skip-not-fatal posture for malformed entries. Test-first, extending T008's test file.

- [ ] T010 Add `audio/mpeg` to the `CONTENT_TYPES` map in `server/src/catalog-static.ts` (currently only `.gp` and `.lrc`; everything else falls back to `application/octet-stream`). Write a failing test in `server/src/catalog-static.test.ts` asserting the correct content type for an `.mp3` request. [artifacts: infrastructure]

- [ ] T011 Implement HTTP Range request support in `server/src/catalog-static.ts`. The handler currently pipes a plain `200` via `createReadStream().pipe(res)` with no range handling; an `HTMLAudioElement` requires `206 Partial Content` with `Accept-Ranges`/`Content-Range` in order to seek, and every drift correction and host seek lands on the audio element as a range request. Write failing tests first covering: a normal full request still returns 200, a valid `Range` header returns 206 with correct `Content-Range`, and an unsatisfiable range returns 416. Preserve the existing path-traversal guard. [artifacts: infrastructure]

- [ ] T012 Create `server/src/recording-divergence.ts` computing `CatalogSong.recordingTempoDivergence` at catalog load: for each sync point, derive its effective `syncBpm` and compare against the score's notated tempo at that sync point's tick, returning the maximum absolute difference. Wire it into `loadSong`. This is derived, never authored — it is not a `meta.json` field. Test-first, including a fixture whose divergence is known by construction (reuse T001's documented Δbpm values). [artifacts: datamodel]

## Phase 3: Recording Playback Engine

- [ ] T013 Extend `createTabRenderer` in `client/src/tab-renderer.ts` to accept an optional `playerMode` in its options object (it currently takes only `{container, gpFilePath, trackIndex, theme}`). When recording mode is requested, set `settings.player.playerMode = PlayerMode.EnabledBackingTrack`, fetch the `recordingPath` mp3 and supply it as the score's backing track before load, and apply the song's sync points at `scoreLoaded` via `Score.applyFlatSyncPoints()`. There is currently no `playerMode` set anywhere in the repo — the synth path must keep its exact current behavior when the option is omitted. Cover with a CT spec in `client/src/tab-renderer.ct.spec.ts` (real alphaTab required; a vitest unit test cannot exercise this). [artifacts: infrastructure]

- [ ] T014 Make the readiness gate in `client/src/readiness.ts` mode-aware. `waitUntilReady` currently requires both `scoreLoaded` and `soundFontLoaded`; a backing-track instance loads no sound font and may never fire `soundFontLoaded` at all, so it would hang forever. In recording mode, readiness is `scoreLoaded` plus backing-track load. This branches on the *local* participant's source, since readiness is a per-participant fact. Write the failing test in `client/src/readiness.test.ts` first. [artifacts: infrastructure]

- [ ] T015 Create `client/src/audio-source-preference.ts` — a per-song, per-device preference storing `'synth' | 'recording'`, defaulting to `'synth'`. Follow the established shape of `client/src/track-mute-preference.ts` exactly: a `storageKey(songId)` helper, a `load*`/`persist*` pair, localStorage-backed, never on the wire. Create `client/src/audio-source-preference.test.ts` first with failing tests covering default, round-trip, and malformed-stored-value fallback.

- [ ] T016 In `client/src/playback-engine.ts`, extend `ensurePlaybackEngine`'s teardown/rebuild trigger to also fire on an audio-source change, alongside the existing songId and engine-kind triggers. alphaTab fixes `playerMode` at construction, so switching source requires a full engine rebuild, not a live mutation — reuse the existing song-change rebuild path rather than adding a parallel mechanism. Also bypass count-in scheduling (the `countInTimers` block) and skip `installCountInCursorGuard` when the local source is recording, since both key off synth `countInVolume`. Extend `client/src/playback-engine.test.ts` and `client/src/playback-engine.ct.spec.ts`; note the unit test file explicitly scopes out anything needing a real alphaTab instance, so the rebuild-on-switch assertion belongs in the CT spec. [artifacts: ui, infrastructure]

## Phase 4: UI — Source Control, Carve-Outs, and Guard

- [ ] T017 Add an "Audio source" control (synth / recording) to the personal-preferences area of `client/src/components/SettingsModal.svelte`, rendered only when the selected song is recording-capable (non-null `recordingPath` and `syncPoints`). It sits with the personal preferences, not host controls — audio source is per-participant and never goes on the wire. Cover with `client/src/components/SettingsModal.ct.spec.ts`, including that the control is absent for a non-recording song. [artifacts: ui]

- [ ] T018 Disable per-part mute/solo and the personal metronome toggle in `SettingsModal.svelte` while the local source is `'recording'`, each with explanatory reason text rather than a silently inert control — alphaTab cannot mix synth audio with a backing track (upstream #1961), so these controls have no effect in that mode. This applies to `toggleTrackMute`, `soloTrack`, `toggleMuteAll`, and `toggleMetronome`; leave `toggleCountIn` (a session-wide host setting) functional. Icon-only controls need accessible names per the Bar's standing accessibility rule. Test-first in the CT spec. [artifacts: ui]

- [ ] T019 Make a recording-mode participant locally ignore `Session.countInEnabled`: in `applyPlaybackSettings` (`client/src/playback-sync.ts`), force `api.countInVolume = 0` when the local source is recording, regardless of the session setting. The recording's own intro is the count-in. The host's count-in toggle must stay fully functional for every synth-source participant in the same session — verify that explicitly. Extend `client/src/playback-sync.test.ts` test-first. [artifacts: ui]

- [ ] T020 Implement the mixed-source divergence guard in the UI, using T005's derived safe margin and T012's computed `recordingTempoDivergence`. On a song above the margin, a session containing both synth and recording listeners will audibly separate — a real musical limit, not a correctable bug. Resolve the open question this task carries: whether a divergent song disables the recording source outright, or permits it with a warning only when the session is actually mixed. Prefer the latter unless T002's data argues otherwise — it preserves the "everyone on the recording" case, which is safe at any divergence. Surface the constraint at the point of choice, never mid-performance. Then replace the `[OPEN: ...]` marker in `ui.md` with the decision. Test-first in the CT spec. [artifacts: ui]

## Phase 5: End-to-End Verification

- [ ] T021 Add a Playwright e2e spec in `client/e2e/` driving two participants on different audio sources through a full play → pause → seek → resume → stop cycle against the T001 low-divergence fixture, asserting their reported positions stay within the drift threshold throughout. This is the end-to-end proof of the plan's central sync claim; the T002 CT test covers the mechanism, this covers the real multi-participant path. Use the existing `client/e2e/helpers.ts` harness.

- [ ] T022 Run the full existing test suite (vitest, CT, and e2e) and confirm synth-only sessions are unchanged — the default path must not move. Any behavioral difference in a synth-only session is a regression in this feature, not an acceptable side effect. Investigate and fix, or explicitly document, any diff.

- [ ] T023 Browser-verify against a real recording in the live app: add a real `recording.mp3` plus externally-authored sync points to a catalog song, play it in a two-participant session with one participant on each source, and confirm cursor, lyrics ticker, and beat widget all track the recording correctly with no audible seek stutter. Note the known environment quirks: Chrome blocks port 6000, and automation audio can race or wedge (see project memory). Verification task — no new automated test required beyond confirming T021 passes against the real asset.
