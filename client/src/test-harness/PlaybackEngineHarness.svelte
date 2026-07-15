<script lang="ts">
  import { onMount } from 'svelte';
  import { ensurePlaybackEngine, renderNowVisible, setEngineTrackMute, __getEngineStateForTesting } from '../playback-engine';
  import { clientStore } from '../store';
  import type { CatalogSong } from '@sync-tab-scroll/shared';
  import type { WsClient } from '../ws-client';

  export let gpFilePath: string;
  export let trackIndex: number;
  export let startHidden = false;
  // T001 (tasks-lyrics-only-view-fix-2-c7cf.md): lets a CT test exercise
  // the headless lyrics-part path through the real ensurePlaybackEngine
  // wiring (lrc fetch + playerPositionChanged line-matching), instead of
  // reimplementing that logic in the harness itself.
  export let isLyricsPart = false;
  export let lyricsLrc: string | null = null;

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;

  onMount(() => {
    const sent: unknown[] = [];
    const wsClient: WsClient = { send: (m) => sent.push(m), close: () => {} };
    (window as unknown as { __sentMessages: unknown[]; __wsClient: WsClient; __getApi: () => unknown }).__sentMessages = sent;
    (window as unknown as { __wsClient: WsClient }).__wsClient = wsClient;
    (window as unknown as { __getApi: () => unknown }).__getApi = () => __getEngineStateForTesting()?.api;
    (window as unknown as { __getEngineState: () => unknown }).__getEngineState = () => __getEngineStateForTesting();
    // Test-only: exposes the real clientStore so a CT test can drive
    // isHost/playbackState.status without a real WS server — the reporter
    // timer under test (playback-engine.ts) reads this store directly.
    (window as unknown as { __clientStore: typeof clientStore }).__clientStore = clientStore;
    // Test-only hook for T007's render-race repro (tasks-session-lifecycle-836f.md):
    // lets the test call the exact production function at a controlled instant,
    // and separately lets the test flip visibility independent of any Svelte
    // reactive block (App.svelte's own tick()+rAF safety net isn't present here).
    (window as unknown as { __renderNowVisible: () => void }).__renderNowVisible = renderNowVisible;
    // Test-only hook for T002 (tasks-part-mute-toggle-f0d4.md): lets a CT
    // test call the real setEngineTrackMute against this harness's engine.
    (window as unknown as { __setEngineTrackMute: (trackIndex: number, muted: boolean) => void }).__setEngineTrackMute = setEngineTrackMute;

    const song: CatalogSong = {
      id: 'creep',
      name: 'Creep',
      artist: 'Radiohead',
      gpFilePath,
      parts: [
        { instrumentName: 'Guitar', trackIndex: 0 },
        { instrumentName: 'Bass', trackIndex: 1 },
      ],
      lyricsLrc,
      lyricsTrackIndex: 0,
      lyricsLineIndex: 0,
      lyricLineBreaks: [6, 7, 6],
    };

    ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, wsClient, song, trackIndex, isLyricsPart);

    // Test-only: mirrors App.svelte's reactive re-invocation of
    // ensurePlaybackEngine when a participant's selectedPart changes —
    // lets a CT test simulate a part switch without a real session/store.
    (window as unknown as { __switchPart: (newTrackIndex: number) => void }).__switchPart = (newTrackIndex: number) => {
      ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, wsClient, song, newTrackIndex, isLyricsPart);
    };
  });
</script>

<div bind:this={tabContainer} data-testid="tab-container" style={startHidden ? 'display: none' : ''}></div>
<div bind:this={overlayContainer} data-testid="overlay-container"></div>
<div bind:this={fullLyricsEl} data-testid="full-lyrics" class="full-lyrics-view" class:visible={isLyricsPart}></div>
