<script lang="ts">
  import { clientStore } from '../store';
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import ReadinessBadge from './ReadinessBadge.svelte';
  import ListRow from './ListRow.svelte';
  import { applyTheme, loadStoredTheme, persistTheme, type StoredTheme } from '../theme';
  import { debounce } from '../debounce';
  import { loadStoredMetronome, persistMetronome } from '../metronome-preference';
  import { loadStoredTrackMute, persistTrackMute } from '../track-mute-preference';
  import { setEngineMetronome, setEngineTrackMute, setEngineLyricsTickerFontSize, setEngineMeasureMarkersVisible } from '../playback-engine';
  import {
    loadStoredLyricsTickerFontSize,
    persistLyricsTickerFontSize,
    type LyricsTickerFontSize,
  } from '../lyrics-ticker-font-size-preference';
  import { loadStoredMeasureMarkers, persistMeasureMarkers } from '../lyrics-measure-markers-preference';

  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;

  // Four semantic tabs (ui.md): Participants (who's here + host transfer),
  // Session (host-broadcast controls everyone is affected by), Preferences
  // (personal, this-device-only settings), Tracks (personal per-part mute
  // controls, moved out of Preferences into its own tab, one row per part).
  let activeTab: 'participants' | 'session' | 'preferences' | 'tracks' = 'participants';
  let lobbyCursorInput = 0;
  let theme: StoredTheme = loadStoredTheme() ?? 'dark';

  // Two orthogonal controls (ui.md Preferences, brand.md Themes) combine
  // into the one flat `StoredTheme`/`data-theme` value `theme.ts` actually
  // persists and `applyTheme()` consumes — derived from it on mount/every
  // change, never a second source of truth (constitution Principle I).
  $: themeFamily = theme.startsWith('cyberpunk') ? 'cyberpunk' : 'riot';
  $: themeMode = theme.endsWith('dark') ? 'dark' : 'light';

  let metronome = loadStoredMetronome();
  let lyricsTickerFontSize: LyricsTickerFontSize = loadStoredLyricsTickerFontSize();
  let measureMarkers = loadStoredMeasureMarkers();
  const LYRICS_TICKER_FONT_SIZES: LyricsTickerFontSize[] = ['small', 'medium', 'large', 'huge'];

  // Personal, this-device-only "mute parts" preference (ui.md Preferences
  // tab, track-mute-preference.ts) — keyed per song+track, so recomputed
  // whenever the loaded session (and thus its selectedSong/availableParts)
  // changes, not on every unrelated clientStore tick (session's own
  // reference only changes on a real session update, same as the rest of
  // this component's session-derived state).
  let trackMutes: Record<number, boolean> = {};
  $: if (session?.selectedSong) {
    const songId = session.selectedSong;
    trackMutes = Object.fromEntries(session.availableParts.map((p) => [p.trackIndex, loadStoredTrackMute(songId, p.trackIndex)]));
  }

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

  // Personal, this-device-only (ui.md Preferences tab): mirrors
  // toggleMetronome's two-call shape exactly, but keyed per (songId,
  // trackIndex) — a mute choice for one song's track must not carry over
  // to a different song's differently-indexed track.
  // Personal, this-device-only (ui.md Preferences tab): mirrors
  // toggleMetronome's two-call shape, but with a 4-way value instead of a
  // boolean.
  function setLyricsTickerFontSize(size: LyricsTickerFontSize) {
    lyricsTickerFontSize = size;
    persistLyricsTickerFontSize(size);
    setEngineLyricsTickerFontSize(size);
  }

  // Personal, this-device-only (ui.md Preferences tab): mirrors
  // toggleMetronome's two-call shape exactly.
  function toggleMeasureMarkers() {
    measureMarkers = !measureMarkers;
    persistMeasureMarkers(measureMarkers);
    setEngineMeasureMarkersVisible(measureMarkers);
  }

  function toggleTrackMute(trackIndex: number) {
    if (!session?.selectedSong) return;
    const songId = session.selectedSong;
    const muted = !trackMutes[trackIndex];
    trackMutes = { ...trackMutes, [trackIndex]: muted };
    persistTrackMute(songId, trackIndex, muted);
    setEngineTrackMute(trackIndex, muted);
  }

  // "Solo" (T005, ui.md Tracks tab): no new persisted concept — an ordinary
  // batch mute-state change reusing the exact same per-song+track
  // track-mute-preference.ts mechanism as toggleTrackMute, applied to every
  // other part at once (muted) while the soloed part is left unmuted.
  function soloTrack(soloTrackIndex: number) {
    if (!session?.selectedSong) return;
    const songId = session.selectedSong;
    const next: Record<number, boolean> = {};
    for (const part of session.availableParts) {
      const muted = part.trackIndex !== soloTrackIndex;
      next[part.trackIndex] = muted;
      persistTrackMute(songId, part.trackIndex, muted);
      setEngineTrackMute(part.trackIndex, muted);
    }
    trackMutes = { ...trackMutes, ...next };
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
    <Button variant={activeTab === 'tracks' ? 'riot' : 'ghost'} label="Tracks" onclick={() => (activeTab = 'tracks')} />
  </div>

  {#if activeTab === 'participants'}
    {#if session}
      <span class="section-label">Participants</span>
      <ul class="list">
        {#each session.participants as p (p.id)}
          {@const isSelf = p.id === $clientStore.selfParticipantId}
          {@const isPendingRow = session.pendingHostRequest === p.id}
          {@const partLabel =
            p.selectedPart === 'lyrics'
              ? 'Lyrics'
              : p.selectedPart === null
                ? undefined
                : session.availableParts.find((ap) => ap.trackIndex === p.selectedPart)?.instrumentName}
          {@const sublabel = p.role === 'host' ? (partLabel ? `HOST · ${partLabel}` : 'HOST') : partLabel}
          <ListRow label={p.displayName} {sublabel}>
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
  {:else if activeTab === 'preferences'}
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

    <span class="section-label">Lyrics ticker font size</span>
    <div class="control-row">
      {#each LYRICS_TICKER_FONT_SIZES as size (size)}
        <Button
          variant={lyricsTickerFontSize === size ? 'riot' : 'ghost'}
          label={size[0].toUpperCase() + size.slice(1)}
          onclick={() => setLyricsTickerFontSize(size)}
        />
      {/each}
    </div>

    <span class="section-label">Measure markers</span>
    <div class="control-row">
      <Button
        variant={measureMarkers ? 'riot' : 'ghost'}
        label={measureMarkers ? 'Measure markers: On' : 'Measure markers: Off'}
        onclick={toggleMeasureMarkers}
      />
    </div>
    <p class="hint">Shows measure-boundary lines and numbers in the lyrics ticker.</p>
  {:else}
    {#if session && session.availableParts.length > 0}
      <span class="section-label">Tracks</span>
      {#each session.availableParts as part (part.trackIndex)}
        <div class="control-row">
          <Button
            variant={trackMutes[part.trackIndex] ? 'riot' : 'ghost'}
            label={`${part.instrumentName}: ${trackMutes[part.trackIndex] ? 'Muted' : 'Unmuted'}`}
            onclick={() => toggleTrackMute(part.trackIndex)}
          />
          <Button variant="ghost" label="Solo" onclick={() => soloTrack(part.trackIndex)} />
        </div>
      {/each}
      <p class="hint">Only you don't hear muted parts — everyone else still does.</p>
    {/if}
  {/if}
</Modal>

<style>
  .tab-strip {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  /* Equal-width cells so the strip reads as one segmented control; the
     section-label type size keeps all four labels on one line down to
     360px-wide screens. Targets .btn-wrap (Button.svelte's outer span,
     the actual flex item since it wraps every .btn) for sizing, and the
     nested .btn for padding/font-size — .btn itself is a grandchild now,
     not a direct child of .tab-strip. */
  .tab-strip > :global(.btn-wrap) {
    flex: 1;
    min-width: 0;
  }
  .tab-strip > :global(.btn-wrap) > :global(.btn) {
    width: 100%;
    min-width: 0;
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
