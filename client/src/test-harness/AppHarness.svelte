<script lang="ts">
  import { onMount } from 'svelte';
  import App from '../App.svelte';
  import { clientStore } from '../store';
  import { __getEngineStateForTesting } from '../playback-engine';
  import type { WsClient } from '../ws-client';

  onMount(() => {
    // Records outgoing messages so CTs can assert client→server round-trips
    // (T003: the Bar's ready control sends `ready-set`).
    const sent: unknown[] = [];
    const wsClient: WsClient = { send: (m) => void sent.push(m), close: () => {} };
    (window as unknown as { __clientStore: typeof clientStore; __wsClient: WsClient; __sentMessages: unknown[] }).__clientStore = clientStore;
    (window as unknown as { __wsClient: WsClient }).__wsClient = wsClient;
    (window as unknown as { __sentMessages: unknown[] }).__sentMessages = sent;
    // Read-only handle on the engine App.svelte builds, so a CT can check
    // what the real App wiring constructed (e.g. a backing-track player).
    (window as unknown as { __getApi: () => unknown }).__getApi = () => __getEngineStateForTesting()?.api;
  });
</script>

<App />
