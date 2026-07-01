<script lang="ts">
  import { clientStore } from '../store';

  let lobbyCursorInput = 0;

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: catalog = $clientStore.catalog;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: selfParticipant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);

  function selectSong(songId: string) {
    wsClient?.send({ type: 'song-select', songId });
  }

  function selectPart(part: string | null) {
    wsClient?.send({ type: 'part-select', part });
  }

  function startPlayback() {
    wsClient?.send({ type: 'playback-control', action: 'start' });
  }

  function setLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: lobbyCursorInput });
  }

  function clearLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: null });
  }
</script>

<section>
  <h1>Lobby</h1>

  {#if session}
    <p>Join code: <strong>{session.code}</strong></p>

    {#if !session.selectedSong}
      <p>No song selected yet.</p>
      <h2>Catalog</h2>
      <ul>
        {#each catalog as song (song.id)}
          <li>
            {song.name} — {song.artist}
            {#if isHost}
              <button onclick={() => selectSong(song.id)}>Select</button>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p>Song: <strong>{catalog.find((s) => s.id === session.selectedSong)?.name ?? session.selectedSong}</strong></p>
      {#if isHost}
        <button onclick={() => selectSong(session.selectedSong!)} title="Re-pick from the catalog">Change song</button>
      {/if}

      <h2>Your part</h2>
      <ul>
        {#each session.availableParts as part (part.id)}
          <li>
            {part.instrumentName}
            <button disabled={selfParticipant?.selectedPart === part.id} onclick={() => selectPart(part.id)}>Select</button>
          </li>
        {/each}
        <li>
          Lyrics
          <button
            disabled={!catalog.find((s) => s.id === session.selectedSong)?.lyricsLrc || selfParticipant?.selectedPart === 'lyrics'}
            onclick={() => selectPart('lyrics')}
          >
            Select
          </button>
        </li>
      </ul>

      {#if isHost}
        <button onclick={startPlayback}>Start</button>
      {/if}
    {/if}

    <h2>Participants</h2>
    <ul>
      {#each session.participants as participant (participant.id)}
        <li>{participant.displayName} — {participant.readiness} — {participant.connectionStatus}</li>
      {/each}
    </ul>

    <h2>Lobby cursor</h2>
    {#if session.lobbyCursorTick !== null}
      <p>Host is pointing at tick {session.lobbyCursorTick}.</p>
    {:else}
      <p>No lobby cursor set.</p>
    {/if}
    {#if isHost}
      <input type="number" bind:value={lobbyCursorInput} />
      <button onclick={setLobbyCursor}>Set lobby cursor</button>
      <button onclick={clearLobbyCursor}>Clear</button>
    {/if}
  {:else}
    <p>Connecting…</p>
  {/if}
</section>
