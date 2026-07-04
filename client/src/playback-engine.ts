import type { AlphaTabApi } from '@coderline/alphatab';
import type * as at from '@coderline/alphatab';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import { createTabRenderer, setTheme, switchTrack, type Theme } from './tab-renderer';
import { createHeadlessPlayer } from './headless-player';
import { walkLyricBeats, groupIntoLines } from './lyrics-beat-walk';
import { createLyricsOverlay, type LyricsOverlay } from './lyrics-overlay';
import { parseLrc, type LrcLine } from './lrc-parser';
import { waitUntilReady } from './readiness';
import { correctDrift, applyPlaybackSettings } from './playback-sync';
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
    if (state.isLyricsPart !== isLyricsPart) {
      state.api.destroy();
      state = undefined;
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
  const theme: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  const api = isLyricsPart ? createHeadlessPlayer(song.gpFilePath, trackIndex) : createTabRenderer({ container: containers.tabContainer, gpFilePath: song.gpFilePath, trackIndex, theme });

  state = { api, isLyricsPart, trackIndex, theme, showOverlay: true, scoreLoaded: false, renderedWhileVisible: isLyricsPart };

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
    markEngineReadyIfComplete();
  });

  if (!isLyricsPart && song.lyricsTrackIndex !== null && song.lyricsLineIndex !== null && song.lyricLineBreaks) {
    const lyricsTrackIndex = song.lyricsTrackIndex;
    const lyricsLineIndex = song.lyricsLineIndex;
    const lyricLineBreaks = song.lyricLineBreaks;
    api.scoreLoaded.on((score) => {
      const syllables = walkLyricBeats(score, lyricsTrackIndex, lyricsLineIndex);
      const lines = groupIntoLines(syllables, lyricLineBreaks);
      state!.overlay = createLyricsOverlay(api, lines, containers.overlayContainer);
      state!.overlay.setVisible(state!.showOverlay);
    });
  } else if (isLyricsPart && song.lyricsLrc) {
    let lrcLines: LrcLine[] = [];
    let activeLineIndex = -1;
    fetch(song.lyricsLrc)
      .then((res) => res.text())
      .then((content) => {
        lrcLines = parseLrc(content).filter((l) => l.text.length > 0);
      });

    api.playerPositionChanged.on((e) => {
      let index = -1;
      for (let i = 0; i < lrcLines.length; i++) {
        if (lrcLines[i].timeMs <= e.currentTime) index = i;
        else break;
      }
      if (index === activeLineIndex) return;
      activeLineIndex = index;
      containers.fullLyricsEl.textContent = index >= 0 ? lrcLines[index].text : '';
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
