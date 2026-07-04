<script lang="ts">
  import { onMount } from 'svelte';
  import { createWsClient } from '../ws-client';
  import { clientStore } from '../store';
  import { toastStore } from '../toast-store';

  export let url: string;
  // Defaults to createWsClient's own 2s default; tests that need to observe
  // a retry within a reasonable timeout override this to a few ms.
  export let reconnectDelayMs: number | undefined = undefined;

  onMount(() => {
    const wsClient = createWsClient(url, reconnectDelayMs);
    // Exposed on window so the Playwright test (running on the Node side)
    // can drive `.send()` via `page.evaluate` — CT's `mount()` doesn't hand
    // the mounted instance's internals back to the test otherwise.
    (window as unknown as { __wsClient: ReturnType<typeof createWsClient> }).__wsClient = wsClient;
  });
</script>

<div data-testid="session-code">{$clientStore.session?.code ?? ''}</div>
<div data-testid="connection-status">{$clientStore.connectionStatus}</div>
<ul data-testid="toasts">
  {#each $toastStore as t (t.id)}
    <li>{t.message}</li>
  {/each}
</ul>
