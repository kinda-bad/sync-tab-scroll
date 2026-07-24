<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import ListRow from './ListRow.svelte';
  import { fieldValidationError } from '../input-validation';

  // In-app authoring surface (ui.md In-App Authoring, Phase 2) — a standalone
  // modal opened from AccountMenu's "My catalogues" entry (T011), never a tab
  // inside SettingsModal/SongPartModal (authoring is a distinct activity from
  // picking a song to play).
  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;
  export let ownedCatalogueIds: string[] = [];
  export let onCatalogueCreated: (catalogueId: string) => void = () => {};
  /** T014: absent (not disabled) "Add song" per-row when the server has upload gated off. */
  export let songUploadEnabled = true;
  /** Injectable for tests only — real code always uses the global `XMLHttpRequest`. */
  export let xhrFactory: () => XMLHttpRequest = () => new XMLHttpRequest();

  let showCreateForm = false;
  let slug = '';
  let name = '';
  let visibility: 'public' | 'private' = 'public';
  let key = '';
  let createError: string | null = null;
  let creating = false;

  // T009: non-authoritative inline feedback mirroring server/src/catalogue-
  // authoring-routes.ts's validateField caps — UX only, the actual
  // enforcement is server-side.
  let slugError: string | null = null;
  let nameError: string | null = null;
  let keyError: string | null = null;
  function handleSlugBlur() {
    slugError = fieldValidationError(slug, 64, 'Slug');
  }
  function handleNameBlur() {
    nameError = fieldValidationError(name, 128, 'Name');
  }
  function handleKeyBlur() {
    keyError = fieldValidationError(key, 256, 'Activation key');
  }

  function resetCreateForm(): void {
    showCreateForm = false;
    slug = '';
    name = '';
    visibility = 'public';
    key = '';
    createError = null;
    slugError = null;
    nameError = null;
    keyError = null;
    creating = false;
  }

  async function submitCreate(): Promise<void> {
    createError = null;
    creating = true;
    try {
      const res = await fetch('/catalogues', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, name, visibility, key: visibility === 'private' ? key : undefined }),
      });
      const body = (await res.json()) as { ok?: boolean; catalogueId?: string; error?: string };
      if (!res.ok || !body.ok) {
        // Inline, not a toast (ui.md's stated rationale for authoring-form
        // errors — the user needs to see it next to the input to retry).
        createError = body.error ?? `Failed (${res.status})`;
        return;
      }
      onCatalogueCreated(body.catalogueId ?? slug);
      resetCreateForm();
    } catch {
      createError = 'Network error — please try again.';
    } finally {
      creating = false;
    }
  }

  // T013: per-catalogue "Add song" panel.
  let openSongPanelFor: string | null = null;
  let artist = '';
  let title = '';
  let submitterName = '';
  let tosAccepted = false;
  let songFile: FileList | undefined;
  type SongUploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  let songUploadState: SongUploadState = 'idle';
  let songUploadError: string | null = null;

  // T011: non-authoritative inline feedback mirroring server/src/song-
  // upload-route.ts's validateField caps — UX only.
  let artistError: string | null = null;
  let titleError: string | null = null;
  let submitterNameError: string | null = null;
  function handleArtistBlur() {
    artistError = fieldValidationError(artist, 128, 'Artist');
  }
  function handleTitleBlur() {
    titleError = fieldValidationError(title, 128, 'Title');
  }
  function handleSubmitterNameBlur() {
    submitterNameError = fieldValidationError(submitterName, 128, 'Submitter name');
  }

  function toggleSongPanel(catalogueId: string): void {
    openSongPanelFor = openSongPanelFor === catalogueId ? null : catalogueId;
    artist = '';
    title = '';
    submitterName = '';
    tosAccepted = false;
    songFile = undefined;
    songUploadState = 'idle';
    songUploadError = null;
    artistError = null;
    titleError = null;
    submitterNameError = null;
  }

  function submitSong(catalogueId: string): void {
    const file = songFile?.[0];
    if (!file || !artist || !title || !submitterName || !tosAccepted) return;

    songUploadState = 'uploading';
    songUploadError = null;
    const xhr = xhrFactory();
    const qs = new URLSearchParams({ artist, title, submitterName }).toString();
    xhr.open('POST', `/catalogues/${encodeURIComponent(catalogueId)}/songs?${qs}`);
    // Transfer finishing (100% sent) is the real signal the request has left
    // the client and the server's pipeline extraction (which can take a few
    // seconds, infrastructure.md) is what's left — not a fixed timer. A tiny
    // body can finish before any 'progress' tick fires at all (real browser
    // behavior, not just a test artifact), so the upload's own 'load' event
    // is the reliable fallback signal for "fully sent."
    const markProcessing = () => {
      if (songUploadState === 'uploading') songUploadState = 'processing';
    };
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && e.loaded >= e.total) markProcessing();
    });
    xhr.upload.addEventListener('load', markProcessing);
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        songUploadState = 'done';
        toggleSongPanel(catalogueId); // reset the form; closes the panel
      } else {
        songUploadState = 'error';
        try {
          songUploadError = (JSON.parse(xhr.responseText) as { error?: string }).error ?? `Failed (${xhr.status})`;
        } catch {
          songUploadError = `Failed (${xhr.status})`;
        }
      }
    });
    xhr.addEventListener('error', () => {
      songUploadState = 'error';
      songUploadError = 'Network error — please try again.';
    });
    xhr.send(file);
  }

  // T018: per-catalogue "Co-owners" panel.
  let openOwnersPanelFor: string | null = null;
  let owners: { userId: string; displayName: string }[] = [];
  let ownersError: string | null = null;
  let inviteLink: string | null = null;
  let generatingInvite = false;

  async function toggleOwnersPanel(catalogueId: string): Promise<void> {
    if (openOwnersPanelFor === catalogueId) {
      openOwnersPanelFor = null;
      return;
    }
    openOwnersPanelFor = catalogueId;
    owners = [];
    ownersError = null;
    inviteLink = null;
    try {
      const res = await fetch(`/catalogues/${encodeURIComponent(catalogueId)}/owners`);
      const body = (await res.json()) as { owners?: { userId: string; displayName: string }[]; error?: string };
      if (!res.ok) {
        ownersError = body.error ?? `Failed (${res.status})`;
        return;
      }
      owners = body.owners ?? [];
    } catch {
      ownersError = 'Network error — please try again.';
    }
  }

  async function generateInvite(catalogueId: string): Promise<void> {
    generatingInvite = true;
    try {
      const res = await fetch(`/catalogues/${encodeURIComponent(catalogueId)}/invite`, { method: 'POST' });
      const body = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !body.token) {
        ownersError = body.error ?? `Failed (${res.status})`;
        return;
      }
      inviteLink = `${window.location.origin}/?invite=${encodeURIComponent(body.token)}`;
    } catch {
      ownersError = 'Network error — please try again.';
    } finally {
      generatingInvite = false;
    }
  }
