<script lang="ts">
  import { tick } from 'svelte';
  import { clientStore, type ViewState } from './store';
  import { ensurePlaybackEngine, renderNowVisible } from './playback-engine';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;
  let previousView: ViewState = 'landing';

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

  // The tab container is created (and alphaTab's first render fires) back
  // in the Lobby while still display:none — alphaTab skips that render and
  // never re-renders on its own once shown. Force one real render right as
  // the view transitions to Playback (previousView tracks the transition
  // so this fires once, not on every session-state update while already
  // in Playback). Deferred past `tick()` + a animation frame: reading
  // `$clientStore.view` here and calling render() synchronously races
  // Svelte's own DOM patch that flips the container's `visible` class —
  // alphaTab still sees width=0 if asked before that patch (and the
  // subsequent layout/paint) has actually landed.
  $: {
    if ($clientStore.view === 'playback' && previousView !== 'playback') {
      tick().then(() => requestAnimationFrame(() => renderNowVisible()));
    }
    previousView = $clientStore.view;
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
