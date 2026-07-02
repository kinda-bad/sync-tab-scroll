<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '../ws-client';
  import { loadStoredSession } from '../session-persistence';
  import TextInput from '../components/TextInput.svelte';
  import Button from '../components/Button.svelte';

  let displayName = '';
  let joinCode = '';

  onMount(() => {
    const stored = loadStoredSession();
    if (stored) connect(stored.displayName, stored.code, stored.participantId);
  });

  function createSession() {
    if (!displayName) return;
    connect(displayName);
  }

  function joinSession() {
    if (!displayName || !joinCode) return;
    connect(displayName, joinCode);
  }
</script>

<section class="landing">
  <div class="landing-card">
    <h1 class="landing-title">
      SYNC<span class="landing-title-dash">-</span>TAB<span class="landing-title-dash">-</span>SCROLL
    </h1>
    <p class="landing-tagline">Live session viewer</p>

    <TextInput label="Your name" placeholder="Musician" bind:value={displayName} />

    <Button variant="riot" label="Create session" disabled={!displayName} onclick={createSession} />

    <div class="landing-join">
      <TextInput label="Session code" placeholder="ABC123" uppercase bind:value={joinCode} />
      <Button variant="ghost" label="Join" disabled={!displayName || !joinCode} onclick={joinSession} />
    </div>
  </div>
</section>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .landing-card {
    width: 100%;
    max-width: 24rem;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .landing-title {
    font-family: var(--font-display);
    font-size: 2.5rem;
    letter-spacing: 0.02em;
    line-height: 1;
    margin: 0;
  }

  .landing-title-dash {
    color: var(--riot);
  }

  .landing-tagline {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--riot);
    margin: 0 0 var(--space-2);
  }

  .landing-join {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    border-top: 1px solid var(--border);
    padding-top: var(--space-4);
  }

  .landing-join :global(.field) {
    flex: 1;
  }
</style>
