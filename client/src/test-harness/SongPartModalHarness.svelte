<script lang="ts">
  import { onMount } from 'svelte';
  import SongPartModal from '../components/SongPartModal.svelte';
  import { clientStore } from '../store';
  import type { WsClient } from '../ws-client';
  import type { CatalogSong, Catalogue, Session } from '@sync-tab-scroll/shared';

  export let session: Session;
  export let selfParticipantId: string;
  export let catalog: CatalogSong[] = [];
  export let catalogues: Catalogue[] = [];

  onMount(() => {
    const sent: unknown[] = [];
    const wsClient: WsClient = { send: (m) => sent.push(m), close: () => {} };
    (window as unknown as { __sentMessages: unknown[] }).__sentMessages = sent;
    (window as unknown as { __clientStore: typeof clientStore }).__clientStore = clientStore;

    clientStore.set({
      view: 'lobby',
      session,
      selfParticipantId,
      catalog,
      catalogues,
      wsClient,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connected',
    });
  });
</script>

<SongPartModal open={true} dismissible={false} />