</script>

<Modal {open} title="My catalogues" {onClose}>
  {#if ownedCatalogueIds.length === 0 && !showCreateForm}
    <p class="empty-state">No catalogues yet — create one to get started.</p>
  {/if}

  {#if ownedCatalogueIds.length > 0}
    <ul class="catalogue-list">
      {#each ownedCatalogueIds as catalogueId (catalogueId)}
        <ListRow label={catalogueId}>
          {#if songUploadEnabled}
            <Button variant="ghost" label="Add song" onclick={() => toggleSongPanel(catalogueId)} />
          {/if}
          <Button variant="ghost" label="Co-owners" onclick={() => void toggleOwnersPanel(catalogueId)} />
        </ListRow>

        {#if openSongPanelFor === catalogueId}
          <form
            class="song-form"
            onsubmit={(e) => {
              e.preventDefault();
              submitSong(catalogueId);
            }}
          >
            <input type="file" accept=".gp,.gp3,.gp4,.gp5,.gpx" bind:files={songFile} required aria-label="Guitar Pro file" />
            <input type="text" placeholder="Artist" bind:value={artist} onblur={handleArtistBlur} required />
            {#if artistError}<p class="form-error">{artistError}</p>{/if}
            <input type="text" placeholder="Title" bind:value={title} onblur={handleTitleBlur} required />
            {#if titleError}<p class="form-error">{titleError}</p>{/if}
            <input type="text" placeholder="Submitter name" bind:value={submitterName} onblur={handleSubmitterNameBlur} required />
            {#if submitterNameError}<p class="form-error">{submitterNameError}</p>{/if}
            <label><input type="checkbox" bind:checked={tosAccepted} /> I have the right to distribute this song</label>
            {#if songUploadState === 'uploading'}
              <p class="song-status">Uploading…</p>
            {:else if songUploadState === 'processing'}
              <p class="song-status">Processing…</p>
            {:else if songUploadState === 'error'}
              <p class="form-error">{songUploadError}</p>
            {/if}
            <div class="form-actions">
              <Button
                type="submit"
                variant="riot"
                label="Upload song"
                disabled={songUploadState === 'uploading' || songUploadState === 'processing'}
              />
              <Button variant="ghost" label="Cancel" onclick={() => toggleSongPanel(catalogueId)} />
            </div>
          </form>
        {/if}

        {#if openOwnersPanelFor === catalogueId}
          <div class="owners-panel">
            {#if ownersError}
              <p class="form-error">{ownersError}</p>
            {:else}
              <ul class="owners-list">
                {#each owners as owner (owner.userId)}
                  <li>{owner.displayName}</li>
                {/each}
              </ul>
            {/if}
            <Button variant="ghost" label="Generate invite link" disabled={generatingInvite} onclick={() => void generateInvite(catalogueId)} />
            {#if inviteLink}
              <input type="text" readonly value={inviteLink} class="invite-link" onclick={(e) => (e.target as HTMLInputElement).select()} />
            {/if}
          </div>
        {/if}
      {/each}
    </ul>
  {/if}

  {#if !showCreateForm}
    <Button variant="riot" label="Create catalogue" onclick={() => (showCreateForm = true)} />
  {:else}
    <form
      class="create-form"
      onsubmit={(e) => {
        e.preventDefault();
        void submitCreate();
      }}
    >
      <input type="text" placeholder="Slug (e.g. my-band)" bind:value={slug} onblur={handleSlugBlur} required />
      {#if slugError}<p class="form-error">{slugError}</p>{/if}
      <input type="text" placeholder="Display name" bind:value={name} onblur={handleNameBlur} required />
      {#if nameError}<p class="form-error">{nameError}</p>{/if}
      <label><input type="radio" name="visibility" value="public" bind:group={visibility} /> Public</label>
      <label><input type="radio" name="visibility" value="private" bind:group={visibility} /> Private</label>
      {#if visibility === 'private'}
        <input type="text" placeholder="Activation key" bind:value={key} onblur={handleKeyBlur} required />
        {#if keyError}<p class="form-error">{keyError}</p>{/if}
      {/if}
      {#if createError}
        <p class="form-error">{createError}</p>
      {/if}
      <div class="form-actions">
        <Button type="submit" variant="riot" label="Save catalogue" disabled={creating} />
        <Button variant="ghost" label="Cancel" onclick={resetCreateForm} />
      </div>
    </form>
  {/if}
</Modal>

<style>
  .empty-state {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }

  .catalogue-list {
    list-style: none;
    margin: 0 0 var(--space-4) 0;
    padding: 0;
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .create-form input[type='text'] {
    font-family: var(--font-mono);
    background: var(--bg-alt, transparent);
    border: 1px solid var(--border);
    color: var(--ink);
    padding: var(--space-2);
  }

  .form-error {
    color: var(--hazard, #e05555);
    font-size: 0.8125rem;
  }

  .form-actions {
    display: flex;
    gap: var(--space-2);
  }

  .song-form,
  .owners-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0 0 var(--space-3) 0;
    padding: var(--space-2) var(--space-3);
    border-left: 2px solid var(--border);
  }

  .song-form input[type='text'] {
    font-family: var(--font-mono);
    background: var(--bg-alt, transparent);
    border: 1px solid var(--border);
    color: var(--ink);
    padding: var(--space-2);
  }

  .song-status {
    color: var(--ink-dim);
    font-size: 0.8125rem;
  }

  .owners-list {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--ink);
  }

  .invite-link {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    background: var(--bg-alt, transparent);
    border: 1px solid var(--border);
    color: var(--ink);
    padding: var(--space-2);
  }
</style>
