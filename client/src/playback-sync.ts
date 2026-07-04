import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';

/** MIDI ticks — small relative to a beat (division is typically 960 ticks/quarter note). */
const DRIFT_THRESHOLD_TICKS = 50;

/**
 * Periodic drift correction (infrastructure.md Session & Real-Time Sync):
 * each participant's alphaTab instance drives its own local clock from
 * playback start; on each PlaybackState broadcast, correct only if drift
 * exceeds a threshold — never a continuous drive from the server. Applies
 * identically whether `api` is a visible or headless instance.
 */
/**
 * Returns the tick position this call itself programmatically applied to
 * `api.tickPosition`, or `null` if it didn't touch it — callers use this to
 * distinguish a real user seek from the drift correction's own assignment,
 * which alphaTab's `playerPositionChanged` fires identically (`isSeek: true`)
 * either way.
 *
 * `onApply` (if given) is invoked *synchronously before* each `tickPosition`
 * assignment below, not after this function returns: assigning
 * `api.tickPosition` fires `playerPositionChanged` synchronously, which a
 * caller-side seek-broadcast listener also reacts to synchronously. A caller
 * that only recorded this function's return value *after* it returned was
 * one event too late — the listener would see the new tick, compare it
 * against the *previous* call's recorded value, find no match, and
 * broadcast the correction as if it were a real user seek. That round-tripped
 * through the server and re-triggered another correction, forming a tight
 * feedback loop.
 *
 * `isHost`: the host must never drift-correct against `playbackState`,
 * because the host's own client *is* the source of `playbackState.tickPosition`
 * (via its periodic tick-report, at most once/sec) — comparing the host's
 * real, continuously-advancing local position against an echo of its own
 * up-to-1s-stale self-report meant `drift` exceeded the threshold almost
 * immediately after every report, hard-resetting the host's own real
 * progress *backward* to that stale checkpoint many times a second.
 * Confirmed live 2026-07-04: host's local tick climbed correctly (e.g.
 * 413→448 in a couple ms of real audio) while the broadcast echo sat frozen
 * (e.g. 393), and every ~50-tick overshoot snapped it straight back to 393 —
 * repeatedly discarding real progress and replaying any MIDI events
 * (including metronome/count-in clicks) between the reset point and
 * wherever playback had already reached, which is what surfaced as "very
 * slow, janky playback" plus "metronome retriggering constantly". The
 * status-transition branches below (start/pause/stop) still apply to the
 * host — those come from the host's own Start/Pause/Stop actions
 * round-tripping back as a `status` change, not from a tick-value
 * comparison, so they're safe.
 */
export function correctDrift(api: AlphaTabApi, playbackState: PlaybackState, isHost: boolean, onApply?: (tick: number) => void): number | null {
  if (!api.isReadyForPlayback) return null;

  const isPlaying = api.playerState === at.synth.PlayerState.Playing;
  if (playbackState.status === 'running' && !isPlaying) {
    onApply?.(playbackState.tickPosition);
    api.tickPosition = playbackState.tickPosition;
    api.play();
    return playbackState.tickPosition;
  } else if (playbackState.status !== 'running' && isPlaying) {
    api.pause();
  }

  // A full Stop (server always resets tickPosition to 0, playback-control.ts)
  // resets position for every client, host included — this is a one-shot
  // reaction to an explicit status transition, not a continuous tick-drift
  // comparison against a stale self-report, so it doesn't reintroduce the
  // host-echo bug the isHost guard below exists to prevent. Guarded on
  // tickPosition already being 0 rather than the isPlaying transition above,
  // since Stop can arrive from either Playing or already-Paused.
  if (playbackState.status === 'stopped' && api.tickPosition !== 0) {
    onApply?.(0);
    api.tickPosition = 0;
    return 0;
  }

  if (isHost) return null;

  const drift = Math.abs(api.tickPosition - playbackState.tickPosition);
  if (drift > DRIFT_THRESHOLD_TICKS) {
    onApply?.(playbackState.tickPosition);
    api.tickPosition = playbackState.tickPosition;
    return playbackState.tickPosition;
  }
  return null;
}

/**
 * Wires Session.countInEnabled to alphaTab's native count-in (ui.md) —
 * applied identically whether the participant's alphaTab instance is
 * visible or headless. The metronome is deliberately not here: it's a
 * client-local personal preference (metronome-preference.ts), applied by
 * playback-engine at engine creation and via setEngineMetronome().
 */
export function applyPlaybackSettings(api: AlphaTabApi, session: Session): void {
  api.countInVolume = session.countInEnabled ? 1 : 0;
}
