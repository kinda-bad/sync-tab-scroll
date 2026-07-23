<script lang="ts">
  import { tick } from 'svelte';
  import { clientStore } from './store';
  import { ensurePlaybackEngine, renderNowVisible, dropEngineIfSongChanged, beatWidgetState } from './playback-engine';
  import { metronomeStore } from './metronome-preference';
  import BeatWidget from './components/BeatWidget.svelte';
  import Landing from './views/Landing.svelte';
  import Lobby from './views/Lobby.svelte';
  import Playback from './views/Playback.svelte';
  import Toasts from './components/Toasts.svelte';
  import ConnectionBanner from './components/ConnectionBanner.svelte';
  import Bar from './components/Bar.svelte';
  import Button from './components/Button.svelte';
  import ReadinessBadge from './components/ReadinessBadge.svelte';
  import SongPartModal from './components/SongPartModal.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import HelpAboutModal from './components/HelpAboutModal.svelte';
  import StartNegotiationModals from './components/StartNegotiationModals.svelte';
  import AccountMenu from './components/AccountMenu.svelte';
  import AuthoringModal from './components/AuthoringModal.svelte';
  import { accountStore, signIn, signOut, authoringModalOpen, loadAccount } from './account';
  import { leaveSession } from './leave-session';
  import { toggleOverlay as engineToggleOverlay } from './playback-engine';
  // Bar control icons (tasks-bottom-bar-icons-47a6.md T002/T003,
  // feedback-bottom-bar-icons-3a15 F003-F006) — lucide-svelte, adopted per
  // Principle V rather than hand-rolled inline SVGs.
  // T002 (tasks-icons-a11y-ticker-a10d.md, feedback F001/F004): Settings
  // moved cog → settings; Leave session moved log-out → bone ("breaking up
  // the band" — log-out now belongs to the account menu's actual Sign out).
  import Settings from 'lucide-svelte/icons/settings';
  import Play from 'lucide-svelte/icons/play';
  import Pause from 'lucide-svelte/icons/pause';
  import Square from 'lucide-svelte/icons/square';
  import Bone from './components/icons/BoneFracture.svelte';
  import MicVocal from 'lucide-svelte/icons/mic-vocal';
  import ListMusic from 'lucide-svelte/icons/list-music';
  import Clock from 'lucide-svelte/icons/clock';
  import Check from 'lucide-svelte/icons/check';
  import CircleHelp from 'lucide-svelte/icons/circle-help';

  let tabContainer: HTMLDivElement;
  let overlayContainer: HTMLDivElement;

  // Join-code click-to-copy (feedback-join-code-click-to-copy-4971 F001):
  // clicking the Bar identity area's join-code chip copies Session.code to
  // the clipboard and shows a transient inline "Copied!" confirmation.
  let joinCodeCopied = false;
  let joinCodeCopiedTimeout: ReturnType<typeof setTimeout> | undefined;
  async function copyJoinCode(code: string) {
    await navigator.clipboard.writeText(code);
    joinCodeCopied = true;
    clearTimeout(joinCodeCopiedTimeout);
    joinCodeCopiedTimeout = setTimeout(() => {
      joinCodeCopied = false;
    }, 1500);
  }
  let fullLyricsEl: HTMLDivElement;
  let previousHasPart = false;
  let songPartModalOpen = false;
  let songPartDismissed = false;
  let settingsModalOpen = false;
  let helpAboutModalOpen = false;

  $: session = $clientStore.session;
  $: participant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';
  // Visible as soon as a part is picked, independent of view or playback
  // state (Lobby or Playback, running/paused/stopped) — not gated to the
  // Playback view the way it used to be.
  $: hasPart = participant?.selectedPart != null;

  // Song-switch stale-score guard (feedback F001): the instant the host's
  // selectedSong broadcast lands, an engine still holding a DIFFERENT song's
  // score is torn down — the server clears selectedPart on song change, so
  // the ensurePlaybackEngine block below wouldn't re-run (and apply its own
  // song-identity teardown) until this participant re-picks a part, leaving
  // a window where Start would play the old song's still-loaded score.
  $: if (session?.selectedSong) dropEngineIfSongChanged(session.selectedSong);

  // Fires the moment a participant's part is known (song selected +
  // selectedPart set) — in the Lobby, not on Playback mount — so
  // per-participant loading/readiness (ui.md) resolves before the host
  // starts playback, instead of only after.
  $: if (session && $clientStore.wsClient && hasPart && tabContainer) {
    const song = $clientStore.catalog.find((s) => s.id === session!.selectedSong);
    if (song) {
      const part = session!.availableParts.find((p) => p.trackIndex === participant!.selectedPart);
      const trackIndex = isLyricsPart ? (song.lyricsTrackIndex ?? 0) : (part?.trackIndex ?? 0);
      ensurePlaybackEngine({ tabContainer, overlayContainer, fullLyricsEl }, $clientStore.wsClient, song, trackIndex, isLyricsPart, session!.playbackSource);
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
  // strip tracks real song position via clientStore.playbackProgress
  // (playback-engine.ts's playerPositionChanged subscription).
  $: barProgress = $clientStore.view === 'playback' ? $clientStore.playbackProgress : totalCount > 0 ? readyCount / totalCount : 0;

  // T004 (feedback F006): the in-tab lyrics ticker is available only when
  // this participant has an instrument part AND the song's lyrics came from
  // the source GP file (lyricsTrackIndex) — the tab-less Lyrics part shows
  // the full sheet instead, and a song without a lyrics track has nothing
  // to tick. The bar control stays visible in every case; when unavailable
  // it is disabled with one of these reasons.
  $: lyricsTickerAvailable = hasPart && !isLyricsPart && catalogSong?.lyricsTrackIndex != null;
  $: lyricsToggleReason = isLyricsPart
    ? 'Lyrics part shows the full sheet'
    : catalogSong?.lyricsTrackIndex == null
      ? 'No lyrics for this song'
      : 'Pick a part first';

  // Song/part selection lives in a modal (ui.md Lobby View), not inline —
  // auto-opened ONCE whenever either is missing (pre-playback only; once
  // playback starts every participant necessarily already has a part). The
  // modal is always dismissible: a persistent Bar control (Sign out, Leave)
  // must stay reachable, so no modal may permanently trap the user. Once
  // dismissed it stays closed (even while still unset) until the user reopens
  // it via the "Song & part" nav control — tracked by `songPartDismissed`.
  // The auto-open guard is still one-directional (only forces `true`), gated
  // by the dismissed flag so a completed selection or a manual dismiss doesn't
  // get snapped back open.
  $: needsSongOrPart = $clientStore.view === 'lobby' && (!session?.selectedSong || !hasPart);
  $: if (needsSongOrPart && !songPartDismissed) songPartModalOpen = true;

  function toggleSongPartModal() {
    if (songPartModalOpen) {
      // Closing via the nav control behaves like a dismiss — stays closed.
      songPartDismissed = true;
      songPartModalOpen = false;
    } else {
      songPartModalOpen = true;
    }
  }

  function closeSongPartModal() {
    songPartDismissed = true;
    songPartModalOpen = false;
  }

  // Start negotiation (ui.md Explicit Readiness & Start Negotiation): the
  // host modal's live count — connected, non-host, not-`ready` participants,
  // recomputed from every session-state broadcast so it drops as members
  // ready up during the window. Mirrors the server's own count rule (host
  // exempt, connected only).
  $: notReadyCount = session ? session.participants.filter((p) => p.id !== session!.hostId && p.connectionStatus === 'connected' && p.readiness !== 'ready').length : 0;

  function answerStartConfirmation(proceed: boolean) {
    $clientStore.wsClient?.send({ type: 'start-confirmation-answer', proceed });
    clientStore.update((s) => ({ ...s, startConfirmationOpen: false }));
  }

  function imReady() {
    // An ordinary ready-set — the modal itself stays open until the host's
    // answer arrives as host-start-resolved (auto-dismiss in ws-client.ts).
    $clientStore.wsClient?.send({ type: 'ready-set', ready: true });
  }

  // The Bar's readiness indicator is the participant's own ready control
  // (explicit-participant-readiness, ui.md Explicit Readiness): while
  // `loaded` it confirms, while `ready` it un-readies (ready-set).
  function toggleReady() {
    $clientStore.wsClient?.send({ type: 'ready-set', ready: participant?.readiness !== 'ready' });
  }

  function toggleSettingsModal() {
    settingsModalOpen = !settingsModalOpen;
  }

  function toggleHelpAboutModal() {
    helpAboutModalOpen = !helpAboutModalOpen;
  }

  function startPlayback() {
    songPartModalOpen = false;
    settingsModalOpen = false;
    $clientStore.wsClient?.send({ type: 'playback-control', action: 'start' });
  }

  function togglePause() {
    $clientStore.wsClient?.send({ type: 'playback-control', action: isRunning ? 'pause' : 'resume' });
  }

  function stopPlayback() {
    // Reset so a stale value from a prior playback doesn't briefly show
    // before the first new playerPositionChanged event arrives on replay.
    clientStore.update((s) => ({ ...s, playbackProgress: 0 }));
    $clientStore.wsClient?.send({ type: 'playback-control', action: 'stop' });
  }

  // Moved from Playback.svelte into the bar (tasks-bottom-bar-icons-47a6.md
  // T003, feedback F002) — same imperative call as before, just triggered
  // from this scope now, which already has isLyricsPart derived above.
  function toggleLyricsOverlay() {
    engineToggleOverlay();
  }
</script>

<div class="app-content" class:with-bar={showBar} class:collapsed={hasPart && isLyricsPart}>
  {#if $clientStore.view === 'landing'}
    <Landing />
  {:else if $clientStore.view === 'lobby'}
    <Lobby />
  {:else}
    <Playback />
  {/if}
</div>

<div class="engine-containers" class:visible={hasPart && !isLyricsPart} class:lyrics-overlay-hidden={!$clientStore.lyricsOverlayVisible}>
  <div bind:this={tabContainer} class="tab-container"></div>
  <div bind:this={overlayContainer} class="lyrics-overlay-container"></div>
</div>
<div bind:this={fullLyricsEl} class="full-lyrics-view" class:visible={hasPart && isLyricsPart}></div>

{#if showBar && session}
  <Bar progress={barProgress}>
    {#snippet identity()}
      <button
        type="button"
        class="bar-artist bar-code bar-code-copy"
        aria-label="Copy join code {session.code}"
        title="Copy join code"
        onclick={() => copyJoinCode(session.code)}
      >
        Join code: {session.code}{#if joinCodeCopied}<span class="bar-code-copied">Copied!</span>{/if}
      </button>
      {#if catalogSong}
        <strong class="bar-title glitch-text">{catalogSong.name}</strong>
        <span class="bar-artist"> — {catalogSong.artist}</span>
      {/if}
    {/snippet}
    {#snippet controls()}
      <!-- Count-In & Metronome Beat Widget (ui.md): count-in mode is
           session-gated (countInEnabled, everyone), playback mode is
           personal (metronomeStore); renders nothing otherwise. -->
      <BeatWidget
        countInEnabled={session.countInEnabled}
        metronomeOn={$metronomeStore}
        phase={$beatWidgetState.phase}
        beatInBar={$beatWidgetState.beatInBar}
        beatCount={$beatWidgetState.beatCount}
        barNumber={$beatWidgetState.barNumber}
        beatDurationMs={$beatWidgetState.beatDurationMs}
      />
      {#if $clientStore.view === 'lobby'}
        <Button variant="ghost" label="Song & part" iconOnly icon={ListMusic} onclick={toggleSongPartModal} />
      {/if}
      <!-- T004 (tasks-icons-a11y-ticker-a10d.md, feedback F006 — confirmed
           reversal of ui.md's "absent entirely" decision): always visible,
           disabled (never absent) when no ticker is available, with the
           reason carried in the accessible name/title. -->
      <Button
        variant="ghost"
        label={lyricsTickerAvailable ? 'Toggle lyrics' : `Toggle lyrics — ${lyricsToggleReason}`}
        iconOnly
        icon={MicVocal}
        disabled={!lyricsTickerAvailable}
        onclick={toggleLyricsOverlay}
      />
      {#if $clientStore.view === 'lobby' || $clientStore.view === 'playback'}
        <Button variant="ghost" label="Settings" iconOnly icon={Settings} onclick={toggleSettingsModal} />
      {/if}
      <Button variant="ghost" label="Help & About" iconOnly icon={CircleHelp} onclick={toggleHelpAboutModal} />
      {#if isHost}
        {#if $clientStore.view === 'lobby'}
          <Button variant="riot" label="Start" iconOnly icon={Play} disabled={!session.selectedSong} onclick={startPlayback} />
        {:else}
          <Button variant="ghost" label={isRunning ? 'Pause' : 'Resume'} iconOnly icon={isRunning ? Pause : Play} onclick={togglePause} />
          <Button variant="ghost" label="Stop" iconOnly icon={Square} onclick={stopPlayback} />
        {/if}
      {/if}
      <Button variant="ghost" label="Leave session" iconOnly icon={Bone} onclick={leaveSession} />
    {/snippet}
    {#snippet status()}
      {#if participant}
        <!-- The badge becomes the participant's own ready control once
             loaded (clock = confirm, check = un-ready); loading/no-part
             stay the non-interactive badge exactly as before. -->
        {#if participant.connectionStatus === 'connected' && participant.readiness === 'loaded'}
          <Button variant="ghost" label="I'm ready — click to confirm" iconOnly icon={Clock} onclick={toggleReady} />
        {:else if participant.connectionStatus === 'connected' && participant.readiness === 'ready'}
          <Button variant="ghost" label="Ready — click to un-ready" iconOnly icon={Check} onclick={toggleReady} />
        {:else}
          <ReadinessBadge readiness={participant.readiness} connected={participant.connectionStatus === 'connected'} />
        {/if}
      {/if}
      <!-- Persistent account menu (ui.md Account & Sign-In). Absent when
           accounts are unavailable (no DB) — AccountMenu renders nothing. -->
      <AccountMenu
        status={$accountStore.status}
        displayName={$accountStore.displayName}
        onSignIn={signIn}
        onSignOut={signOut}
        ownedCatalogueIds={$accountStore.ownedCatalogueIds}
        onOpenAuthoring={() => authoringModalOpen.set(true)}
      />
    {/snippet}
  </Bar>
{/if}

<SongPartModal open={songPartModalOpen} dismissible={true} onClose={closeSongPartModal} />
<SettingsModal open={settingsModalOpen} onClose={() => (settingsModalOpen = false)} />
<HelpAboutModal open={helpAboutModalOpen} onClose={() => (helpAboutModalOpen = false)} />
<!-- In-app authoring (T011-T018, ui.md In-App Authoring) — a single instance
     shared by both AccountMenu entry points (Landing and Bar) via
     authoringModalOpen (Principle I). -->
<AuthoringModal
  open={$authoringModalOpen}
  onClose={() => authoringModalOpen.set(false)}
  ownedCatalogueIds={$accountStore.ownedCatalogueIds}
  onCatalogueCreated={() => void loadAccount()}
  songUploadEnabled={$accountStore.songUploadEnabled}
/>

<StartNegotiationModals
  hostModalOpen={$clientStore.startConfirmationOpen}
  participantModalOpen={$clientStore.hostStartPendingOpen}
  {notReadyCount}
  onAnswer={answerStartConfirmation}
  onImReady={imReady}
  onCloseHostModal={() => clientStore.update((s) => ({ ...s, startConfirmationOpen: false }))}
  onCloseParticipantModal={() => clientStore.update((s) => ({ ...s, hostStartPendingOpen: false }))}
/>

<Toasts />
<ConnectionBanner />

<style>
  /*
   * T005 (feedback F002): `.app-content` (Lobby/Playback) and
   * `.full-lyrics-view` used to be independent top-level siblings, each
   * capable of scrolling — two scrollbars, and stale Lobby/Playback
   * content sitting above the lyrics sheet, unable to scroll away, since
   * `.app-content` has no height/overflow constraint of its own and just
   * sits in normal document flow. Once a lyrics-part participant reaches
   * the Playback view, `.app-content` collapses out of the document flow
   * entirely — `.full-lyrics-view` becomes the one scrollable region.
   */
  .app-content.collapsed {
    display: none;
  }
  .app-content.with-bar {
    /* The hazard strip now pins to the very top of the viewport
       (Bar.svelte's .hazard-wrap) instead of sitting above the nav bar —
       clear it here so top content isn't hidden behind it. HazardBar
       itself renders at ~0.625rem tall (0.5rem height + 1px border each
       side); --space-6 gives a bit of breathing room beyond that. */
    padding-top: var(--space-6);
    /* Clears the persistent, bottom-pinned Bar's own height alone now —
       it no longer needs to also account for the hazard strip's height,
       since that moved out from above it to the top of the viewport. */
    padding-bottom: var(--bar-height);
  }

  /*
   * T004 (tasks-lyrics-only-view-fix-2-c7cf.md): .full-lyrics-view's
   * own display/.visible toggle used to be duplicated here, conflicting
   * with lyrics.css's `display: flex` rule for the same class (this
   * scoped rule always won on specificity, so lyrics.css's flex-based
   * centering never applied). Moved into lyrics.css alongside that
   * class's other styling — this file only owns .engine-containers now.
   */
  .engine-containers {
    display: none;
  }
  .engine-containers.visible {
    display: block;
  }
  .engine-containers.visible {
    /* Reserves scroll room so the tab's last rows can clear the fixed
       lyrics ticker strip (plan-lyrics-ticker-2026-07-03.md). */
    padding-bottom: calc(var(--lyrics-strip-height) * 2);
  }
  /*
   * T004 (tasks-bottom-bar-icons-47a6.md, feedback F001): toggling the
   * overlay off used to leave this reserved padding-bottom applied even
   * though `lyrics-overlay.ts`'s setVisible() had already set the overlay
   * element itself to `display: none` — on `.tab-container`'s solid
   * canvas-bg, that leftover reserved region read as a persisting
   * background band. `clientStore.lyricsOverlayVisible` (mirrored from
   * playback-engine.ts's module-closure `showOverlay` state by
   * toggleOverlay()) now lets this collapse reactively instead.
   */
  .engine-containers.visible.lyrics-overlay-hidden {
    padding-bottom: 0;
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
  /* Identity text truncates on one line each instead of wrapping mid-word
     and being clipped by .bar-identity's overflow:hidden on phone widths. */
  .bar-title,
  .bar-artist {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  /* The join code is the one identity element that must never truncate
     (ui.md: participants read it off this bar to invite others) — it's
     short and fixed-length; let the song title/artist give way instead. */
  .bar-code {
    flex-shrink: 0;
  }
  .bar-code-copy {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .bar-code-copied {
    margin-left: 0.4em;
    color: var(--accent, #6cf);
    font-weight: 600;
  }
</style>
