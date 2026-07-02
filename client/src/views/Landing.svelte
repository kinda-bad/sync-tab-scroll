<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '../ws-client';
  import { loadStoredSession } from '../session-persistence';

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

<section>
  <h1>Landing</h1>
  <label>
    Display name
    <input type="text" bind:value={displayName} />
  </label>

  <div>
    <button onclick={createSession}>Create session</button>
  </div>

  <div>
    <input type="text" placeholder="Join code" bind:value={joinCode} />
    <button onclick={joinSession}>Join</button>
  </div>
</section>
