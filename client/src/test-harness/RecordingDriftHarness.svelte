<script lang="ts">
  import { onMount } from 'svelte';
  import * as at from '@coderline/alphatab';
  import type { PlaybackState } from '@sync-tab-scroll/shared';
  import { correctDrift } from '../playback-sync';

  export let gpFilePath: string;
  export let recordingPath: string;
  export let syncPoints: at.model.FlatSyncPoint[] = [];
  /** Control mode: run the "participant" on plain synth instead of the backing track. */
  export let participantSynth = false;
  /** Diagnosis mode: put the HOST on the backing track (the inverse of the default config). */
  export let hostBacking = false;
  /** T004a: vary the synth output buffer to test whether the position lead scales with it. */
  export let synthBufferMs: number | null = null;

  let hostContainer: HTMLDivElement;
  let participantContainer: HTMLDivElement;
  let status = 'init';

  function baseSettings(): at.Settings {
    const settings = new at.Settings();
    settings.core.engine = 'svg';
    settings.core.fontDirectory = '/font/';
    settings.core.scriptFile = new URL('/alphaTab.worker.js', location.origin).href;
    settings.core.useWorkers = false;
    settings.display.layoutMode = at.LayoutMode.Page;
    settings.player.enablePlayer = true;
    return settings;
  }

  function waitReady(api: at.AlphaTabApi, timeoutMs = 30_000): Promise<boolean> {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if (api.isReadyForPlayback) {
          clearInterval(iv);
          resolve(true);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(iv);
        resolve(api.isReadyForPlayback);
      }, timeoutMs);
    });
  }

  onMount(async () => {
    const gpBytes = new Uint8Array(await (await fetch(gpFilePath)).arrayBuffer());
    const mp3Bytes = new Uint8Array(await (await fetch(recordingPath)).arrayBuffer());

    // Host: plain synth, exactly the shipped default path.
    const hostSettings = baseSettings();
    if (hostBacking) {
      hostSettings.player.playerMode = at.PlayerMode.EnabledBackingTrack;
    } else {
      hostSettings.player.soundFont = '/soundfont/sonivox.sf2';
      if (synthBufferMs !== null) hostSettings.player.bufferTimeInMilliseconds = synthBufferMs;
    }
    const host = new at.AlphaTabApi(hostContainer, hostSettings);
    const errors: string[] = [];
    host.error.on((e) => errors.push('host:' + String((e as unknown as Error)?.message ?? e)));
    if (hostBacking) {
      const hostScore = at.importer.ScoreLoader.loadScoreFromBytes(gpBytes, hostSettings);
      hostScore.backingTrack = new at.model.BackingTrack();
      hostScore.backingTrack.rawAudioFile = mp3Bytes;
      if (syncPoints.length > 0) hostScore.applyFlatSyncPoints(syncPoints);
      host.renderScore(hostScore, [0]);
    } else {
      host.load(gpBytes, [0]);
    }

    // Participant: backing track, anchored to the recording by sync points.
    const partSettings = baseSettings();
    if (participantSynth) {
      partSettings.player.soundFont = '/soundfont/sonivox.sf2';
    } else {
      partSettings.player.playerMode = at.PlayerMode.EnabledBackingTrack;
    }
    const participant = new at.AlphaTabApi(participantContainer, partSettings);
    participant.error.on((e) => errors.push('participant:' + String((e as unknown as Error)?.message ?? e)));

    if (participantSynth) {
      participant.load(gpBytes, [0]);
    } else {
      const score = at.importer.ScoreLoader.loadScoreFromBytes(gpBytes, partSettings);
      score.backingTrack = new at.model.BackingTrack();
      score.backingTrack.rawAudioFile = mp3Bytes;
      if (syncPoints.length > 0) score.applyFlatSyncPoints(syncPoints);
      participant.renderScore(score, [0]);
    }

    const [hostReady, participantReady] = await Promise.all([waitReady(host), waitReady(participant)]);
    status = hostReady && participantReady ? 'ready' : `not-ready host=${hostReady} participant=${participantReady}`;

    const w = window as unknown as Record<string, unknown>;
    w.__errors = errors;
    w.__host = host;
    w.__participant = participant;

    /**
     * Drives the real `correctDrift` on the backing-track participant
     * against the host's own reported tick position, at the production
     * broadcast cadence (~1/s, playback-engine's tick reporter), and
     * reports how often a corrective seek actually fired plus how far the
     * two instances diverged in between.
     */
    w.__measureDrift = async (durationMs: number, correct = true) => {
      const seekTicks: { atMs: number; tick: number }[] = [];
      const divergences: { atMs: number; ticks: number }[] = [];
      const startedAt = Date.now();

      host.play();
      participant.play();

      // The host's tick report is at most once per second (production
      // cadence) and carries the server timestamp correctDrift extrapolates
      // from — so between reports the participant is on its own clock.
      let broadcast: PlaybackState = {
        status: 'running',
        tickPosition: host.tickPosition,
        serverTimestamp: Date.now(),
        bpm: 120,
      } as PlaybackState;

      const reporter = setInterval(() => {
        broadcast = { status: 'running', tickPosition: host.tickPosition, serverTimestamp: Date.now(), bpm: 120 } as PlaybackState;
      }, 1000);

      // Sample much faster than the broadcast, mirroring the store
      // subscription that re-runs correctDrift on every store update.
      const samples: {
        atMs: number;
        before: number;
        after: number;
        hostTick: number;
        applied: number | null;
        // Observation copies of correctDrift's own internal quantities, so
        // the ROOT CAUSE of a seek is visible rather than just its fact.
        elapsedMs: number;
        projected: number;
        drift: number;
        hostDrift: number;
      }[] = [];
      const sampler = setInterval(() => {
        const atMs = Date.now() - startedAt;
        const before = participant.tickPosition;
        divergences.push({ atMs, ticks: Math.abs(before - host.tickPosition) });

        // Mirror of correctDrift's extrapolation, computed BEFORE calling it
        // so the numbers describe the same instant the real decision uses.
        const elapsedMs = Date.now() - broadcast.serverTimestamp;
        const projected = broadcast.tickPosition + (elapsedMs * 960 * 120) / 60000;
        const drift = before - projected;
        // The host's OWN deviation from the same projection: if this is ~0 the
        // projection faithfully tracks the host, so any participant drift is real.
        const hostDrift = host.tickPosition - projected;

        const applied = correct ? correctDrift(participant, broadcast, false, undefined) : null;
        if (applied !== null) seekTicks.push({ atMs, tick: applied });
        samples.push({ atMs, before, after: participant.tickPosition, hostTick: host.tickPosition, applied, elapsedMs, projected, drift, hostDrift });
      }, 100);

      await new Promise((r) => setTimeout(r, durationMs));
      clearInterval(reporter);
      clearInterval(sampler);
      host.pause();
      participant.pause();

      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      return {
        elapsedSeconds,
        seekCount: seekTicks.length,
        seeksPerSecond: seekTicks.length / elapsedSeconds,
        secondsPerSeek: seekTicks.length > 0 ? elapsedSeconds / seekTicks.length : Infinity,
        peakDivergenceTicks: divergences.reduce((m, d) => Math.max(m, d.ticks), 0),
        finalHostTick: host.tickPosition,
        finalParticipantTick: participant.tickPosition,
        errors,
        samples,
      };
    };

    /**
     * T001/T002 (recording-drift-foundation): the UNIFORM backing/backing
     * measurement. Both host and participant are on the same recording
     * (mount with `hostBacking` and default participant backing), so each
     * side's reported `tickPosition` tracks its own `HTMLAudioElement.
     * currentTime` to ±5ms (T004a). Aligning the two reported positions is
     * therefore the same as aligning the two audios — the property the
     * synth-host direction lacks. This driver runs a full
     * play -> sustain(>=20s) -> seek -> resume cycle and reports the
     * end-state separation in BOTH ticks and milliseconds, plus each side's
     * own audio.currentTime, so the millisecond gate (the reporting unit
     * that matters) can be asserted directly.
     *
     * `opts.recordingBpm`, when supplied, is fed to `correctDrift` as the
     * projection *rate input* for the backing-track host (T003 rate-keying):
     * the host advances at the recording's sync-point-derived rate, not the
     * notated tempo, and the extrapolation must match or it accumulates
     * `Δbpm × 16` ticks/s of phantom drift. It changes only which rate value
     * correctDrift reads — never its arithmetic.
     */
    const audioEl = (api: at.AlphaTabApi): HTMLAudioElement | undefined =>
      (api.player?.output as unknown as { audioElement?: HTMLAudioElement } | undefined)?.audioElement;

    w.__measureUniform = async (opts: {
      sustainMs?: number;
      resumeMs?: number;
      seekTick?: number;
      correct?: boolean;
      recordingBpm?: number;
    } = {}) => {
      const sustainMs = opts.sustainMs ?? 20_000;
      const resumeMs = opts.resumeMs ?? 8_000;
      const seekTick = opts.seekTick ?? 20_000;
      const correct = opts.correct ?? true;
      const recordingBpm = opts.recordingBpm;

      const samples: {
        atMs: number;
        phase: string;
        hostTick: number;
        partTick: number;
        hostAudioMs: number | null;
        partAudioMs: number | null;
        sepTicks: number;
        sepAudioMs: number | null;
      }[] = [];
      let seekCount = 0;
      const startedAt = Date.now();

      // Broadcast mirrors the production host tick-report at the ~1/s cadence.
      let broadcast: PlaybackState = {
        status: 'running',
        tickPosition: host.tickPosition,
        serverTimestamp: Date.now(),
        bpm: 120,
      } as PlaybackState;
      const reporter = setInterval(() => {
        broadcast = { status: 'running', tickPosition: host.tickPosition, serverTimestamp: Date.now(), bpm: 120 } as PlaybackState;
      }, 1000);

      const sampleOnce = (phase: string) => {
        const atMs = Date.now() - startedAt;
        const hostAudio = audioEl(host);
        const partAudio = audioEl(participant);
        const hostAudioMs = hostAudio ? hostAudio.currentTime * 1000 : null;
        const partAudioMs = partAudio ? partAudio.currentTime * 1000 : null;

        // T003 rewires this call to pass `recordingBpm` through to
        // correctDrift as the backing-host projection rate input.
        const applied = correct
          ? correctDrift(participant, broadcast, false, undefined)
          : null;
        if (applied !== null) seekCount++;

        samples.push({
          atMs,
          phase,
          hostTick: host.tickPosition,
          partTick: participant.tickPosition,
          hostAudioMs,
          partAudioMs,
          sepTicks: Math.abs(host.tickPosition - participant.tickPosition),
          sepAudioMs: hostAudioMs !== null && partAudioMs !== null ? Math.abs(hostAudioMs - partAudioMs) : null,
        });
      };

      const runFor = async (ms: number, phase: string) => {
        const until = Date.now() + ms;
        while (Date.now() < until) {
          sampleOnce(phase);
          await new Promise((r) => setTimeout(r, 100));
        }
      };

      // play -> sustain
      host.play();
      participant.play();
      await runFor(sustainMs, 'sustain');

      // seek (host-driven): both instances re-seek, re-rolling their
      // per-play start skew, then resume.
      host.pause();
      participant.pause();
      host.tickPosition = seekTick;
      participant.tickPosition = seekTick;
      broadcast = { status: 'running', tickPosition: seekTick, serverTimestamp: Date.now(), bpm: 120 } as PlaybackState;
      host.play();
      participant.play();
      await runFor(resumeMs, 'resume');

      clearInterval(reporter);
      host.pause();
      participant.pause();

      // End state = the tail of the resume phase while still running, so a
      // brief post-seek re-buffer transient can't masquerade as the result.
      const resumeSamples = samples.filter((s) => s.phase === 'resume');
      const tail = resumeSamples.slice(-10);
      const median = (xs: number[]) => {
        const s = [...xs].sort((a, b) => a - b);
        return s.length ? s[Math.floor(s.length / 2)] : NaN;
      };
      const endTickSep = median(tail.map((s) => s.sepTicks));
      const endAudioSepMs = median(tail.filter((s) => s.sepAudioMs !== null).map((s) => s.sepAudioMs as number));
      const bpmForMs = recordingBpm ?? 120;
      const endReportedSepMs = (endTickSep * 60000) / (bpmForMs * 960);

      return {
        elapsedSeconds: (Date.now() - startedAt) / 1000,
        seekCount,
        endTickSep,
        // Reported-position separation converted to ms at the recording rate.
        endReportedSepMs,
        // The true audible separation: difference of the two audios'
        // own currentTime (ground truth, uncontaminated by the projection).
        endAudioSepMs,
        errors,
        samples,
      };
    };

    status = status === 'ready' ? 'ready' : status;
  });
</script>

<div data-testid="status">{status}</div>
<div bind:this={hostContainer} style="display: none"></div>
<div bind:this={participantContainer} style="display: none"></div>
