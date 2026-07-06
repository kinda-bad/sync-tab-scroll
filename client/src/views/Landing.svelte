<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '../ws-client';
  import { loadStoredSession } from '../session-persistence';
  import TextInput from '../components/TextInput.svelte';
  import Button from '../components/Button.svelte';

  let mode: 'choice' | 'create' | 'join' = 'choice';

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
    <h1 class="landing-title glitch-text">
      SYNC<span class="landing-title-dash">-</span>TAB<span class="landing-title-dash">-</span>SCROLL
    </h1>
    <p class="landing-tagline">Live session viewer</p>

    {#if mode === 'choice'}
      <div class="landing-choice">
        <Button variant="riot" label="Create a session" onclick={() => (mode = 'create')} />
        <Button variant="ghost" label="Join a session" onclick={() => (mode = 'join')} />
      </div>
    {:else if mode === 'create'}
      <form onsubmit={(e) => { e.preventDefault(); createSession(); }}>
        <TextInput label="Your name" placeholder="Musician" bind:value={displayName} />
        <Button variant="riot" type="submit" label="Create session" disabled={!displayName} />
        <button type="button" class="landing-back" onclick={() => (mode = 'choice')}>Back</button>
      </form>
    {:else if mode === 'join'}
      <form onsubmit={(e) => { e.preventDefault(); joinSession(); }}>
        <TextInput label="Your name" placeholder="Musician" bind:value={displayName} />
        <TextInput label="Session code" placeholder="AB12" uppercase bind:value={joinCode} />
        <Button variant="ghost" type="submit" label="Join" disabled={!displayName || !joinCode} />
        <button type="button" class="landing-back" onclick={() => (mode = 'choice')}>Back</button>
      </form>
    {/if}
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

  .landing-choice {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .landing-back {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-dim);
    cursor: pointer;
  }

  .landing-back:hover {
    color: var(--ink);
  }
</style>
