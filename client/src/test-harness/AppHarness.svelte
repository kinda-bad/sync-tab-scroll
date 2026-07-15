<script lang="ts">
  import { onMount } from 'svelte';
  import App from '../App.svelte';
  import { clientStore } from '../store';
  import type { WsClient } from '../ws-client';

  onMount(() => {
    const wsClient: WsClient = { send: () => {}, close: () => {} };
    (window as unknown as { __clientStore: typeof clientStore; __wsClient: WsClient }).__clientStore = clientStore;
    (window as unknown as { __wsClient: WsClient }).__wsClient = wsClient;
  });
</script>

<App />
