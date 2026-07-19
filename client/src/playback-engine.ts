import type { AlphaTabApi } from '@coderline/alphatab';
import type * as at from '@coderline/alphatab';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import { createTabRenderer, setTheme, switchTrack, type Theme } from './tab-renderer';
import { loadStoredMetronome } from './metronome-preference';
import { loadStoredTrackMute } from './track-mute-preference';
import { createHeadlessPlayer } from './headless-player';
import { walkLyricBeats, walkLyricBeatsFromRawLine, groupIntoLines } from './lyrics-beat-walk';
import { createLyricsOverlay, type LyricsOverlay } from './lyrics-overlay';
import type { LyricsTickerFontSize } from './lyrics-ticker-font-size-preference';
import { parseLrc, type LrcLine } from './lrc-parser';
import { findLyricGaps, computeMeasureBoundaries, type LyricGap } from './lyrics-gap-timing';

interface GapIndicatorHandle {
  gap: LyricGap;
  lineEl: HTMLElement;
  dotEls: HTMLElement[];
  drainEl: HTMLElement;
}
import { waitUntilReady, warmUpAudioOutput } from './readiness';
import { correctDrift, applyPlaybackSettings, installCountInCursorGuard } from './playback-sync';
import { clientStore } from './store';
import type { WsClient } from './ws-client';
import { debounce } from './debounce';

export interface EngineContainers {
  tabContainer: HTMLElement;
  overlayContainer: HTMLElement;
  fullLyricsEl: HTMLElement;
}

interface EngineState {
  api: AlphaTabApi;
  /**
   * Which catalog song this engine instance loaded — the missing identity
   * behind feedback F001 (song-switch stale-score race): without it, a host
   * "Change song" re-invoked ensurePlaybackEngine with the NEW song but the
   * early-return ladder matched on part kind/track index alone, so the old
   * api (old score, old lyrics overlay, old synth MIDI) survived and Start
   * played the OLD song until a refresh. A differing songId now tears the
   * engine down and rebuilds from scratch, same as the lyrics-part
   * kind-change path.
   */
  songId: string;
  overlay?: LyricsOverlay;
  isLyricsPart: boolean;
  trackIndex: number;
  /** Only populated for the visible (non-lyrics-part) renderer, once its scoreLoaded fires — needed by switchTrack to re-render a different track without reloading the GP file. */
  score?: at.model.Score;
  theme: Theme;
  showOverlay: boolean;
  scoreLoaded: boolean;
  /**
   * Whether the container was actually visible (non-zero `clientWidth`) at
   * the moment `scoreLoaded` fired — `tab-renderer.ts`'s own unconditional
   * `api.render()` there silently no-ops if it wasn't (alphaTab's native
   * `ResizeObserver`-driven `triggerResize()` does not reliably self-heal
   * this in practice — confirmed empirically, not assumed, via
   * `playback-engine.ct.spec.ts`'s "recovers from scoreLoaded firing while
   * the container is still hidden" regression test). `renderNowVisible()`
   * uses this (not just `scoreLoaded` itself) to know whether it still owes
   * the engine a real render.
   */
  renderedWhileVisible: boolean;
}

let state: EngineState | undefined;

/**
 * Creates the alphaTab/headless instance the moment a participant's part is
 * known (song selected + selectedPart set) — in the Lobby, not on
 * Playback.svelte mount — so per-participant loading/readiness (ui.md) can
 * actually resolve before the host starts playback. A later call (the
 * participant changed their part) re-renders the new track on the existing
 * engine instead of a no-op — previously this short-circuited
 * unconditionally on any second call, so the picker's "selected" state
 * changed but the rendered tab never did. Switching to/from the special
 * 'lyrics' part changes engine kind entirely (visible renderer vs. headless
 * player), so that case tears down and recreates from scratch instead.
 */
