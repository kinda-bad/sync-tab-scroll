<script lang="ts">
  import { clientStore } from '../store';
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import ReadinessBadge from './ReadinessBadge.svelte';
  import ListRow from './ListRow.svelte';
  import { applyTheme, loadStoredTheme, persistTheme, type StoredTheme } from '../theme';
  import { debounce } from '../debounce';
  import { loadStoredMetronome, persistMetronome } from '../metronome-preference';
  import { setEngineMetronome } from '../playback-engine';

  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;

  // Three semantic tabs (ui.md): Participants (who's here + host transfer),
  // Session (host-broadcast controls everyone is affected by), Preferences
  // (personal, this-device-only settings).
  let activeTab: 'participants' | 'session' | 'preferences' = 'participants';
  let lobbyCursorInput = 0;
  let theme: StoredTheme = loadStoredTheme() ?? 'dark';

  // Two orthogonal controls (ui.md Preferences, brand.md Themes) combine
  // into the one flat `StoredTheme`/`data-theme` value `theme.ts` actually
  // persists and `applyTheme()` consumes — derived from it on mount/every
  // change, never a second source of truth (constitution Principle I).
  $: themeFamily = theme.startsWith('cyberpunk') ? 'cyberpunk' : 'riot';
  $: themeMode = theme.endsWith('dark') ? 'dark' : 'light';

  let metronome = loadStoredMetronome();

  $: session = $clientStore.session;
  $: wsClient = $clientStore.wsClient;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;

  function setTheme(family: 'riot' | 'cyberpunk', mode: 'dark' | 'light'): void {
    theme = family === 'riot' ? mode : (`cyberpunk-${mode}` as StoredTheme);
    applyTheme(theme);
    persistTheme(theme);
  }

  function toggleThemeFamily() {
    setTheme(themeFamily === 'riot' ? 'cyberpunk' : 'riot', themeMode);
  }

  function toggleThemeMode() {
    setTheme(themeFamily, themeMode === 'dark' ? 'light' : 'dark');
  }

  // Debounced (plan-lobby-cursor-race-2026-07-04.md) so rapidly changing the
  // input and clicking "Set" repeatedly collapses to one broadcast — created
  // once per component instance, not per call, so repeated calls actually
  // coalesce against the same timer. `clearLobbyCursor` stays undebounced:
  // it's a single deliberate action, not a rapid-input path.
  const debouncedSetLobbyCursor = debounce((tickPosition: number) => {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition });
  }, 150);

  function setLobbyCursor() {
    debouncedSetLobbyCursor(lobbyCursorInput);
  }

  function clearLobbyCursor() {
    wsClient?.send({ type: 'lobby-cursor-set', tickPosition: null });
  }

  function toggleSpotlightMode() {
    wsClient?.send({ type: 'spotlight-mode-set', enabled: !session?.spotlightMode });
  }

  // Personal, this-device-only (ui.md Preferences tab): persists like the
  // theme choice and applies to the live engine immediately; never a WS send.
  function toggleMetronome() {
    metronome = !metronome;
    persistMetronome(metronome);
    setEngineMetronome(metronome);
  }

  function toggleCountIn() {
    wsClient?.send({ type: 'count-in-set', enabled: !session?.countInEnabled });
  }

  function delegateHost(targetParticipantId: string) {
    wsClient?.send({ type: 'host-delegate', targetParticipantId });
  }

  function removeParticipant(participantId: string) {
    wsClient?.send({ type: 'host-remove-participant', participantId });
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
    <Button variant={activeTab === 'session' ? 'riot' : 'ghost'} label="Session" onclick={() => (activeTab = 'session')} />
    <Button variant={activeTab === 'preferences' ? 'riot' : 'ghost'} label="Preferences" onclick={() => (activeTab = 'preferences')} />
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
              <Button variant="ghost" label="Remove" onclick={() => removeParticipant(p.id)} />
            {/if}
            {#if !isHost && isSelf}
              <Button variant="ghost" label="Request to become host" disabled={session.pendingHostRequest !== null} onclick={requestHost} />
            {/if}
          </ListRow>
        {/each}
      </ul>
    {:else}
      <p class="hint">Connecting…</p>
    {/if}
  {:else if activeTab === 'session'}
    {#if session}
      <span class="section-label">Lobby cursor</span>
      {#if session.lobbyCursorTick !== null}
        <p class="hint">Host is pointing at tick {session.lobbyCursorTick}.</p>
      {:else}
        <p class="hint">No lobby cursor set.</p>
      {/if}
      {#if isHost}
        <div class="control-row">
          <input type="number" bind:value={lobbyCursorInput} class="cursor-input" />
          <Button variant="ghost" label="Set lobby cursor" onclick={setLobbyCursor} />
          <Button variant="ghost" label="Clear" onclick={clearLobbyCursor} />
          <Button
            variant={session.spotlightMode ? 'riot' : 'ghost'}
            label={session.spotlightMode ? 'Spotlight mode: on' : 'Spotlight mode: off'}
            onclick={toggleSpotlightMode}
          />
        </div>
        <p class="hint">
          Spotlight mode forces every participant's view to follow the lobby cursor. Off: it's just a marker — cursor position and Spotlight state both reset when playback starts.
        </p>

        <span class="section-label">Playback audio</span>
        <div class="control-row">
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
    <div class="control-row">
      <Button variant="ghost" label={themeFamily === 'riot' ? 'Theme: Riot' : 'Theme: Cyberpunk'} onclick={toggleThemeFamily} />
      <Button variant="ghost" label={themeMode === 'dark' ? 'Light mode' : 'Dark mode'} onclick={toggleThemeMode} />
    </div>

    <span class="section-label">Playback audio</span>
    <div class="control-row">
      <Button
        variant={metronome ? 'riot' : 'ghost'}
        label={metronome ? 'Metronome: On' : 'Metronome: Off'}
        onclick={toggleMetronome}
      />
    </div>
    <p class="hint">Only you hear your metronome.</p>
  {/if}
</Modal>

<style>
  .tab-strip {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  /* Equal-width cells so the strip reads as one segmented control; the
     section-label type size keeps all three labels on one line down to
     360px-wide screens. */
  .tab-strip > :global(.btn) {
    flex: 1;
    padding-inline: var(--space-1);
    font-size: 0.6875rem;
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

  .control-row {
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
