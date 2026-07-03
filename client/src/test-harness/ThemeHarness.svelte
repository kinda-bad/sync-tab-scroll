<script lang="ts">
  import { onMount } from 'svelte';
  import { applyTheme, loadStoredTheme, persistTheme } from '../theme';

  onMount(() => {
    (
      window as unknown as {
        __theme: { applyTheme: typeof applyTheme; loadStoredTheme: typeof loadStoredTheme; persistTheme: typeof persistTheme };
      }
    ).__theme = { applyTheme, loadStoredTheme, persistTheme };
  });
</script>

<div data-testid="theme-harness"></div>
