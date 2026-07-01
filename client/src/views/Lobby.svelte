<script lang="ts">
  import { onMount } from 'svelte';
  import { createWsClient, type WsClient } from '../ws-client';
  import { clientStore } from '../store';

  // TODO: wire real song-selection (no catalog-listing WS flow exists yet,
  // same gap noted in Playback.svelte) — this view demonstrates the Empty
  // state, participant list, and lobby cursor (T026, T027) against a real
  // session, not a full catalog picker.
  const params = new URLSearchParams(location.search);
  let wsClient: WsClient;
  let lobbyCursorInput = 0;

  onMount(() => {
    wsClient = createWsClient(`ws://${location.hostname}:8080`);
    const asHost = params.get('join') === null;
    if (asHost) {
      wsClient.send({ type: 'session-create', displayName: 'Host' });
    } else {
      wsClient.send({ type: 'session-join', code: params.get('join')!, displayName: 'Member' });
    }
  });

  function setLobbyCursor() {
    wsClient.send({ type: 'lobby-cursor-set', tickPosition: lobbyCursorInput });
  }

  function clearLobbyCursor() {
    wsClient.send({ type: 'lobby-cursor-set', tickPosition: null });
  }

  $: session = $clientStore.session;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
</script>

<section>
  <h1>Lobby</h1>

  {#if session}
    <p>Join code: <strong>{session.code}</strong></p>

    {#if !session.selectedSong}
      <p>No song selected yet — catalog picker goes here.</p>
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
