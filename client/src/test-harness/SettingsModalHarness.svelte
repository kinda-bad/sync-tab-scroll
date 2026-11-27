<script lang="ts">
  import { onMount } from 'svelte';
  import SettingsModal from '../components/SettingsModal.svelte';
  import { clientStore } from '../store';
  import { barTickMap, type BarTickMap } from '../bar-tick';
  import type { WsClient } from '../ws-client';
  import type { CatalogSong, Session } from '@sync-tab-scroll/shared';

  export let session: Session;
  export let selfParticipantId: string;
  export let catalog: CatalogSong[] = [];
  // The loaded song's bars (bar-tick.ts), as playback-engine.ts would set
  // them once a score loads. Omitted: no song loaded on this device.
  export let barTicks: BarTickMap | null = null;

  onMount(() => {
    const sent: unknown[] = [];
    const wsClient: WsClient = { send: (m) => sent.push(m), close: () => {} };
    (window as unknown as { __sentMessages: unknown[] }).__sentMessages = sent;
    (window as unknown as { __clientStore: typeof clientStore }).__clientStore = clientStore;
    barTickMap.set(barTicks);

    clientStore.set({
      view: 'lobby',
      session,
      selfParticipantId,
      catalog, catalogues: [],
      wsClient,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connected',
    });
  });
</script>

<SettingsModal open={true} />
