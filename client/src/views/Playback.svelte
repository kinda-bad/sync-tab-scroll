<script lang="ts">
  import { onMount } from 'svelte';
  import type { AlphaTabApi } from '@coderline/alphatab';
  import { createTabRenderer, setTheme, type Theme } from '../tab-renderer';
  import { createHeadlessPlayer } from '../headless-player';
  import { createWsClient } from '../ws-client';
  import { correctDrift, applyPlaybackSettings } from '../playback-sync';
  import { clientStore } from '../store';
  import { walkLyricBeats, groupIntoLines } from '../lyrics-beat-walk';
  import { createLyricsOverlay, type LyricsOverlay } from '../lyrics-overlay';
  import { parseLrc, type LrcLine } from '../lrc-parser';
  import { waitUntilReady } from '../readiness';

  // TODO: wire gpFilePath/trackIndex/lyrics pointer from real song/part
  // selection (no song-picker WS flow exists yet — out of scope for
  // T015-T023, which prove the rendering/sync/overlay mechanisms). Fixed
  // test fixture + its real pipeline-generated lyricLineBreaks for now.
  //
  // This array sums to 231, one short of the 232 syllables walkLyricBeats
  // finds after deduplicating tied/melisma beats — verified this is the
  // pipeline's own actual output (packages/pipeline), not a copy error:
  // its countSyllables heuristic undercounts by exactly 1 on this file's
  // final line. A pre-existing, minor, already-documented heuristic edge
  // case (see line-breaks.ts's doc comment) — the overlay correctly drops
  // the trailing syllable that has no matching line rather than crashing.
  const LYRICS_TRACK_INDEX = 0;
  const LYRICS_LINE_INDEX = 0;
  const LYRIC_LINE_BREAKS = [
    6, 7, 6, 5, 8, 6, 6, 6, 8, 9, 5, 6, 6, 7, 6, 9, 5, 6, 6, 8, 9, 9, 13, 5, 8, 5, 7, 5, 6, 6, 8, 9, 5, 5,
  ];

  const params = new URLSearchParams(location.search);
  const isLyricsPart = params.get('part') === 'lyrics';

  let container: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;
  let showOverlay = true;
  let api: AlphaTabApi;
  let overlay: LyricsOverlay | undefined;
  let theme: Theme = 'dark';

  onMount(() => {
    const onDestroyCallbacks: Array<() => void> = [];

    const wsClient = createWsClient(`ws://${location.hostname}:8080`);

    const asHost = params.get('join') === null;
    if (asHost) {
      wsClient.send({ type: 'session-create', displayName: 'Host' });
    } else {
      wsClient.send({ type: 'session-join', code: params.get('join')!, displayName: 'Member' });
    }
    wsClient.send({ type: 'readiness-update', readiness: 'loading' });

    api = isLyricsPart
      ? createHeadlessPlayer('/test/creep.gp', 1)
      : createTabRenderer({ container, gpFilePath: '/test/creep.gp', trackIndex: 1 });

    // Loading spans both the .gp parse/render and the SoundFont load,
    // whichever finishes last (infrastructure.md, ui.md Loading state) —
    // applies identically to visible and headless instances.
    waitUntilReady(api).then(() => wsClient.send({ type: 'readiness-update', readiness: 'ready' }));

    if (!isLyricsPart) {
      const unsubscribeScore = api.scoreLoaded.on((score) => {
        const syllables = walkLyricBeats(score, LYRICS_TRACK_INDEX, LYRICS_LINE_INDEX);
        const lines = groupIntoLines(syllables, LYRIC_LINE_BREAKS);
        overlay = createLyricsOverlay(api, lines, overlayContainer);
        overlay.setVisible(showOverlay);
      });
      onDestroyCallbacks.push(unsubscribeScore);
    } else {
      let lrcLines: LrcLine[] = [];
      let activeLineIndex = -1;
      fetch('/test/creep.lrc')
        .then((res) => res.text())
        .then((content) => {
          lrcLines = parseLrc(content).filter((l) => l.text.length > 0);
        });

      const onPosition = (e: { currentTime: number }) => {
        let index = -1;
        for (let i = 0; i < lrcLines.length; i++) {
          if (lrcLines[i].timeMs <= e.currentTime) index = i;
          else break;
        }
        if (index === activeLineIndex) return;
        activeLineIndex = index;
        if (fullLyricsEl) fullLyricsEl.textContent = index >= 0 ? lrcLines[index].text : '';
      };
      api.playerPositionChanged.on(onPosition);
      onDestroyCallbacks.push(() => api.playerPositionChanged.off(onPosition));
    }

    const unsubscribeStore = clientStore.subscribe((state) => {
      if (!state.session || !api.isReadyForPlayback) return;
      correctDrift(api, state.session.playbackState);
      applyPlaybackSettings(api, state.session);
    });
    onDestroyCallbacks.push(unsubscribeStore);

    return () => {
      for (const cb of onDestroyCallbacks) cb();
      overlay?.destroy();
      api.destroy();
    };
  });

  function toggleOverlay() {
    showOverlay = !showOverlay;
    overlay?.setVisible(showOverlay);
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    if (!isLyricsPart) setTheme(api, theme);
  }
</script>

<section>
  <h1>Playback</h1>
  <button onclick={toggleTheme}>Toggle {theme === 'dark' ? 'light' : 'dark'} mode</button>
  {#if !isLyricsPart}
    <button onclick={toggleOverlay}>Toggle lyrics overlay</button>
    <div bind:this={container} class="tab-container"></div>
    <div bind:this={overlayContainer}></div>
  {:else}
    <div bind:this={fullLyricsEl} class="full-lyrics-view"></div>
  {/if}
</section>

<style>
  .tab-container {
    background: var(--canvas-bg, #0a0a0a);
    min-height: 400px;
  }
</style>
