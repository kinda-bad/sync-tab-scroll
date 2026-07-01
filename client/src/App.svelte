<script lang="ts">
  import { clientStore } from './store';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';
</script>

{#if $clientStore.view === 'landing'}
  <Landing />
{:else if $clientStore.view === 'lobby'}
  <Lobby />
{:else}
  <Playback />
{/if}

<Toasts />
