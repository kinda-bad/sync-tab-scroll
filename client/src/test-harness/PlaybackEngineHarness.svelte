<script lang="ts">
  import { onMount } from 'svelte';
  import { ensurePlaybackEngine, __getEngineStateForTesting } from '../playback-engine';
  import type { CatalogSong } from '@sync-tab-scroll/shared';
  import type { WsClient } from '../ws-client';

  export let gpFilePath: string;
  export let trackIndex: number;

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;

  onMount(() => {
    const sent: unknown[] = [];
    const wsClient: WsClient = { send: (m) => sent.push(m) };
    (window as unknown as { __sentMessages: unknown[]; __wsClient: WsClient; __getApi: () => unknown }).__sentMessages = sent;
    (window as unknown as { __wsClient: WsClient }).__wsClient = wsClient;
    (window as unknown as { __getApi: () => unknown }).__getApi = () => __getEngineStateForTesting()?.api;

    const song: CatalogSong = {
      id: 'creep',
      name: 'Creep',
      artist: 'Radiohead',
      gpFilePath,
      parts: [{ instrumentName: 'Guitar', trackIndex }],
      lyricsLrc: null,
      lyricsTrackIndex: 0,
      lyricsLineIndex: 0,
      lyricLineBreaks: [6, 7, 6],
    };

    ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, wsClient, song, trackIndex, false);
  });
</script>

<div bind:this={tabContainer} data-testid="tab-container"></div>
<div bind:this={overlayContainer} data-testid="overlay-container"></div>
<div bind:this={fullLyricsEl} data-testid="full-lyrics"></div>
