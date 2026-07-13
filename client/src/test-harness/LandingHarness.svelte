<script lang="ts">
  import Landing from '../views/Landing.svelte';
  import { accountStore, type AccountStatus } from '../account';

  // Drive the singleton account store so the Landing view renders the account
  // menu in the requested state (ui.md Account & Sign-In — the menu renders on
  // Landing, not only the Bar).
  export let status: AccountStatus = 'signed-out';
  export let displayName: string | null = null;

  $: accountStore.set({ status, displayName });
</script>

<Landing />
