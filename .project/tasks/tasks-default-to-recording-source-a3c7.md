---
plan: plan-default-to-recording-source-2026-11-27-a3c7.md
generated: 2026-11-27
status: completed
---

# Tasks

## Phase 1: Contract

- [x] T001 [artifacts: datamodel, ui, infrastructure] Replace "synth stays
      the default" with the recording default: `Session.playbackSource` is
      `'recording'` after a genuine song change to a recording-capable song,
      else `'synth'`; the host's synth choice lasts for that song only.
      Record it as a reversal of the earlier stance, at the user's request.

## Phase 2: Server (test-first)

- [x] T002 Failing tests in `server/src/handlers/playback-source-set.test.ts`:
      a recording-capable first song of a new session defaults to recording;
      a song without one resets to synth; the next song re-applies the
      default over a host's synth choice; a same-song re-select keeps it; the
      host can switch a defaulted song to synth. Then set the source from
      `isRecordingCapable(song)` in `song-select.ts`.

## Phase 3: Client check

- [x] T003 CT `client/src/recording-default-source.ct.spec.ts` through
      `AppHarness` (now exposing a read-only `__getApi`): a session arriving
      in recording mode builds a backing-track engine directly, has
      `countInVolume` 0 with count-in on, and the host's Session tab shows the
      recording selected with Synth still sending `playback-source-set`.
