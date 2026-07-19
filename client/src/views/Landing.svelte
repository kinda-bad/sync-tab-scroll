<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '../ws-client';
  import { loadStoredSession } from '../session-persistence';
  import { accountStore, signIn, signOut, authoringModalOpen } from '../account';
  import TextInput from '../components/TextInput.svelte';
  import Button from '../components/Button.svelte';
  import AccountMenu from '../components/AccountMenu.svelte';

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
      <!-- The same AccountMenu component that renders in the Bar (ui.md Account
           & Sign-In) — identity + Sign out when signed-in, a "Sign in" link when
           signed-out, nothing when accounts are unavailable. Kept visually
           subordinate to Create/Join: optional, never a gate. -->
      {#if $accountStore.status === 'signed-in' || $accountStore.status === 'signed-out'}
        <div class="landing-signin">
          {#if $accountStore.status === 'signed-out'}
            <span class="landing-signin-label">Optional — sign in to remember unlocked setlists</span>
          {/if}
          <div class="landing-signin-actions">
            <AccountMenu
              status={$accountStore.status}
              displayName={$accountStore.displayName}
              onSignIn={signIn}
              onSignOut={signOut}
              ownedCatalogueIds={$accountStore.ownedCatalogueIds}
              onOpenAuthoring={() => authoringModalOpen.set(true)}
            />
          </div>
        </div>
      {/if}
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
    /* Sized to keep SYNC-TAB-SCROLL on one line inside the 24rem card,
       shrinking with the viewport on narrow screens. */
    font-size: clamp(1.25rem, 5.4vw, 2rem);
    letter-spacing: 0.02em;
    line-height: 1;
    white-space: nowrap;
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .landing-choice :global(.btn-wrap) {
    display: block;
  }

  .landing-choice :global(.btn) {
    width: 100%;
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

  /* Subordinate to Create/Join — smaller, dimmer, clearly optional (ui.md). */
  .landing-signin {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--ink-dim);
  }

  .landing-signin-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--ink-dim);
  }

  .landing-signin-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }
</style>
