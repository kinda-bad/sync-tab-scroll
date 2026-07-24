import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';
import { TICKS_PER_QUARTER_NOTE, localTempoAtTick, ticksToMs } from './tempo-lookup';

/**
 * Drift tolerance as an absolute real duration, in milliseconds.
 *
 * Deliberately *not* a tick count. A MIDI tick is a fixed fraction of a
 * beat, so a fixed tick threshold means a different real tolerance at every
 * tempo — `3125 / bpm` ms for the old 50-tick value — and it gets *stricter*
 * as tempo rises, which is backwards: a faster song is no more forgiving of
 * a 30ms offset than a slow one. Sync tolerance is a perceptual quantity, so
 * it belongs in perceptual units and must be tempo-stable.
 *
 * 35ms is derived, not arbitrary. Every song in the current catalogue sits
 * between 93 and 130bpm with no mid-song tempo changes, so the old effective
 * tolerance spanned 33.6ms (93bpm) down to 24.0ms (130bpm). 35ms sits just
 * above the strictest of those, so no catalogue song receives *more*
 * corrections than it did before — the change is loosening-or-neutral
 * everywhere — while leaving 15ms of headroom under the 50ms perceptual bar
 * established in research-recording-mode-drift-2026-07-19-b7c2.md (T004b).
 */
const DRIFT_THRESHOLD_MS = 35;

/**
 * Tolerance for correctDrift's Stop-reset guard (`playbackState.status ===
 * 'stopped'`): a backing-track participant's tick↔recording-time conversion
 * never round-trips a seek back to the exact integer 0, so an exact `!== 0`
 * comparison there re-fires forever. A couple of ticks is well under a
 * millisecond at any real tempo — far below anything perceptible — while
 * still breaking the infinite reset loop.
 */
const STOPPED_RESET_TOLERANCE_TICKS = 2;

/**
 * The recording's effective playback rate (BPM) at a given tick, derived
 * from the stored `FlatSyncPoint[]` rather than the notated tempo
 * (infrastructure.md: a backing-track host advances at the sync-point rate,
 * and alphaTab keeps these in `MasterBar.syncPoints`, a collection
 * `localTempoAtTick`'s `tempoAutomations` walk never sees).
 *
 * Each `FlatSyncPoint` pins a bar to a millisecond offset in the recording.
 * Mapping its `barIndex`/`barPosition` to a synth tick (via the same bar-
 * duration walk `localTempoAtTick` uses) yields (tick, ms) anchors; the
 * slope between two adjacent anchors is the effective BPM over that span:
 *
 *   bpm = (Δticks / TICKS_PER_QUARTER_NOTE) / (Δms / 60000)
 *
 * Returns the rate of the segment containing `tick` (the last segment for a
 * tick past the final anchor), or `null` when there are fewer than two sync
 * points — with no segment there is no derivable rate, and the caller should
 * fall back to the notated tempo.
 */
