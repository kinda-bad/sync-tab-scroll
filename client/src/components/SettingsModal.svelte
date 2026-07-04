<script lang="ts">
  import { clientStore } from '../store';
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import ReadinessBadge from './ReadinessBadge.svelte';
  import ListRow from './ListRow.svelte';
  import { applyTheme, loadStoredTheme, persistTheme, type StoredTheme } from '../theme';

  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;

  let activeTab: 'participants' | 'settings' = 'participants';
  let lobbyCursorInput = 0;
  let theme: StoredTheme = loadStoredTheme() ?? 'dark';

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    persistTheme(theme);
  }

  function setLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: lobbyCursorInput });
  }

  function clearLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: null });
  }

  function toggleSpotlightMode() {
    wsClient?.send({ type: 'spotlight-mode-set', enabled: !session?.spotlightMode });
  }

  function toggleMetronome() {
    wsClient?.send({ type: 'metronome-set', enabled: !session?.metronomeEnabled });
  }

  function toggleCountIn() {
    wsClient?.send({ type: 'count-in-set', enabled: !session?.countInEnabled });
  }

  function delegateHost(targetParticipantId: string) {
    wsClient?.send({ type: 'host-delegate', targetParticipantId });
  }

  function requestHost() {
    wsClient?.send({ type: 'request-host' });
  }

  function declineHostRequest() {
    wsClient?.send({ type: 'host-request-decline' });
  }
</script>

<Modal {open} {onClose} title="Settings">
  <div class="tab-strip">
    <Button variant={activeTab === 'participants' ? 'riot' : 'ghost'} label="Participants" onclick={() => (activeTab = 'participants')} />
    <Button variant={activeTab === 'settings' ? 'riot' : 'ghost'} label="Settings" onclick={() => (activeTab = 'settings')} />
  </div>

  {#if activeTab === 'participants'}
    {#if session}
      <span class="section-label">Participants</span>
      <ul class="list">
        {#each session.participants as p (p.id)}
          {@const isSelf = p.id === $clientStore.selfParticipantId}
          {@const isPendingRow = session.pendingHostRequest === p.id}
          <ListRow label={p.displayName} sublabel={p.role === 'host' ? 'HOST' : undefined}>
            {#if isPendingRow && isHost}
              <Button variant="ghost" label="Decline" onclick={declineHostRequest} />
            {:else if isPendingRow}
              <span class="hint">Requesting host</span>
            {:else}
              <ReadinessBadge readiness={p.readiness} connected={p.connectionStatus === 'connected'} />
            {/if}
            {#if isHost && !isSelf}
              <Button variant="ghost" label="Make host" onclick={() => delegateHost(p.id)} />
            {/if}
            {#if !isHost && isSelf}
              <Button variant="ghost" label="Request to become host" disabled={session.pendingHostRequest !== null} onclick={requestHost} />
            {/if}
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
          <Button
            variant={session.metronomeEnabled ? 'riot' : 'ghost'}
            label={session.metronomeEnabled ? 'Metronome: On' : 'Metronome: Off'}
            onclick={toggleMetronome}
          />
          <Button
            variant={session.countInEnabled ? 'riot' : 'ghost'}
            label={session.countInEnabled ? 'Count-in: On' : 'Count-in: Off'}
            onclick={toggleCountIn}
          />
        </div>
      {/if}
    {:else}
      <p class="hint">Connecting…</p>
    {/if}
  {:else}
    <span class="section-label">Theme</span>
    <Button variant="ghost" label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onclick={toggleTheme} />
  {/if}
</Modal>

<style>
  .tab-strip {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

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

  .hint {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }

  .cursor-controls {
    display: flex;
    flex-wrap: wrap;
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
