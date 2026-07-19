<script lang="ts">
  import { clientStore } from '../store';

  $: session = $clientStore.session;
  $: isHost = session?.hostId === $clientStore.selfParticipantId;
  $: selfParticipant = session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: hasPart = selfParticipant?.selectedPart != null;
  $: readyCount = session?.participants.filter((p) => p.readiness === 'ready').length ?? 0;
  $: totalCount = session?.participants.length ?? 0;

  // Participant list, lobby cursor, and Spotlight-mode controls moved into
  // SettingsModal.svelte's Participants tab (settings-modal-redesign). This
  // body is now a single state-dependent hint, one of four mutually
  // exclusive cases. Cases 1-3 normally render behind the song/part
  // modal's backdrop (auto-opened, dismissible — ui.md) — reachable in
  // practice after the user dismisses the modal, or if that gating logic
  // changes later; usually covered immediately in today's normal flow.
  $: hint = !session
    ? 'Connecting…'
    : !isHost && !session.selectedSong
      ? 'Waiting for the host to pick a song.'
      : isHost && !session.selectedSong
        ? 'Pick a song to get started. Use Song & part in the bar below.'
        : !hasPart
          ? 'Select your part. Use Song & part in the bar below.'
          : `${readyCount} of ${totalCount} ready — waiting for host to start.`;
</script>

<section class="lobby">
  <h1 class="lobby-title glitch-text">Lobby</h1>
  <p class="hint">{hint}</p>
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

  .hint {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }
</style>
