import type { AlphaTabApi } from '@coderline/alphatab';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import { createTabRenderer, setTheme, type Theme } from './tab-renderer';
import { createHeadlessPlayer } from './headless-player';
import { walkLyricBeats, groupIntoLines } from './lyrics-beat-walk';
import { createLyricsOverlay, type LyricsOverlay } from './lyrics-overlay';
import { parseLrc, type LrcLine } from './lrc-parser';
import { waitUntilReady } from './readiness';
import { correctDrift, applyPlaybackSettings } from './playback-sync';
import { clientStore } from './store';
import type { WsClient } from './ws-client';

export interface EngineContainers {
  tabContainer: HTMLElement;
  overlayContainer: HTMLElement;
  fullLyricsEl: HTMLElement;
}

interface EngineState {
  api: AlphaTabApi;
  overlay?: LyricsOverlay;
  isLyricsPart: boolean;
  theme: Theme;
  showOverlay: boolean;
  scoreLoaded: boolean;
}

let state: EngineState | undefined;

/**
 * Creates the alphaTab/headless instance the moment a participant's part is
 * known (song selected + selectedPart set) — in the Lobby, not on
 * Playback.svelte mount — so per-participant loading/readiness (ui.md) can
 * actually resolve before the host starts playback. Idempotent: a second
 * call while already created (or mid-creation) is a no-op.
 */
export function ensurePlaybackEngine(containers: EngineContainers, wsClient: WsClient, song: CatalogSong, trackIndex: number, isLyricsPart: boolean): void {
  if (state) return;

  wsClient.send({ type: 'readiness-update', readiness: 'loading' });

  const api = isLyricsPart ? createHeadlessPlayer(song.gpFilePath, trackIndex) : createTabRenderer({ container: containers.tabContainer, gpFilePath: song.gpFilePath, trackIndex });

  state = { api, isLyricsPart, theme: 'dark', showOverlay: true, scoreLoaded: false };

  waitUntilReady(api).then(() => wsClient.send({ type: 'readiness-update', readiness: 'ready' }));

  // The engine is created (and its first render fires) while still in the
  // Lobby, with the tab container hidden via `display:none` (T011c) —
  // alphaTab skips that render ("width=0, element invisible") and never
  // re-renders on its own once the container is shown. Track load state so
  // `renderNowVisible` can force a real render once the Playback view
  // actually shows the container.
  api.scoreLoaded.on(() => {
    state!.scoreLoaded = true;
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

  // Drift correction + metronome/count-in settings (infrastructure.md) — runs
  // for the lifetime of the engine, not gated on which view is showing.
  // Also gates host-only, paused-only seek (ui.md) and tracks the last tick
  // this subscription applied itself, so the seek listener below can tell a
  // real user seek apart from correctDrift's own programmatic assignment.
  let lastAppliedInteraction: boolean | undefined;
  let lastProgrammaticTick: number | null = null;
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

    const appliedTick = correctDrift(api, s.session.playbackState);
    if (appliedTick !== null) lastProgrammaticTick = appliedTick;
    applyPlaybackSettings(api, s.session);
  });

  // Broadcasts a host's seek to the rest of the session. Guarded against a
  // feedback loop: correctDrift's own `api.tickPosition = ...` assignment
  // above fires this same event with `isSeek: true` — ignore any seek that
  // matches the tick we just applied ourselves rather than one the host
  // actually clicked.
  api.playerPositionChanged.on((e) => {
    if (!e.isSeek) return;
    if (e.currentTick === lastProgrammaticTick) return;
    if (!latestSession || latestSession.hostId !== latestSelfId) return;
    wsClient.send({ type: 'playback-control', action: 'seek', tickPosition: e.currentTick });
  });
}

/**
 * Forces a real alphaTab render once the tab container is actually shown
 * (App.svelte calls this on the Lobby→Playback transition). No-op for a
 * lyrics-part participant (no visible tab canvas) or if the score hasn't
 * loaded yet (the engine's own scoreLoaded render will succeed on its own
 * once it fires, since the container is visible by then).
 */
export function renderNowVisible(): void {
  if (!state || state.isLyricsPart || !state.scoreLoaded) return;
  state.api.render();
}

export function toggleOverlay(): void {
  if (!state) return;
  state.showOverlay = !state.showOverlay;
  state.overlay?.setVisible(state.showOverlay);
}

export function toggleTheme(): Theme {
  if (!state) return 'dark';
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  if (!state.isLyricsPart) setTheme(state.api, state.theme);
  return state.theme;
}
