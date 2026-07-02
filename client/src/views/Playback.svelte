<script lang="ts">
  import { toggleOverlay as engineToggleOverlay, toggleTheme as engineToggleTheme } from '../playback-engine';
  import { clientStore } from '../store';
  import Button from '../components/Button.svelte';
  import type { Theme } from '../tab-renderer';

  let theme: Theme = 'dark';

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
    // Same data-theme attribute the punk-rock UI chrome tokens read
    // (styles/tokens.css) — one toggle switches both the tab notation
    // colors and the rest of the app at once.
    document.documentElement.dataset.theme = theme;
  }
</script>

<section class="playback-controls">
  <Button variant="ghost" label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onclick={toggleTheme} />
  {#if !isLyricsPart}
    <Button variant="ghost" label="Toggle lyrics" onclick={toggleOverlay} />
  {/if}
</section>

<style>
  .playback-controls {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
  }
</style>
