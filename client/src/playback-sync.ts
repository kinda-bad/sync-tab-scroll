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
export function correctDrift(api: AlphaTabApi, playbackState: PlaybackState): void {
  if (!api.isReadyForPlayback) return;

  const isPlaying = api.playerState === at.synth.PlayerState.Playing;
  if (playbackState.status === 'running' && !isPlaying) {
    api.tickPosition = playbackState.tickPosition;
    api.play();
  } else if (playbackState.status !== 'running' && isPlaying) {
    api.pause();
  }

  const drift = Math.abs(api.tickPosition - playbackState.tickPosition);
  if (drift > DRIFT_THRESHOLD_TICKS) {
    api.tickPosition = playbackState.tickPosition;
  }
}

/**
 * Wires Session.metronomeEnabled/countInEnabled to alphaTab's native
 * metronome/count-in (ui.md) — applied identically whether the
 * participant's alphaTab instance is visible or headless.
 */
export function applyPlaybackSettings(api: AlphaTabApi, session: Session): void {
  api.metronomeVolume = session.metronomeEnabled ? 1 : 0;
  api.countInVolume = session.countInEnabled ? 1 : 0;
}
