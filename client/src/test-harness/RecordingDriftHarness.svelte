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

    status = status === 'ready' ? 'ready' : status;
  });
</script>

<div data-testid="status">{status}</div>
<div bind:this={hostContainer} style="display: none"></div>
<div bind:this={participantContainer} style="display: none"></div>
