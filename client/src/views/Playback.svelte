<script lang="ts">
  import { onMount } from 'svelte';
  import type { AlphaTabApi } from '@coderline/alphatab';
  import { createTabRenderer } from '../tab-renderer';
  import { createHeadlessPlayer } from '../headless-player';
  import { createWsClient } from '../ws-client';
  import { correctDrift, applyPlaybackSettings } from '../playback-sync';
  import { clientStore } from '../store';

  // TODO: wire gpFilePath/trackIndex from real song/part selection (no
  // song-picker WS flow exists yet — out of scope for T015-T020, which
  // prove the rendering + sync mechanisms). Fixed test fixture for now.
  const params = new URLSearchParams(location.search);
  const isLyricsPart = params.get('part') === 'lyrics';

  let container: HTMLDivElement;
  let api: AlphaTabApi;

  onMount(() => {
    api = isLyricsPart
      ? createHeadlessPlayer('/test/creep.gp', 1)
      : createTabRenderer({ container, gpFilePath: '/test/creep.gp', trackIndex: 1 });

    const wsClient = createWsClient(`ws://${location.hostname}:8080`);

    const asHost = params.get('join') === null;
    if (asHost) {
      wsClient.send({ type: 'session-create', displayName: 'Host' });
    } else {
      wsClient.send({ type: 'session-join', code: params.get('join')!, displayName: 'Member' });
    }

    const unsubscribe = clientStore.subscribe((state) => {
      if (!state.session || !api.isReadyForPlayback) return;
      correctDrift(api, state.session.playbackState);
      applyPlaybackSettings(api, state.session);
    });

    return () => {
      unsubscribe();
      api.destroy();
    };
  });
</script>

<section>
  <h1>Playback</h1>
  {#if !isLyricsPart}
    <div bind:this={container} class="tab-container"></div>
  {:else}
    <p>Lyrics part — headless alphaTab instance (no visible staff).</p>
  {/if}
</section>

<style>
  .tab-container {
    background: #0a0a0a;
    min-height: 400px;
  }
</style>
