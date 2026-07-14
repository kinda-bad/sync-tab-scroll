<script lang="ts">
  import type { AccountStatus } from '../account';

  // Persistent account menu for the Lobby/Playback Bar identity area (ui.md
  // Account & Sign-In). Prop-driven and presentational: the parent wires it to
  // the account store + signIn/signOut. When accounts are unavailable (no DB)
  // or not yet resolved, it renders NOTHING — the affordance is absent, not
  // disabled/errored.
  export let status: AccountStatus;
  export let displayName: string | null = null;
  export let onSignIn: (provider: 'google' | 'github') => void = () => {};
  export let onSignOut: () => void = () => {};

  let expanded = false;
</script>

{#if status === 'signed-in'}
  <span class="account-name" title={displayName ?? ''}>{displayName}</span>
  <!-- Wrapped, not bound bare: `onclick={onSignOut}` would hand the click
       PointerEvent to signOut() as its first arg, shadowing its defaulted
       `fetchFn` param — so the real fetch never fired and logout silently
       no-op'd. Invoke with no args so `fetchFn` keeps its `fetch` default. -->
  <button type="button" class="account-action" onclick={() => onSignOut()}>Sign out</button>
{:else if status === 'signed-out'}
  {#if expanded}
    <button type="button" class="account-action" onclick={() => onSignIn('google')}>Google</button>
    <button type="button" class="account-action" onclick={() => onSignIn('github')}>GitHub</button>
  {:else}
    <button type="button" class="account-action account-signin" onclick={() => (expanded = true)}>Sign in</button>
  {/if}
{/if}

<style>
  .account-name {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-dim);
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-action {
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

  .account-action:hover {
    color: var(--ink);
  }
</style>
