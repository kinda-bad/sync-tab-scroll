<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '../ws-client';

  let displayName = '';
  let joinCode = '';

  const STORAGE_KEY = 'sync-tab-scroll:session';

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const { code, displayName: storedName } = JSON.parse(stored);
    if (code && storedName) connect(storedName, code);
  });

  function createSession() {
    if (!displayName) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ displayName }));
    connect(displayName);
  }

  function joinSession() {
    if (!displayName || !joinCode) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: joinCode, displayName }));
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
