<script lang="ts">
  import { tick } from 'svelte';
  import { clientStore } from './store';
  import { ensurePlaybackEngine, renderNowVisible } from './playback-engine';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;
  let previousHasPart = false;

  $: session = $clientStore.session;
  $: participant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';
  // Visible as soon as a part is picked, independent of view or playback
  // state (Lobby or Playback, running/paused/stopped) — not gated to the
  // Playback view the way it used to be.
  $: hasPart = participant?.selectedPart != null;

  // Fires the moment a participant's part is known (song selected +
  // selectedPart set) — in the Lobby, not on Playback mount — so
  // per-participant loading/readiness (ui.md) resolves before the host
  // starts playback, instead of only after.
  $: if (session && $clientStore.wsClient && hasPart && tabContainer) {
    const song = $clientStore.catalog.find((s) => s.id === session!.selectedSong);
    if (song) {
      const part = session!.availableParts.find((p) => p.trackIndex === participant!.selectedPart);
      const trackIndex = isLyricsPart ? (song.lyricsTrackIndex ?? 0) : (part?.trackIndex ?? 0);
      ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, $clientStore.wsClient, song, trackIndex, isLyricsPart);
    }
  }

  // alphaTab's first render (fired from its own scoreLoaded handler) skips
  // if the container is display:none at that instant. Now that visibility
  // tracks `hasPart` directly (set in the same tick as ensurePlaybackEngine
  // above), the container is normally already visible by the time the
  // async score fetch/parse finishes — but force one explicit re-render
  // right after the container first becomes visible as a safety net,
  // deferred past `tick()` + a animation frame so it can't race Svelte's
  // own DOM patch for the `visible` class the way the view-keyed version
  // of this fix once did.
  $: {
    if (hasPart && !previousHasPart) {
      tick().then(() => requestAnimationFrame(() => renderNowVisible()));
    }
    previousHasPart = hasPart;
  }
</script>

{#if $clientStore.view === 'landing'}
  <Landing />
{:else if $clientStore.view === 'lobby'}
  <Lobby />
{:else}
  <Playback />
{/if}

<div class="engine-containers" class:visible={hasPart && !isLyricsPart}>
  <div bind:this={tabContainer} class="tab-container"></div>
  <div bind:this={overlayContainer}></div>
</div>
<div bind:this={fullLyricsEl} class="full-lyrics-view" class:visible={hasPart && isLyricsPart}></div>

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
