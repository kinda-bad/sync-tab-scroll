<script lang="ts">
  import { tick } from 'svelte';
  import { clientStore } from './store';
  import { ensurePlaybackEngine, renderNowVisible } from './playback-engine';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';
  import Bar from './components/Bar.svelte';
  import Button from './components/Button.svelte';
  import ReadinessBadge from './components/ReadinessBadge.svelte';
  import SongPartModal from './components/SongPartModal.svelte';

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;
  let fullLyricsEl: HTMLDivElement;
  let previousHasPart = false;
  let songPartModalOpen = false;

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

  // The one persistent bar (brand.md) — shown in Lobby and Playback both,
  // never a separate top header + bottom transport split. Landing has no
  // bar (its own full-screen moment).
  $: showBar = $clientStore.view === 'lobby' || $clientStore.view === 'playback';
  $: catalogSong = $clientStore.catalog.find((s) => s.id === session?.selectedSong);
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: isRunning = session?.playbackState.status === 'running';
  $: readyCount = session?.participants.filter((p) => p.readiness === 'ready').length ?? 0;
  $: totalCount = session?.participants.length ?? 0;
  // Aggregate readiness in the Lobby; once actually playing the hazard
  // strip reads as fully "live" rather than tracking exact song position
  // (which would need alphaTab duration wired through — a later pass).
  $: barProgress = $clientStore.view === 'playback' ? 1 : totalCount > 0 ? readyCount / totalCount : 0;

  // Song/part selection lives in a modal (ui.md Lobby View), not inline —
  // forced open whenever either is missing (pre-playback only; once
  // playback starts every participant necessarily already has a part).
  // One-directional: this only ever forces `songPartModalOpen` to `true`,
  // never back to `false` — otherwise the instant selection completes and
  // `needsSongOrPart` flips false, an OR'd derived value would snap the
  // modal shut on its own before the user ever chose to close it.
  $: needsSongOrPart = $clientStore.view === 'lobby' && (!session?.selectedSong || !hasPart);
  $: if (needsSongOrPart) songPartModalOpen = true;

  function toggleSongPartModal() {
    songPartModalOpen = !songPartModalOpen;
  }

  function closeSongPartModal() {
    songPartModalOpen = false;
  }

  function startPlayback() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: 'start' });
  }

  function togglePause() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: isRunning ? 'pause' : 'resume' });
  }

  function stopPlayback() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: 'stop' });
  }
</script>

<div class="app-content" class:with-bar={showBar}>
  {#if $clientStore.view === 'landing'}
    <Landing />
  {:else if $clientStore.view === 'lobby'}
    <Lobby />
  {:else}
    <Playback />
  {/if}
</div>

<div class="engine-containers" class:visible={hasPart && !isLyricsPart}>
  <div bind:this={tabContainer} class="tab-container"></div>
  <div bind:this={overlayContainer} class="lyrics-overlay-container"></div>
</div>
<div bind:this={fullLyricsEl} class="full-lyrics-view" class:visible={hasPart && isLyricsPart}></div>

{#if showBar && session}
  <Bar progress={barProgress}>
    {#snippet identity()}
      <span class="bar-artist">Join code: {session.code}</span>
      {#if catalogSong}
        <strong class="bar-title">{catalogSong.name}</strong>
        <span class="bar-artist"> — {catalogSong.artist}</span>
      {/if}
    {/snippet}
    {#snippet controls()}
      {#if $clientStore.view === 'lobby'}
        <Button variant="ghost" label="Song & part" onclick={toggleSongPartModal} />
      {/if}
      {#if isHost}
        {#if $clientStore.view === 'lobby'}
          <Button variant="riot" label="Start" disabled={!session.selectedSong} onclick={startPlayback} />
        {:else}
          <Button variant="ghost" label={isRunning ? 'Pause' : 'Resume'} onclick={togglePause} />
          <Button variant="ghost" label="Stop" onclick={stopPlayback} />
        {/if}
      {/if}
    {/snippet}
    {#snippet status()}
      {#if participant}
        <ReadinessBadge readiness={participant.readiness} connected={participant.connectionStatus === 'connected'} />
      {/if}
    {/snippet}
  </Bar>
{/if}

<SongPartModal open={songPartModalOpen} dismissible={!needsSongOrPart} onClose={closeSongPartModal} />

<Toasts />

<style>
  .app-content.with-bar {
    /* Clears the persistent Bar (its own height + the hazard strip above
       it) so bottom content isn't hidden behind it. */
    padding-bottom: calc(var(--bar-height) + var(--space-8));
  }

  .engine-containers,
  .full-lyrics-view {
    display: none;
  }
  .engine-containers.visible,
  .full-lyrics-view.visible {
    display: block;
  }
  .engine-containers {
    /* Positioning context for .lyrics-overlay-container, so the overlay
       renders on top of the tab notation instead of stacking below it
       in normal document flow. */
    position: relative;
  }
  .tab-container {
    background: var(--canvas-bg, #0a0a0a);
    min-height: 400px;
  }

  .bar-title {
    font-family: var(--font-display);
    letter-spacing: 0.02em;
  }
  .bar-artist {
    color: var(--ink-dim);
    font-size: 0.8125rem;
  }
</style>
