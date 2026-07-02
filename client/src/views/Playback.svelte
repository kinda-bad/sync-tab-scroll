<script lang="ts">
  import { toggleOverlay as engineToggleOverlay, toggleTheme as engineToggleTheme } from '../playback-engine';
  import { clientStore } from '../store';

  let theme: 'dark' | 'light' = 'dark';

  // Derived from clientStore (constitution Principle I) rather than reading
  // playback-engine's module-singleton state reactively — a bare function
  // call (getEngine()) inside a $: block isn't actually reactive in Svelte,
  // since nothing tells it to re-run when the singleton changes. The
  // singleton itself still exists for imperative one-off calls below
  // (toggleOverlay/toggleTheme), which don't need reactivity.
  $: session = $clientStore.session;
  $: participant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: isRunning = session?.playbackState.status === 'running';

  function toggleOverlay() {
    engineToggleOverlay();
  }

  function toggleTheme() {
    theme = engineToggleTheme();
    document.documentElement.dataset.theme = theme;
  }

  function togglePause() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: isRunning ? 'pause' : 'resume' });
  }

  function stop() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: 'stop' });
  }
</script>

<section>
  <h1>Playback</h1>
  <button onclick={toggleTheme}>Toggle {theme === 'dark' ? 'light' : 'dark'} mode</button>
  {#if !isLyricsPart}
    <button onclick={toggleOverlay}>Toggle lyrics overlay</button>
  {/if}
  {#if isHost}
    <button onclick={togglePause}>{isRunning ? 'Pause' : 'Resume'}</button>
    <button onclick={stop}>Stop</button>
  {/if}
</section>