export function ensurePlaybackEngine(containers: EngineContainers, wsClient: WsClient, song: CatalogSong, trackIndex: number, isLyricsPart: boolean): void {
  if (state) {
    if (state.songId !== song.id || state.isLyricsPart !== isLyricsPart) {
      // Song changed (or engine kind changed): the loaded score, lyrics
      // overlay/lrc DOM, and synth state all belong to the old song — tear
      // down and rebuild rather than trying to reload in place (F001).
      destroyEngine();
    } else if (!isLyricsPart && state.trackIndex !== trackIndex) {
      if (state.score) switchTrack(state.api, state.score, trackIndex);
      state.trackIndex = trackIndex;
      return;
    } else {
      return;
    }
  }

  wsClient.send({ type: 'readiness-update', readiness: 'loading' });

  // Mirrors main.ts's own `loadStoredTheme() ?? 'dark'` fallback — both
  // agree dark is the default absent any preference. Read directly off the
  // document rather than importing from theme.ts, which already imports
  // setEngineTheme from this module (a reverse import here would be circular).
  const datasetTheme = document.documentElement.dataset.theme;
  const theme: Theme =
    datasetTheme === 'light' || datasetTheme === 'cyberpunk-dark' || datasetTheme === 'cyberpunk-light' ? datasetTheme : 'dark';

  const api = isLyricsPart ? createHeadlessPlayer(song.gpFilePath, trackIndex) : createTabRenderer({ container: containers.tabContainer, gpFilePath: song.gpFilePath, trackIndex, theme });

  // Metronome is a client-local personal preference (ui.md Preferences
  // tab), not session state — applied once at creation and thereafter via
  // setEngineMetronome() when the user toggles it.
  api.metronomeVolume = loadStoredMetronome() ? 1 : 0;

  // Keeps the beat cursor still while the count-in bar plays (see the
  // guard's own doc comment). Installed for the headless engine too — it has
  // no cursor DOM, so the handler simply never gets invoked there.
  installCountInCursorGuard(api);

  state = { api, songId: song.id, isLyricsPart, trackIndex, theme, showOverlay: true, scoreLoaded: false, renderedWhileVisible: isLyricsPart };
  // A fresh engine always starts with the overlay shown (matches
  // `showOverlay: true` above) — resets any stale `false` left over from a
  // previous song/session (T004).
  clientStore.update((s) => (s.lyricsOverlayVisible ? s : { ...s, lyricsOverlayVisible: true }));

  // T019/T020 (infrastructure.md Tab Rendering): pre-warm the AudioContext
  // as soon as the api exists, well before the "Start" button's own
  // play()-triggered activation — avoids the audio engine's first callback
  // (context creation/resume) happening for the first time exactly when
  // playback is expected to start. `api.player` isn't guaranteed to exist
  // synchronously right after construction (alphaTab initializes it
  // asynchronously), so also warm up on `playerReady` — `activate()` is
  // idempotent, calling it twice is harmless.
  warmUpAudioOutput(api);
  api.playerReady.on(() => warmUpAudioOutput(api));

  waitUntilReady(api).then(() => wsClient.send({ type: 'readiness-update', readiness: 'ready' }));

  // The engine is created (and its first render fires) while still in the
  // Lobby, with the tab container hidden via `display:none` (T011c) —
  // alphaTab skips that render ("width=0, element invisible") and never
  // re-renders on its own once the container is shown. Track load state so
  // `renderNowVisible` can force a real render once the Playback view
  // actually shows the container. Also captures the loaded score itself so
  // a later part switch can re-render a different track (switchTrack)
  // without reloading the GP file, and snapshots whether the container was
  // actually visible *at this exact moment* — `scoreLoaded` becoming `true`
  // doesn't by itself mean a real (non-zero-width) render happened.
  api.scoreLoaded.on((score) => {
    state!.scoreLoaded = true;
    state!.score = score;
    if (!isLyricsPart) state!.renderedWhileVisible = containers.tabContainer.clientWidth > 0;

    // Personal "mute this part" preference (ui.md Preferences tab,
    // track-mute-preference.ts), applied at load time so a participant's
    // previously-muted parts stay muted across a reload/rejoin — mirrors
    // how metronomeVolume is applied at engine creation, but deferred until
    // here since changeTrackMute needs real Track objects that don't exist
    // before scoreLoaded fires.
    for (const track of score.tracks) {
      if (loadStoredTrackMute(song.id, track.index)) {
        state!.api.changeTrackMute([track], true);
      }
    }

    markEngineReadyIfComplete();
  });

  if (!isLyricsPart && song.lyricsTrackIndex !== null && song.lyricsLineIndex !== null && song.lyricLineBreaks) {
    const lyricsTrackIndex = song.lyricsTrackIndex;
    const lyricsLineIndex = song.lyricsLineIndex;
    const lyricLineBreaks = song.lyricLineBreaks;
    const rawLine = song.lyricsRawLine;
    api.scoreLoaded.on((score) => {
      // GP-semantics dispatch from the published raw line when present
      // (feedback F001); per-beat walkSyllables stays the legacy fallback.
      const syllables = rawLine
        ? walkLyricBeatsFromRawLine(score, lyricsTrackIndex, rawLine)
        : walkLyricBeats(score, lyricsTrackIndex, lyricsLineIndex);
      const lines = groupIntoLines(syllables, lyricLineBreaks);
      const measures = computeMeasureBoundaries(score);
      state!.overlay = createLyricsOverlay(api, lines, containers.overlayContainer, { measures });
      state!.overlay.setVisible(state!.showOverlay);
    });
  } else if (isLyricsPart && song.lyricsLrc) {
    let lrcLines: LrcLine[] = []; // rendered (real-line-only) list — DOM building + active-line matching, unchanged shape from before this feature.
    let lineEls: HTMLElement[] = [];
    let activeLineIndex = -1;
    let gapScore: at.model.Score | undefined; // Set once the headless instance's scoreLoaded fires (may race the .lrc fetch below).
    let pendingAllLines: LrcLine[] | undefined; // The full (blank-gap-marker-included) parsed list, set once the .lrc fetch resolves.
    let gaps: LyricGap[] = [];
    let gapIndicators: GapIndicatorHandle[] = [];

    // Matches this codebase's existing prefers-reduced-motion convention
    // (client/src/styles/motifs.css) of gating smooth/animated effects
    // behind the media query rather than always animating.
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sets which line is marked active, moving the `.active` class rather
    // than re-rendering all lines, and scrolls the newly-active line into
    // view. Called both from the synchronous initial-mount population
    // (index 0, "upcoming" line, ui.md) and from each playerPositionChanged
    // tick below — same "one function, two call sites" shape as
    // lyrics-overlay.ts's updateActiveSyllable/centerActiveSyllable split.
    function setActiveLine(index: number): void {
      if (index === activeLineIndex) return;
      if (activeLineIndex >= 0) lineEls[activeLineIndex].classList.remove('active');
      if (index >= 0) {
        const el = lineEls[index];
        el.classList.add('active');
        el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
      activeLineIndex = index;
    }

    // Gap detection (ui.md "Gap timing indicator") needs both the .lrc's
    // full parsed line list (fetched below) and the headless instance's own
    // loaded score (lyrics-gap-timing.ts's computeGapTiming reads the
    // score's masterBars/tempo data) — these resolve independently and in
    // no guaranteed order, so this is called from both completion points
    // and only actually computes once both are available.
    function tryComputeGaps(): void {
      if (!gapScore || !pendingAllLines) return;
      gaps = findLyricGaps(gapScore, pendingAllLines);
      renderGapIndicators();
    }

    // T002 (feedback F006): the 4 count-in dots render as an inline prefix
    // on the upcoming line's own `.lyric-line` text (e.g. "···· Hello
    // there") rather than as a separate element positioned above it —
    // inserted as the line's leading children, ahead of its existing text
    // node, so removing them later (updateGapIndicators) leaves the
    // original text intact. The drain bar stays a separate element,
    // positioned directly above the upcoming line via insertBefore against
    // the *rendered* line list's own DOM nodes (lineEls) — insertBeforeIndex
    // === lineEls.length never occurs since this feature only covers a
    // leading gap or a gap between two real lines (plan: a trailing gap
    // after the last line is out of scope), so a reference node always
    // exists. brand.md: the drain bar carries both theme-specific classes
    // unconditionally (`.gap-drain-tape`/`.gap-drain-led`, T006) — CSS
    // decides which one actually renders per data-theme, same convention as
    // HazardBar's own `.hazard-stripes`/`.led-marquee` pair.
    function renderGapIndicators(): void {
      for (const handle of gapIndicators) {
        handle.dotEls.forEach((dot) => dot.remove());
        handle.drainEl.remove();
      }
      gapIndicators = gaps.map((gap) => {
        const lineEl = lineEls[gap.insertBeforeIndex];

        const dotFrag = document.createDocumentFragment();
        const dotEls = Array.from({ length: 4 }, () => {
          const dot = document.createElement('span');
          dot.className = 'gap-dot';
          dotFrag.appendChild(dot);
          return dot;
        });
        lineEl.insertBefore(dotFrag, lineEl.firstChild);

        const drainEl = document.createElement('div');
        drainEl.className = 'gap-drain gap-drain-tape gap-drain-led';
        drainEl.style.setProperty('--gap-fill', '1');
        containers.fullLyricsEl.insertBefore(drainEl, lineEl);

        return { gap, lineEl, dotEls, drainEl };
      });
    }

    // Lights each gap's dots in turn as its beat timestamps are reached, and
    // continuously shrinks its drain bar's --gap-fill from 1 (gap start) to
    // 0 (gap end) — same custom-property mechanism as HazardBar's
    // --hazard-fill, on this separate element (brand.md: not a second
    // HazardBar instance).
    // T001 (feedback F003/F004): a gap's indicator (drain bar + dots) is
    // frozen in place forever once its gap fully elapses unless removed
    // here — the DOM node otherwise just sits there, fully drained/dotted,
    // for the rest of the song. Removed from both the DOM and the tracked
    // `gapIndicators` array (not just hidden) once `currentTimeMs` passes
    // `gap.endMs`, mirroring `renderGapIndicators`'s own removal shape.
    function updateGapIndicators(currentTimeMs: number): void {
      gapIndicators = gapIndicators.filter(({ gap, dotEls, drainEl }) => {
        if (currentTimeMs > gap.endMs) {
          dotEls.forEach((dot) => dot.remove());
          drainEl.remove();
          return false;
        }
        return true;
      });

      for (const { gap, dotEls, drainEl } of gapIndicators) {
        const totalMs = gap.endMs - gap.startMs;
        const fill = totalMs > 0 ? Math.max(0, Math.min(1, (gap.endMs - currentTimeMs) / totalMs)) : 0;
        drainEl.style.setProperty('--gap-fill', String(fill));

        let activeDot = -1;
        for (let i = 0; i < gap.timing.beatTimestampsMs.length; i++) {
          if (gap.timing.beatTimestampsMs[i] <= currentTimeMs) activeDot = i;
        }
        dotEls.forEach((dot, i) => dot.classList.toggle('active', i === activeDot));
      }
    }

    fetch(song.lyricsLrc)
      .then((res) => res.text())
      .then((content) => {
        const allLines = parseLrc(content);
        lrcLines = allLines.filter((l) => l.text.length > 0);
        containers.fullLyricsEl.textContent = '';
        lineEls = lrcLines.map((line) => {
          const el = document.createElement('div');
          el.className = 'lyric-line';
          el.textContent = line.text;
          containers.fullLyricsEl.appendChild(el);
          return el;
        });
        // T003 (feedback F005): no line is marked active synchronously on
        // load — a prior "upcoming" pre-highlight of line 0 here read as
        // wrong for songs with a leading instrumental gap, since it claimed
        // a line was active before any real playback position confirmed
        // its timestamp had been reached. The sheet is still populated
        // immediately (never blank during an instrumental intro), just
        // with no line highlighted until a genuine playerPositionChanged
        // event below clears one.
        pendingAllLines = allLines;
        tryComputeGaps();
      });

    api.scoreLoaded.on((score) => {
      gapScore = score;
      tryComputeGaps();
    });

    api.playerPositionChanged.on((e) => {
      if (lineEls.length === 0) return;
      // T003 (feedback F005): alphaTab fires an internal playerPositionChanged
      // during setup, well before real playback, with currentTime near/at 0
      // (same pattern as the isSeek internal-event guard elsewhere in this
      // file) — that's not a "genuine" position update confirming a line's
      // timestamp has been reached, so it's ignored here just like the seek
      // listener already ignores its own internal pre-ready events.
      if (!api.isReadyForPlayback) return;
      // T003 (feedback F005): defaults to -1 (no active line) rather than
      // the first line — a real playerPositionChanged event must actually
      // confirm a line's timestamp has been reached before it's marked
      // active. (A first line whose own timestamp is 0 still activates
      // immediately once that genuine event arrives, e.g. `currentTime: 0`.)
      let index = -1;
      for (let i = 0; i < lrcLines.length; i++) {
        if (lrcLines[i].timeMs <= e.currentTime) index = i;
        else break;
      }
      setActiveLine(index);
      updateGapIndicators(e.currentTime);
    });
  }

  // Hazard-bar real playback progress (plan-hazard-bar-progress): a third,
  // narrowly-scoped playerPositionChanged subscription, distinct from the
  // lrc-line-matching and seek-broadcast ones elsewhere in this function.
  // Registered unconditionally (not gated on host/session role) since this
  // is a purely local "how far along is my own view" readout, not a
  // cross-participant sync concern — each participant's own instance
  // already advances independently, consistent with how the cursor itself
  // works.
  api.playerPositionChanged.on((e) => {
    const ratio = e.endTime > 0 ? e.currentTime / e.endTime : 0;
    clientStore.update((s) => ({ ...s, playbackProgress: ratio }));
  });

  // Drift correction + metronome/count-in settings (infrastructure.md) — runs
  // for the lifetime of the engine, not gated on which view is showing.
  // Also gates host-only, paused-only seek (ui.md) and tracks the last tick
  // this subscription applied itself, so the seek listener below can tell a
  // real user seek apart from correctDrift's own programmatic assignment.
  let lastAppliedInteraction: boolean | undefined;
  let lastProgrammaticTick: number | null = null;
  let lastAppliedSpotlightTick: number | null = null;
  let latestSession: Session | null = null;
  let latestSelfId: string | null = null;

  clientStore.subscribe((s) => {
    latestSession = s.session;
    latestSelfId = s.selfParticipantId;
    if (!s.session || !api.isReadyForPlayback) return;

    // alphaTab's native click-to-seek is already active by default
    // (settings.player.enableUserInteraction) — restrict it to the host,
    // and only while paused, rather than building custom seek UI
    // (constitution Principle V).
    const isHost = s.session.hostId === s.selfParticipantId;
    const canSeek = isHost && s.session.playbackState.status !== 'running';
    if (canSeek !== lastAppliedInteraction) {
      api.settings.player.enableUserInteraction = canSeek;
      api.updateSettings();
      lastAppliedInteraction = canSeek;
    }

    correctDrift(api, s.session.playbackState, isHost, (tick) => {
      lastProgrammaticTick = tick;
    });
    applyPlaybackSettings(api, s.session);

    // Spotlight mode (ui.md "lobby cursor"): force this participant's view
    // to follow the host's lobbyCursorTick only while the host-only toggle
    // is on. Guarded on the tick actually changing, not just re-applied
    // every store tick, and tracked via lastProgrammaticTick so the seek
    // listener below doesn't mistake this for a real user seek.
    if (s.session.spotlightMode && s.session.lobbyCursorTick !== null && s.session.lobbyCursorTick !== lastAppliedSpotlightTick) {
      lastAppliedSpotlightTick = s.session.lobbyCursorTick;
      api.tickPosition = s.session.lobbyCursorTick;
      lastProgrammaticTick = s.session.lobbyCursorTick;
    }
  });

  // Broadcasts a host's seek to the rest of the session. Guarded against a
  // feedback loop: correctDrift's own `api.tickPosition = ...` assignment
  // above fires this same event with `isSeek: true` — ignore any seek that
  // matches the tick we just applied ourselves rather than one the host
  // actually clicked. Also guarded on `isReadyForPlayback`: alphaTab fires
  // its own internal `isSeek: true` position-reset while the sequencer is
  // still preparing MIDI (confirmed empirically — `currentTick` lands near
  // the start with `isReadyForPlayback` still false), well before the host
  // could have clicked anything; without this guard that spurious internal
  // event gets broadcast as a real seek. The actual network send is
  // debounced (plan-lobby-cursor-race-2026-07-04.md) so a rapid burst of
  // clicks collapses to one broadcast after the host stops clicking,
  // instead of every intermediate click force-resetting every other
  // participant's view — the guards above still run synchronously per raw
  // event (same-tick-sensitive against lastProgrammaticTick), only the send
  // itself is coalesced.
  const debouncedSendSeek = debounce((tickPosition: number) => {
    wsClient.send({ type: 'playback-control', action: 'seek', tickPosition });
  }, 150);
  api.playerPositionChanged.on((e) => {
    if (!e.isSeek) return;
    if (!api.isReadyForPlayback) return;
    if (e.currentTick === lastProgrammaticTick) return;
    if (!latestSession || latestSession.hostId !== latestSelfId) return;
    debouncedSendSeek(e.currentTick);
  });

  // Host-only periodic tick-report (infrastructure.md Session & Real-Time
  // Sync): the server can't compute tickPosition itself (it never parses
  // the GP file), so the host's client periodically self-reports its own
  // real, continuously-advancing api.tickPosition while playback is
  // running. Checked fresh each tick against latestSession/latestSelfId
  // (set above, before the isReadyForPlayback gate) — deliberately NOT
  // folded into the clientStore.subscribe block above, since that block
  // early-returns whenever !api.isReadyForPlayback, which never becomes
  // true under browser automation (per this file's CT test's scope note);
  // gating the reporter on it too would make it untestable in CT for the
  // same reason. Also deliberately not gated on isReadyForPlayback for the
  // same reason — in real production the host has already passed the
  // readiness flow by the time status is 'running', so this is a
  // non-issue in practice.
  setInterval(() => {
    if (!latestSession || latestSession.hostId !== latestSelfId) return;
    if (latestSession.playbackState.status !== 'running') return;
    wsClient.send({ type: 'playback-tick-report', tickPosition: api.tickPosition });
  }, 1000);
}

/**
 * Forces a real alphaTab render once the tab container is actually shown
 * (App.svelte calls this once, right after the container becomes visible).
 * No-op for a lyrics-part participant (no visible tab canvas). If the score
 * hasn't loaded yet, this is a no-op too — but only because the engine's own
 * `scoreLoaded` handler will still fire later and, per its own
 * `renderedWhileVisible` check, render for real at that point (the
 * container is already visible by then). If the score *has* already loaded
 * — including the narrow-window case where `scoreLoaded` fired while the
 * container was still hidden, silently no-opping its own render — this is
 * the one remaining place that owes the engine a real render, so it forces
 * one whenever `renderedWhileVisible` is false, not only when `scoreLoaded`
 * itself hasn't fired yet (self-healing rather than order-dependent).
 */
/** Destroys the live engine (stopping any playback) and resets the store's engineReady flag so the loading indicator reappears for the next engine. */
function destroyEngine(): void {
  if (!state) return;
  // api.destroy() only tears down alphaTab's own DOM/synth — the lyrics
  // ticker overlay is this module's DOM (createLyricsOverlay) and would
  // otherwise keep scrolling the OLD song's lyrics under the new engine
  // (observed live during the F001 fix verification).
  state.overlay?.destroy();
  state.api.destroy();
  state = undefined;
  clientStore.update((s) => (s.engineReady ? { ...s, engineReady: false } : s));
}

/**
 * Tears the engine down the moment the session's selectedSong no longer
 * matches what it has loaded (feedback F001) — called reactively from
 * App.svelte on every selectedSong change. This covers the window where the
 * host has changed songs but this participant hasn't re-picked a part yet
 * (the server clears selectedPart on song change, so ensurePlaybackEngine's
 * own song-identity teardown wouldn't run until a part is chosen): without
 * this, a Start landing in that window would play the OLD song's still-loaded
 * score. No-op when the engine already matches (or none exists).
 */
export function dropEngineIfSongChanged(songId: string): void {
  if (state && state.songId !== songId) destroyEngine();
}

export function renderNowVisible(): void {
  if (!state || state.isLyricsPart) return;
  if (state.scoreLoaded && !state.renderedWhileVisible) {
    state.renderedWhileVisible = true;
    state.api.render();
    markEngineReadyIfComplete();
  }
}

/**
 * Flips `clientStore.engineReady` once this participant's own tab/lyrics
 * have actually rendered (T009, tasks-session-lifecycle-836f) — `scoreLoaded`
 * plus, for an instrument part, a real render having happened while visible
 * (`renderedWhileVisible`). Read by `Playback.svelte`'s loading indicator;
 * distinct from the cross-participant `Participant.readiness` broadcast
 * (which also folds in SoundFont load and is a different concern — see
 * `ClientState.engineReady`'s doc comment in store.ts).
 */
function markEngineReadyIfComplete(): void {
  if (state && state.scoreLoaded && state.renderedWhileVisible) {
    clientStore.update((s) => (s.engineReady ? s : { ...s, engineReady: true }));
  }
}

export function toggleOverlay(): void {
  if (!state) return;
  state.showOverlay = !state.showOverlay;
  state.overlay?.setVisible(state.showOverlay);
  // Mirrors into clientStore (tasks-bottom-bar-icons-47a6.md T004) so
  // App.svelte can reactively collapse the strip's reserved
  // `padding-bottom` — this module-closure flag isn't otherwise visible
  // outside playback-engine.ts.
  clientStore.update((s) => ({ ...s, lyricsOverlayVisible: state!.showOverlay }));
}

/** Test-only accessor — not used by app code. Exposes the module's private engine state (specifically its alphaTab `api`) so component tests can assert on real drift-correction/Spotlight-mode/seek behavior without duplicating the wiring. */
export function __getEngineStateForTesting(): { api: AlphaTabApi; scoreLoaded: boolean } | undefined {
  return state;
}

export function setEngineTheme(theme: Theme): void {
  if (!state) return;
  state.theme = theme;
  if (!state.isLyricsPart) setTheme(state.api, state.theme);
}

/** Applies the personal metronome preference to the live engine (visible or headless alike); no-op when no engine is active — same contract as setEngineTheme. */
export function setEngineMetronome(enabled: boolean): void {
  if (!state) return;
  state.api.metronomeVolume = enabled ? 1 : 0;
}

/**
 * Applies a personal "mute this part" preference (ui.md Preferences tab,
 * track-mute-preference.ts) to the live engine's currently loaded score via
 * alphaTab's own api.changeTrackMute() — every participant's instance
 * already plays the full multi-track mix regardless of which part they're
 * rendering, so this only silences a track locally, never touching what's
 * loaded or session state. No-op (not a throw) both when no engine exists
 * yet and when the score hasn't loaded — changeTrackMute needs real Track
 * objects that only exist once scoreLoaded has fired and populated
 * state.score (mirrors setEngineMetronome's `if (!state) return;` shape,
 * with an added guard for state.score).
 */
/** Applies the personal lyrics-ticker font-size preference to the live overlay (if one exists); no-op otherwise — same contract as setEngineMetronome. */
export function setEngineLyricsTickerFontSize(size: LyricsTickerFontSize): void {
  state?.overlay?.setFontSize(size);
}

/** Applies the personal "Measure markers" preference to the live overlay (if one exists); no-op otherwise — same contract as setEngineMetronome. */
export function setEngineMeasureMarkersVisible(visible: boolean): void {
  state?.overlay?.setMeasureMarkersVisible(visible);
}

export function setEngineTrackMute(trackIndex: number, muted: boolean): void {
  if (!state) return;
  if (!state.score) return;
  const track = state.score.tracks[trackIndex];
  if (!track) return;
  state.api.changeTrackMute([track], muted);
}
