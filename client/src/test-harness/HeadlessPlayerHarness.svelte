<script lang="ts">
  import { onMount } from 'svelte';
  import { createHeadlessPlayer } from '../headless-player';

  export let gpFilePath: string;
  export let trackIndex: number = 0;

  let ready = false;

  onMount(() => {
    const api = createHeadlessPlayer(gpFilePath, trackIndex);
    (window as unknown as { __api: unknown }).__api = api;
    // scoreLoaded only, not waitUntilReady (scoreLoaded + soundFontLoaded):
    // this harness only needs to confirm score-loading plumbing works
    // headlessly. (soundFontLoaded *does* fire under CT now that the synth
    // worker assets are emitted — see playwright.config.ts — so tightening
    // this to full readiness is possible if a test ever needs it.)
    api.scoreLoaded.on(() => {
      ready = true;
    });
  });
</script>

<div data-testid="status">{ready ? 'ready' : 'loading'}</div>
