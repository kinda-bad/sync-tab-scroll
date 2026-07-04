<script lang="ts">
  import { onMount } from 'svelte';
  import { clientStore } from '../store';
  import SettingsModal from '../components/SettingsModal.svelte';

  const sent: unknown[] = [];
  const fakeWsClient = { send: (m: unknown) => sent.push(m) };

  onMount(() => {
    (window as unknown as { __clientStore: typeof clientStore }).__clientStore = clientStore;
    (window as unknown as { __fakeWsClient: unknown }).__fakeWsClient = fakeWsClient;
    (window as unknown as { __sent: unknown[] }).__sent = sent;
  });
</script>

<SettingsModal open={true} />
