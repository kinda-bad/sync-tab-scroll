<script lang="ts">
  import { onMount } from 'svelte';
  import { createWsClient } from '../ws-client';
  import { clientStore } from '../store';
  import { toastStore } from '../toast-store';

  export let url: string;

  onMount(() => {
    const wsClient = createWsClient(url);
    // Exposed on window so the Playwright test (running on the Node side)
    // can drive `.send()` via `page.evaluate` — CT's `mount()` doesn't hand
    // the mounted instance's internals back to the test otherwise.
    (window as unknown as { __wsClient: ReturnType<typeof createWsClient> }).__wsClient = wsClient;
  });
</script>

<div data-testid="session-code">{$clientStore.session?.code ?? ''}</div>
<ul data-testid="toasts">
  {#each $toastStore as t (t.id)}
    <li>{t.message}</li>
  {/each}
</ul>
