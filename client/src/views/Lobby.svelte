<script lang="ts">
  import { clientStore } from '../store';
  import Button from '../components/Button.svelte';
  import ReadinessBadge from '../components/ReadinessBadge.svelte';
  import ListRow from '../components/ListRow.svelte';

  let lobbyCursorInput = 0;

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;

  function setLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: lobbyCursorInput });
  }

  function clearLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: null });
  }

  function toggleSpotlightMode() {
    wsClient?.send({ type: 'spotlight-mode-set', enabled: !session?.spotlightMode });
  }
</script>

<section class="lobby">
  <h1 class="lobby-title">Lobby</h1>

  {#if session}
    <span class="section-label">Participants</span>
    <ul class="list">
      {#each session.participants as p (p.id)}
        <ListRow label={p.displayName} sublabel={p.role === 'host' ? 'HOST' : undefined}>
          <ReadinessBadge readiness={p.readiness} connected={p.connectionStatus === 'connected'} />
        </ListRow>
      {/each}
    </ul>

    <span class="section-label">Lobby cursor</span>
    {#if session.lobbyCursorTick !== null}
      <p class="hint">Host is pointing at tick {session.lobbyCursorTick}.</p>
    {:else}
      <p class="hint">No lobby cursor set.</p>
    {/if}
    {#if isHost}
      <div class="cursor-controls">
        <input type="number" bind:value={lobbyCursorInput} class="cursor-input" />
        <Button variant="ghost" label="Set lobby cursor" onclick={setLobbyCursor} />
        <Button variant="ghost" label="Clear" onclick={clearLobbyCursor} />
        <Button
          variant={session.spotlightMode ? 'riot' : 'ghost'}
          label={session.spotlightMode ? 'Spotlight mode: on' : 'Spotlight mode: off'}
          onclick={toggleSpotlightMode}
        />
      </div>
    {/if}
  {:else}
    <p class="hint">Connecting…</p>
  {/if}
</section>

<style>
  .lobby {
    padding: var(--space-6) var(--space-4);
    max-width: 40rem;
    margin: 0 auto;
  }

  .lobby-title {
    font-family: var(--font-display);
    letter-spacing: 0.02em;
    font-size: 2rem;
    margin: 0 0 var(--space-4);
  }

  .section-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: var(--space-6) 0 var(--space-2);
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

  .hint {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }

  .cursor-controls {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .cursor-input {
    font-family: var(--font-mono);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--ink);
    padding: var(--space-2);
    width: 6rem;
  }
</style>
