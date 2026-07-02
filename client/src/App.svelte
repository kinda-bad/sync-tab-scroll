<script lang="ts">
  import { clientStore } from './store';
  import { ensurePlaybackEngine } from './playback-engine';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;

  $: session = $clientStore.session;
  $: participant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';

  // Fires the moment a participant's part is known (song selected +
  // selectedPart set) — in the Lobby, not on Playback mount — so
  // per-participant loading/readiness (ui.md) resolves before the host
  // starts playback, instead of only after.
  $: if (session && $clientStore.wsClient && participant?.selectedPart != null && tabContainer) {
    const song = $clientStore.catalog.find((s) => s.id === session!.selectedSong);
    if (song) {
      const part = session!.availableParts.find((p) => p.trackIndex === participant!.selectedPart);
      const trackIndex = isLyricsPart ? (song.lyricsTrackIndex ?? 0) : (part?.trackIndex ?? 0);
      ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, $clientStore.wsClient, song, trackIndex, isLyricsPart);
    }
  }
</script>

{#if $clientStore.view === 'landing'}
  <Landing />
{:else if $clientStore.view === 'lobby'}
  <Lobby />
{:else}
  <Playback />
{/if}

<div class="engine-containers" class:visible={$clientStore.view === 'playback' && !isLyricsPart}>
  <div bind:this={tabContainer} class="tab-container"></div>
  <div bind:this={overlayContainer}></div>
</div>
<div bind:this={fullLyricsEl} class="full-lyrics-view" class:visible={$clientStore.view === 'playback' && isLyricsPart}></div>

<Toasts />

<style>
  .engine-containers,
  .full-lyrics-view {
    display: none;
  }
  .engine-containers.visible,
  .full-lyrics-view.visible {
    display: block;
  }
  .tab-container {
    background: var(--canvas-bg, #0a0a0a);
    min-height: 400px;
  }
</style>
