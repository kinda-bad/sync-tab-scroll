<script lang="ts">
  import { onMount } from 'svelte';
  import { clientStore } from '../store';

  onMount(() => {
    (window as unknown as { __clientStore: typeof clientStore }).__clientStore = clientStore;
  });
</script>

<div data-testid="view">{$clientStore.view}</div>
<div data-testid="session-code">{$clientStore.session?.code ?? ''}</div>
