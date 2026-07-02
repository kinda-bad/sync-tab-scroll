import type { AlphaTabApi } from '@coderline/alphatab';
import type { CatalogSong } from '@sync-tab-scroll/shared';
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

  state = { api, isLyricsPart, theme: 'dark', showOverlay: true };

  waitUntilReady(api).then(() => wsClient.send({ type: 'readiness-update', readiness: 'ready' }));

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
  clientStore.subscribe((s) => {
    if (!s.session || !api.isReadyForPlayback) return;
    correctDrift(api, s.session.playbackState);
    applyPlaybackSettings(api, s.session);
  });
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
