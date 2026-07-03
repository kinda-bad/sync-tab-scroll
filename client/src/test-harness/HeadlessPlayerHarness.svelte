<script lang="ts">
  import { onMount } from 'svelte';
  import { createHeadlessPlayer } from '../headless-player';

  export let gpFilePath: string;
  export let trackIndex: number = 0;

  let ready = false;

  onMount(() => {
    const api = createHeadlessPlayer(gpFilePath, trackIndex);
    (window as unknown as { __api: unknown }).__api = api;
    // Not waitUntilReady (scoreLoaded + soundFontLoaded): Playwright CT's
    // production-style build environment 404s alphaTab's audio-worklet
    // worker (an environment-specific bundling gap, not a real-app issue —
    // verified the real vite build/dev server doesn't hit this), so
    // soundFontLoaded never fires here. This harness only needs to confirm
    // score-loading/readiness plumbing works headlessly, not audio itself
    // — consistent with the plan's existing no-audio-assertions scope.
    api.scoreLoaded.on(() => {
      ready = true;
    });
  });
</script>

<div data-testid="status">{ready ? 'ready' : 'loading'}</div>
