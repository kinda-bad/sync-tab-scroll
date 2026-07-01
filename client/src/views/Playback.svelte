<script lang="ts">
  import { onMount } from 'svelte';
  import { createTabRenderer } from '../tab-renderer';

  // TODO: wire gpFilePath/trackIndex from session state (server catalog +
  // participant's selected part) once the client store carries session
  // data — this view currently renders a fixed test fixture to prove the
  // live-rendering mechanism itself (Phase 4), not the session wiring.
  let container: HTMLDivElement;

  onMount(() => {
    const api = createTabRenderer({
      container,
      gpFilePath: '/test/creep.gp',
      trackIndex: 1,
    });
    return () => api.destroy();
  });
</script>

<section>
  <h1>Playback</h1>
  <div bind:this={container} class="tab-container"></div>
</section>

<style>
  .tab-container {
    background: #0a0a0a;
    min-height: 400px;
  }
</style>
