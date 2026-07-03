<script lang="ts">
  import Bar from '../components/Bar.svelte';
</script>

{#snippet identity()}
  <span>Song</span>
{/snippet}

{#snippet controls()}
  <span>Controls</span>
{/snippet}

{#snippet status()}
  <span>Status</span>
{/snippet}

<Bar progress={0.5} {identity} {controls} {status} />