export function syncPointRateAtTick(
  score: at.model.Score,
  syncPoints: at.model.FlatSyncPoint[],
  tick: number,
): number | null {
  if (!syncPoints || syncPoints.length < 2) return null;

  // Cumulative tick at the start of each master bar.
  const barStartTicks: number[] = [];
  let cumulative = 0;
  for (const masterBar of score.masterBars) {
    barStartTicks.push(cumulative);
    cumulative += masterBar.calculateDuration();
  }

  const anchorTick = (p: at.model.FlatSyncPoint): number => {
    const start = barStartTicks[p.barIndex] ?? cumulative;
    const duration = score.masterBars[p.barIndex]?.calculateDuration() ?? 0;
    return start + p.barPosition * duration;
  };

  const anchors = syncPoints
    .map((p) => ({ tick: anchorTick(p), ms: p.millisecondOffset }))
    .sort((a, b) => a.tick - b.tick);

  const bpmOfSegment = (a: { tick: number; ms: number }, b: { tick: number; ms: number }): number => {
    const dTicks = b.tick - a.tick;
    const dMs = b.ms - a.ms;
    if (dMs <= 0) return score.tempo;
    return (dTicks * 60000) / (TICKS_PER_QUARTER_NOTE * dMs);
  };

  // The segment whose tick span contains `tick`; clamp to the first/last.
  for (let i = 0; i < anchors.length - 1; i++) {
    if (tick < anchors[i + 1].tick || i === anchors.length - 2) {
      return bpmOfSegment(anchors[i], anchors[i + 1]);
    }
  }
  return bpmOfSegment(anchors[0], anchors[1]);
}

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
 * `projectionBpm` (T003 rate-keying, infrastructure.md): when the host is on
 * a backing track, the rate its clock advances at is the recording's
 * sync-point-derived rate, not the notated tempo `localTempoAtTick` returns.
 * A caller that knows the host is backing supplies that rate here and the
 * extrapolation (and the tick↔ms threshold conversion, which must use the
 * same rate the participant's own backing clock advances at) projects at it
 * instead. This changes only *which rate value* the projection reads — never
 * the arithmetic below. Omitted / `undefined` keeps the notated-tempo path
 * byte-for-byte, so a synth-host participant is unaffected.
 *
 * `isBackingParticipant` (T004, recording-drift-foundation): a backing-track
 * participant's clock *is* its `HTMLAudioElement`, and in a uniform-source
 * session every client plays the identical recording, so the pair is locked
 * together by construction — measured free-running separation is ~0ms,
 * sustained through a seek→resume cycle. Periodic time-extrapolation drift
 * correction is therefore not merely unnecessary here but actively harmful:
 * during the host's per-`play()` start-skew window (~300ms, re-rolled every
 * start — T004a) the rate-keyed projection transiently over-projects past
 * where the host's audio has actually reached, and each corrective seek
 * re-buffers the participant's audio, shoving it *ahead* of the host and
 * injecting the 60–80ms separation the ensuing seek storm perpetuates
 * (measured: correction on turns a 0ms free-run into 60–80ms). The
 * participant's own `audio.currentTime` — the one uncontaminated local
 * reference (T004a, ±5ms) — confirms the skew to compensate is ~0
 * (research §5), so the correct action is to *stop chasing*, not to add a
 * compensation term. This suppresses only the periodic extrapolation seek;
 * the start/pause/stop status transitions above still run (a host seek is a
 * discrete reposition event, not drift), and `correctDrift`'s projection
 * arithmetic is left entirely untouched — the block is simply not entered.
 */
