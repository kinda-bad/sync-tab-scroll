<script lang="ts">
  import { onMount } from 'svelte';
  import ConnectionBanner from '../components/ConnectionBanner.svelte';
  import { clientStore } from '../store';
  import type { ConnectionStatus } from '../ws-client';

  export let status: ConnectionStatus;

  onMount(() => {
    clientStore.update((s) => ({ ...s, connectionStatus: status }));
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
