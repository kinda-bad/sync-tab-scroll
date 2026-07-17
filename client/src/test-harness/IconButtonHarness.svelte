<script lang="ts">
  import Settings from 'lucide-svelte/icons/settings';
  import Button from '../components/Button.svelte';

  export let label = 'Settings';
  export let iconOnly = false;
</script>

<Button {label} {iconOnly} icon={Settings} />
