import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';
import { TICKS_PER_QUARTER_NOTE, localTempoAtTick } from './tempo-lookup';
import { MAX_CALIBRATION_SKEW_TICKS, type PositionCalibrator } from './backing-track-calibration';

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
/**
 * `calibrator`: supplied only for a participant whose local audio source is a
 * backing-track recording (T004). Such an instance reports the position of
 * audio actually *emitted*, while a synth host reports audio it has
 * *scheduled* — a measured ~275 ms disagreement, re-rolled on every `play()`.
 * The calibrator absorbs that per-playback skew at the position-reporting
 * boundary so the comparison below stays in one consistent clock; see
 * `backing-track-calibration.ts` for the measurements and rationale. Omitted
 * (undefined) for a synth participant, which leaves every path below
 * byte-for-byte equivalent to its previous behaviour.
 */
export function correctDrift(
  api: AlphaTabApi,
  playbackState: PlaybackState,
  isHost: boolean,
  onApply?: (tick: number) => void,
  calibrator?: PositionCalibrator,
): number | null {
  if (!api.isReadyForPlayback) return null;

  const isPlaying = api.playerState === at.synth.PlayerState.Playing;
  if (playbackState.status === 'running' && !isPlaying) {
    // Skip the seek when already at the target tick (the common case: first
    // Play, everyone at 0). A positionally-no-op assignment still fires an
    // isSeek positionChanged whose cursor update alphaTab defers to the next
    // frame — landing after play() has flipped playerState to Playing, which
    // is one of the triggers for the count-in cursor slide that
    // installCountInCursorGuard guards against (and it feeds the
    // lastProgrammaticTick bookkeeping for no reason).
    // Each play() re-rolls the backing-track start skew, so any calibration
    // captured during the previous playback is stale from here on.
    calibrator?.reset();
    if (api.tickPosition !== playbackState.tickPosition) {
      onApply?.(playbackState.tickPosition);
      api.tickPosition = playbackState.tickPosition;
      api.play();
      return playbackState.tickPosition;
    }
    api.play();
    return null;
  } else if (playbackState.status !== 'running' && isPlaying) {
    calibrator?.reset();
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
    calibrator?.reset();
    onApply?.(0);
    api.tickPosition = 0;
    return 0;
  }

  if (isHost) return null;

  // Extrapolation only makes sense while playback is actually running: once
  // paused/stopped, playbackState.serverTimestamp stops advancing but
  // Date.now() doesn't, so without this guard elapsedMs (and the projected
  // tick below) grows without bound the longer playback stays paused —
  // repeatedly forcing api.tickPosition forward well past the real paused
  // position on every later store update, even though the pause branch
  // above only runs once, on the transition instant. That phantom forward
  // tickPosition still fires playerPositionChanged (isSeek: true, per this
  // function's own doc comment) — which the lyrics ticker listens to
  // directly — even where the bar cursor doesn't visibly follow it while
  // stopped, surfacing as a ticker that runs ahead of a correctly-placed
  // paused cursor (confirmed live 2026-07-18: paused on bar 14, ticker
  // already two words ahead). But drift correction itself must still run
  // while paused — against the RAW playbackState.tickPosition
  // (elapsedTicks = 0) — so a host seek-while-paused still propagates to
  // non-hosts (T011, feedback F002).
  const isRunning = playbackState.status === 'running';

  // Latency-compensated extrapolation (infrastructure.md Session & Real-Time
  // Sync), only while running: project playbackState.tickPosition forward by
  // the elapsed wall-clock time since it was authoritative, compensating for
  // host→server→client propagation latency rather than comparing against the
  // raw last-reported value as-is. Elapsed ms is converted to ticks using the
  // local tempo at that tick position, derived from this participant's own
  // already-loaded score — deliberately not playbackState.bpm, which stays
  // display-only.
  const elapsedMs = isRunning ? Date.now() - playbackState.serverTimestamp : 0;
  // isReadyForPlayback (checked above) implies a score is loaded in
  // practice, but the type is nullable — fall back to no extrapolation
  // (raw comparison) in the defensive null case rather than throwing.
  const tempo = api.score ? localTempoAtTick(api.score, playbackState.tickPosition) : 0;
  const elapsedTicks = (elapsedMs * TICKS_PER_QUARTER_NOTE * tempo) / 60000;
  const projectedTickPosition = playbackState.tickPosition + elapsedTicks;

  // Calibrate once per playback, and only once the local backing track is
  // genuinely under way: at the instant play() is issued both clocks read 0,
  // so calibrating there would capture a zero skew and miss the real one,
  // which only emerges as the audio element's asynchronous start completes.
  if (calibrator && isRunning && api.tickPosition > 0) {
    calibrator.observe(api.tickPosition, projectedTickPosition);
  }

  // The comparison happens in the reference (host) clock; the correction is
  // mapped back into local terms before it is applied, so `api.tickPosition`
  // and this function's return value stay in the units every caller expects.
  const localTickInReference = calibrator ? calibrator.toReference(api.tickPosition) : api.tickPosition;
  const drift = Math.abs(localTickInReference - projectedTickPosition);

  // Until the skew has been captured, the participant must be allowed to
  // free-run: correcting it would drag its position into agreement with the
  // projection and so erase the very quantity calibration needs to observe.
  // (Measured: with correction active throughout, the captured skew came out
  // at ~150 of ~530 ticks — just the re-drift accumulated since the previous
  // seek — and the seek storm was completely unfixed.)
  //
  // Seek-following is preserved regardless: a real host seek is far larger
  // than any plausible start skew, so anything of that size is still applied
  // during the settle window. Only skew-sized differences are tolerated here.
  if (calibrator && !calibrator.isCalibrated && drift <= MAX_CALIBRATION_SKEW_TICKS) {
    return null;
  }

  if (drift > DRIFT_THRESHOLD_TICKS) {
    const target = calibrator ? calibrator.fromReference(projectedTickPosition) : projectedTickPosition;
    onApply?.(target);
    api.tickPosition = target;
    // A seek re-rolls the start skew — T004a measured it moving 275 ms ->
    // 342 ms across a single pause/seek/replay — and in backing-track mode
    // the seek also sends the audio element back through decode/re-buffer,
    // during which its reported position is transiently meaningless.
    // Dropping the calibration here does both jobs at once: it forces a
    // fresh measurement of the new skew, and (because an uncalibrated
    // participant free-runs) it stops the re-buffer transient from being
    // read as drift and cascading into a burst of further seeks.
    calibrator?.reset();
    return target;
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

/**
 * Pins the beat cursor in place while alphaTab's count-in bar is playing
 * (ui.md): alphaTab reports PlayerState.Playing for the whole count-in but
 * deliberately suppresses positionChanged events until real playback begins —
 * yet any cursor update that lands in that window makes the default cursor
 * handler start its animated slide toward the next beat, so the cursor
 * visibly drifts into the song while the count-in clicks are still sounding,
 * then snaps back to the start when real playback begins (confirmed live
 * 2026-07-05). Such updates do land there in practice: alphaTab emits an
 * internal `isSeek: true` position-reset around play() (see the seek-guard
 * comments in playback-engine.ts) and defers its DOM cursor update to the
 * next frame, i.e. until after the state has already flipped to Playing.
 *
 * The guard uses alphaTab's public customCursorHandler extension point
 * (>= 1.8.1), mirroring the built-in ToNextBeatAnimatingCursorHandler
 * exactly except that transitions degrade to plain placements while the
 * count-in window is active. The window opens when the player flips to
 * Playing with a count-in configured, and closes on the first non-seek
 * positionChanged — none are emitted during the count-in, and the first one
 * only flows once real playback is underway. (A pause/stop also closes it
 * via the state flipping away from Playing.)
 */
export function installCountInCursorGuard(api: AlphaTabApi): void {
  let countInActive = false;
  api.playerStateChanged.on((e) => {
    countInActive = e.state === at.synth.PlayerState.Playing && api.countInVolume > 0;
  });
  api.playerPositionChanged.on((e) => {
    if (!e.isSeek) countInActive = false;
  });

  api.customCursorHandler = {
    onAttach() {},
    onDetach() {},
    placeBarCursor(barCursor, beatBounds) {
      const barBounds = beatBounds.barBounds.masterBarBounds.visualBounds;
      barCursor.setBounds(barBounds.x, barBounds.y, barBounds.w, barBounds.h);
    },
    placeBeatCursor(beatCursor, beatBounds, startBeatX) {
      const barBounds = beatBounds.barBounds.masterBarBounds.visualBounds;
      beatCursor.transitionToX(0, startBeatX);
      beatCursor.setBounds(startBeatX, barBounds.y, 1, barBounds.h);
    },
    transitionBeatCursor(beatCursor, beatBounds, startBeatX, nextBeatX, duration, cursorMode) {
      if (countInActive) {
        this.placeBeatCursor(beatCursor, beatBounds, startBeatX);
        return;
      }
      const factor = cursorMode === at.midi.MidiTickLookupFindBeatResultCursorMode.ToNextBext ? 2 : 1;
      beatCursor.transitionToX(duration * factor, startBeatX + (nextBeatX - startBeatX) * factor);
    },
  };
}
