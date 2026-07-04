<script lang="ts">
  import { clientStore } from '../store';
  import Modal from './Modal.svelte';
  import ListRow from './ListRow.svelte';
  import Button from './Button.svelte';

  export let open: boolean;
  export let dismissible: boolean;
  export let onClose: (() => void) | undefined = undefined;

  // "Change song" needs to show the catalog picker again without touching
  // `session.selectedSong` until the host actually picks something —
  // selectSong(session.selectedSong) was a same-song no-op (song-select.ts
  // skips the part/readiness reset for the already-selected song), so it
  // never actually showed the list. Local-only, not synced: reset whenever
  // a real pick is made or the modal is closed, so reopening later starts
  // back at the "song selected" summary rather than wherever it was left.
  let browsingCatalog = false;

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: catalog = $clientStore.catalog;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: selfParticipant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: selectedSong = catalog.find((s) => s.id === session?.selectedSong);

  function selectSong(songId: string) {
    wsClient?.send({ type: 'song-select', songId });
    browsingCatalog = false;
  }

  function selectPart(part: import('@sync-tab-scroll/shared').SelectedPart) {
    wsClient?.send({ type: 'part-select', part });
    handleClose();
  }

  function handleClose() {
    browsingCatalog = false;
    onClose?.();
  }
</script>

<Modal {open} {dismissible} onClose={handleClose} title="Song & part">
  {#if session}
    {#if !session.selectedSong || browsingCatalog}
      <span class="section-label">Catalog</span>
      <ul class="list">
        {#each catalog as song (song.id)}
          <ListRow label={song.name} sublabel={song.artist}>
            {#if isHost}
              <Button variant="ghost" label="Select" onclick={() => selectSong(song.id)} />
            {/if}
          </ListRow>
        {/each}
      </ul>
    {:else}
      <div class="song-row">
        <div>
          <span class="section-label">Song</span>
          <p class="song-name">{selectedSong?.name ?? session.selectedSong}</p>
        </div>
        {#if isHost}
          <Button variant="ghost" label="Change song" onclick={() => (browsingCatalog = true)} />
        {/if}
      </div>

      <span class="section-label">Your part</span>
      <ul class="list">
        {#each session.availableParts as part (part.trackIndex)}
          <ListRow label={part.instrumentName}>
            <Button
              variant={selfParticipant?.selectedPart === part.trackIndex ? 'riot' : 'ghost'}
              label="Select"
              disabled={selfParticipant?.selectedPart === part.trackIndex}
              onclick={() => selectPart(part.trackIndex)}
            />
          </ListRow>
        {/each}
        <ListRow label="Lyrics">
          <Button
            variant={selfParticipant?.selectedPart === 'lyrics' ? 'riot' : 'ghost'}
            label="Select"
            disabled={!selectedSong?.lyricsLrc || selfParticipant?.selectedPart === 'lyrics'}
            onclick={() => selectPart('lyrics')}
          />
        </ListRow>
      </ul>
    {/if}
  {/if}
</Modal>

<style>
  .section-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: var(--space-4) 0 var(--space-2);
  }
  .section-label:first-child {
    margin-top: 0;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--border);
  }

  .song-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .song-name {
    font-family: var(--font-display);
    font-size: 1.25rem;
    margin: 0;
  }
</style>
