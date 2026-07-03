<script lang="ts">
  import { onMount } from 'svelte';
  import { createTabRenderer, setTheme, type Theme } from '../tab-renderer';

  export let gpFilePath: string;
  export let trackIndex: number = 0;
  export let theme: Theme = 'dark';

  let container: HTMLDivElement;

  onMount(() => {
    const api = createTabRenderer({ container, gpFilePath, trackIndex, theme });
    (window as unknown as { __api: unknown; __setTheme: (t: Theme) => void }).__api = api;
    (window as unknown as { __setTheme: (t: Theme) => void }).__setTheme = (t: Theme) => setTheme(api, t);
  });
</script>

<div bind:this={container} data-testid="tab-container"></div>
