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
  $: participant = $clientStore.session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';

  function toggleOverlay() {
    engineToggleOverlay();
  }

  function toggleTheme() {
    theme = engineToggleTheme();
    document.documentElement.dataset.theme = theme;
  }
</script>

<section>
  <h1>Playback</h1>
  <button onclick={toggleTheme}>Toggle {theme === 'dark' ? 'light' : 'dark'} mode</button>
  {#if !isLyricsPart}
    <button onclick={toggleOverlay}>Toggle lyrics overlay</button>
  {/if}
</section>