export function correctDrift(
  api: AlphaTabApi,
  playbackState: PlaybackState,
  isHost: boolean,
  onApply?: (tick: number) => void,
  projectionBpm?: number,
  isBackingParticipant?: boolean,
  spotlightHoldingTick?: boolean,
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
    if (api.tickPosition !== playbackState.tickPosition) {
      onApply?.(playbackState.tickPosition);
      api.tickPosition = playbackState.tickPosition;
      api.play();
      return playbackState.tickPosition;
    }
    api.play();
    return null;
  } else if (playbackState.status !== 'running' && isPlaying) {
    api.pause();
  }

  // A full Stop (server always resets tickPosition to 0, playback-control.ts)
  // resets position for every client, host included — this is a one-shot
  // reaction to an explicit status transition, not a continuous tick-drift
  // comparison against a stale self-report, so it doesn't reintroduce the
  // host-echo bug the isHost guard below exists to prevent. Guarded on
  // tickPosition already being ~0 (a small tolerance, not exact equality)
  // rather than the isPlaying transition above, since Stop can arrive from
  // either Playing or already-Paused. The tolerance matters specifically for
  // a backing-track participant: alphaTab's tick↔recording-time conversion
  // for a backing track never round-trips a seek back to the exact integer
  // 0, so an exact `!== 0` check here re-fires forever — seek to 0, read
  // back a near-zero (non-zero) tick, seek to 0 again — a real, observed
  // infinite loop (freeze investigation, recording-drift-foundation T021).
  // Harmless for synth mode too, where the assignment already lands exactly.
  //
  // Spotlight mode (ui.md "lobby cursor", plan-f841-2026-07-24-bdce.md)
  // deliberately holds a non-zero `api.tickPosition` while
  // `playbackState.status` is still 'stopped' — that's exactly the
  // pre-playback lobby state the feature exists for. Without this
  // exemption, this stopped-reset re-fires on every single
  // `clientStore.subscribe` callback while stopped (not just once per Stop
  // transition) and stomps the Spotlight-follow assignment back to 0 on the
  // very next store tick after it was applied — confirmed via T002
  // diagnostic instrumentation (subscribe fired, applied tick, next
  // subscribe fire reset it before the caller ever read it back).
  // `spotlightHoldingTick` is a boolean, not an exact-tick comparison, for
  // the same non-round-tripping reason `STOPPED_RESET_TOLERANCE_TICKS`
  // exists below: alphaTab's own async worker settles a `tickPosition`
  // assignment to a nearby-but-not-identical value (observed: set 200,
  // settles to 201), so an exact-tick exempt still fails and still resets.
  // Exempting on spotlightMode alone (whenever a tick is actively held)
  // lets a real Stop, unrelated to Spotlight, still reset normally in every
  // other case — including once spotlightMode or lobbyCursorTick clears.
  if (
    playbackState.status === 'stopped' &&
    Math.abs(api.tickPosition) > STOPPED_RESET_TOLERANCE_TICKS &&
    !spotlightHoldingTick
  ) {
    onApply?.(0);
    api.tickPosition = 0;
    return 0;
  }

  if (isHost) return null;

  // A backing-track participant is slaved to its own ground-truth audio and
  // needs no periodic drift correction in a uniform-source session (see the
  // doc comment): skip the extrapolation seek entirely. The status
  // transitions above (start/pause/stop, and a host seek that arrives as a
  // discrete reposition) have already been applied.
  if (isBackingParticipant) return null;

  // Spotlight mode (T002/T003 finding, plan-f841-2026-07-24-bdce.md): this
  // was the actual root cause of the Spotlight force-follow bug, not the
  // stopped-state reset above. This drift-correction block runs against
  // `playbackState.tickPosition` (the host's real playback position, still
  // 0/stale pre-playback) even while stopped/paused — deliberately, per the
  // comment below, so a host seek-while-paused still propagates to
  // non-hosts (T011, feedback F002). But that means it re-snaps a non-host
  // participant's `api.tickPosition` straight back toward
  // `playbackState.tickPosition` on every subsequent subscribe fire,
  // unconditionally undoing the Spotlight-follow block's assignment to
  // `lobbyCursorTick` a moment later — confirmed via diagnostic
  // instrumentation (applied tick, immediately reset toward 0 on the very
  // next fire, independent of the stopped-reset block above, which was
  // already correctly skipping). While Spotlight mode is actively holding a
  // tick, force-follow supersedes normal seek-propagation for this
  // participant, so skip this resync entirely rather than fight it.
  if (spotlightHoldingTick) return null;

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
  const tempo =
    projectionBpm !== undefined && projectionBpm > 0
      ? projectionBpm
      : api.score
        ? localTempoAtTick(api.score, playbackState.tickPosition)
        : 0;
  const elapsedTicks = (elapsedMs * TICKS_PER_QUARTER_NOTE * tempo) / 60000;
  const projectedTickPosition = playbackState.tickPosition + elapsedTicks;

  const drift = Math.abs(api.tickPosition - projectedTickPosition);
  // Convert the tick-space drift to real time at the local tempo before
  // comparing, so the tolerance means the same thing at every tempo. In the
  // defensive no-score case above (tempo 0) there's no meaningful
  // conversion — treat the drift as unbounded so a genuine position change
  // still propagates rather than being silently swallowed.
  const driftMs = tempo > 0 ? ticksToMs(drift, tempo) : Infinity;
  if (driftMs > DRIFT_THRESHOLD_MS) {
    onApply?.(projectedTickPosition);
    api.tickPosition = projectedTickPosition;
    return projectedTickPosition;
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
  // Recording mode forces the synth count-in off regardless of
  // Session.countInEnabled (T016, ui.md): the recording's own intro is the
  // count-in, and alphaTab cannot sound a synth count-in against a backing
  // track. The host's toggle stays live for when the session returns to synth.
  api.countInVolume = session.playbackSource !== 'recording' && session.countInEnabled ? 1 : 0;
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
