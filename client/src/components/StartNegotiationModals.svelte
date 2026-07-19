<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  // Start negotiation modals (explicit-participant-readiness, ui.md
  // Explicit Readiness & Start Negotiation). Both follow the existing
  // modal idiom — dismissible, Esc closes with NO action taken: dismissing
  // the host modal sends nothing, so the server-side negotiation stays
  // pending until answered or replaced by another start.
  export let hostModalOpen: boolean;
  export let participantModalOpen: boolean;
  /** Live not-ready count, derived from session-state broadcasts (drops as participants ready up during the window). */
  export let notReadyCount: number;
  export let onAnswer: (proceed: boolean) => void;
  export let onImReady: () => void;
  export let onCloseHostModal: () => void;
  export let onCloseParticipantModal: () => void;
</script>

<Modal open={hostModalOpen} title="Start anyway?" dismissible={true} onClose={onCloseHostModal}>
  <p class="negotiation-text">
    {notReadyCount}
    {notReadyCount === 1 ? 'participant is' : 'participants are'} not yet ready. Start anyway?
  </p>
  <div class="negotiation-actions">
    <Button variant="riot" label="Start anyway" onclick={() => onAnswer(true)} />
    <Button variant="ghost" label="Cancel" onclick={() => onAnswer(false)} />
  </div>
</Modal>

<Modal open={participantModalOpen} title="Host wants to start" dismissible={true} onClose={onCloseParticipantModal}>
  <p class="negotiation-text">Host wants to start, are you ready?</p>
  <div class="negotiation-actions">
    <Button variant="riot" label="I'm ready" onclick={onImReady} />
  </div>
</Modal>

<style>
  .negotiation-text {
    margin: 0 0 var(--space-4);
  }

  .negotiation-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }
</style>
