<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import ListRow from './ListRow.svelte';

  // In-app authoring surface (ui.md In-App Authoring, Phase 2) — a standalone
  // modal opened from AccountMenu's "My catalogues" entry (T011), never a tab
  // inside SettingsModal/SongPartModal (authoring is a distinct activity from
  // picking a song to play).
  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;
  export let ownedCatalogueIds: string[] = [];
  export let onCatalogueCreated: (catalogueId: string) => void = () => {};

  let showCreateForm = false;
  let slug = '';
  let name = '';
  let visibility: 'public' | 'private' = 'public';
  let key = '';
  let createError: string | null = null;
  let creating = false;

  function resetCreateForm(): void {
    showCreateForm = false;
    slug = '';
    name = '';
    visibility = 'public';
    key = '';
    createError = null;
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
</script>

<Modal {open} title="My catalogues" {onClose}>
  {#if ownedCatalogueIds.length === 0 && !showCreateForm}
    <p class="empty-state">No catalogues yet — create one to get started.</p>
  {/if}

  {#if ownedCatalogueIds.length > 0}
    <ul class="catalogue-list">
      {#each ownedCatalogueIds as catalogueId (catalogueId)}
        <ListRow label={catalogueId}>
          <slot name="row-actions" {catalogueId} />
        </ListRow>
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
      <input type="text" placeholder="Slug (e.g. my-band)" bind:value={slug} required />
      <input type="text" placeholder="Display name" bind:value={name} required />
      <label><input type="radio" name="visibility" value="public" bind:group={visibility} /> Public</label>
      <label><input type="radio" name="visibility" value="private" bind:group={visibility} /> Private</label>
      {#if visibility === 'private'}
        <input type="text" placeholder="Activation key" bind:value={key} required />
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
</style>
