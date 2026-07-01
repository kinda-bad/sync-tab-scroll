<script lang="ts">
  import { toggleOverlay as engineToggleOverlay, toggleTheme as engineToggleTheme, getEngine } from '../playback-engine';

  let theme: 'dark' | 'light' = 'dark';

  $: isLyricsPart = getEngine()?.isLyricsPart ?? false;

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
