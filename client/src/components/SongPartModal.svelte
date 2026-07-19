<script lang="ts">
  import { clientStore } from '../store';
  import Modal from './Modal.svelte';
  import ListRow from './ListRow.svelte';
  import Button from './Button.svelte';
  import TextInput from './TextInput.svelte';
  import { partDisplayNames } from '../part-display-name';

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

  // Host-only standalone activation-key entry: whether the key field is open,
  // and its in-progress value. Not attached to any catalogue group — the host
  // no longer picks which locked catalogue to unlock (locked catalogues are
  // never sent to the client), they just type a key and the server resolves it
  // (ui.md, infrastructure.md). Reset on submit.
  let showUnlock = false;
  let keyInput = '';

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: catalog = $clientStore.catalog;
  $: catalogues = $clientStore.catalogues;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: selfParticipant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: selectedSong = catalog.find((s) => s.id === session?.selectedSong);

  // Instrument-prominent part labels (ui.md part-name display rule):
  // derived for the whole part list at once — uniqueness/numbering is a
  // per-song property, not a per-row one. Index-aligned with availableParts.
  $: partNames = partDisplayNames((session?.availableParts ?? []).map((p) => p.instrumentName));

  // The server only ever sends catalogues this session may see (public +
  // already-unlocked — infrastructure.md `visibleCatalog`), so grouping and the
  // song lists work off the visible set directly; there is no locked group.
  // Only group under catalogue headers when more than one visible catalogue
  // exists (ui.md) — a lone default catalogue keeps today's flat list.
  $: grouped = catalogues.length > 1;
  $: groups = catalogues.map((c) => ({
    catalogue: c,
    songs: catalog.filter((s) => s.catalogueId === c.id),
  }));

  function selectSong(songId: string) {
    wsClient?.send({ type: 'song-select', songId });
    browsingCatalog = false;
  }

  function submitUnlock() {
    // Key only — the server resolves which locked catalogue it matches
    // (infrastructure.md). Success/failure is handled server-side: a correct
    // key re-broadcasts session-state + a wider catalog (the newly-unlocked
    // group appears); a key matching nothing comes back as an error toast
    // (ws-client.ts), same terse pattern as every other error here (ui.md).
    wsClient?.send({ type: 'catalogue-unlock', key: keyInput });
    keyInput = '';
    showUnlock = false;
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
      {#if !grouped}
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
        {#each groups as group (group.catalogue.id)}
          <div class="catalogue-header">
            <span class="section-label">{group.catalogue.name}</span>
          </div>

          <ul class="list">
            {#each group.songs as song (song.id)}
              <ListRow label={song.name} sublabel={song.artist}>
                {#if isHost}
                  <Button variant="ghost" label="Select" onclick={() => selectSong(song.id)} />
                {/if}
              </ListRow>
            {/each}
          </ul>
        {/each}
      {/if}

      {#if isHost}
        <!--
          One persistent, standalone activation-key control (host-only). Locked
          catalogues are never sent to the client, so there is nothing to attach
          a per-group unlock to — the host types a key and the server resolves
          which locked catalogue it matches (ui.md, infrastructure.md). On
          success the wider catalog broadcast makes the newly-unlocked group
          appear above.
        -->
        <div class="unlock-control">
          {#if showUnlock}
            <form class="unlock-form" on:submit|preventDefault={submitUnlock}>
              <TextInput label="Activation key" bind:value={keyInput} placeholder="Enter activation key" />
              <Button type="submit" variant="riot" label="Unlock" />
            </form>
          {:else}
            <Button variant="ghost" label="Enter activation key" onclick={() => { showUnlock = true; keyInput = ''; }} />
          {/if}
        </div>
      {/if}
    {:else}
      <div class="song-row">
        <div>
          <span class="section-label">Song</span>
          <p class="song-name glitch-text">{selectedSong?.name ?? session.selectedSong}</p>
        </div>
        {#if isHost}
          <Button variant="ghost" label="Change song" onclick={() => (browsingCatalog = true)} />
        {/if}
      </div>

      <span class="section-label">Your part</span>
      <ul class="list">
        {#each session.availableParts as part, i (part.trackIndex)}
          <ListRow label={partNames[i]?.instrument ?? part.instrumentName} sublabel={partNames[i]?.detail ?? undefined}>
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

  .catalogue-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .unlock-control {
    margin-top: var(--space-4);
  }

  .unlock-form {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .unlock-form :global(.field) {
    flex: 1;
  }
</style>
