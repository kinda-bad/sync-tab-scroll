<script lang="ts">
  import { onMount } from 'svelte';
  import ConnectionBanner from '../components/ConnectionBanner.svelte';
  import { clientStore } from '../store';
  import type { ConnectionStatus } from '../ws-client';

  export let status: ConnectionStatus;
  // The banner reflects the health of the one shared WsClient — so it should
  // only appear once a connection is actually being maintained. On Landing
  // there is no WsClient yet (connect() hasn't run), so the default
  // `connecting` status must NOT surface the banner. Defaults to true so the
  // existing "visible while connecting/disconnected" cases exercise the
  // in-session shape; the Landing case passes `hasWsClient={false}`.
  export let hasWsClient = true;

  const stubWsClient = { send() {}, close() {} };

  onMount(() => {
    clientStore.update((s) => ({
      ...s,
      connectionStatus: status,
      wsClient: hasWsClient ? stubWsClient : null,
    }));
  });
</script>

<!--
  Wrapped in a container so ConnectionBanner's own root div is a descendant
  of the mount root, not the mount root itself — otherwise Playwright CT's
  component.getByTestId(), which searches descendants, never sees a testid
  attribute that sits on the single top-level element being mounted.
-->
<div>
  <ConnectionBanner />
</div>
