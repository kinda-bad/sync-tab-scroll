<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { buildInfo } from '../build-info';

  // Help/Info/About nav panel (help-info-about-panel-in-nav-b): static
  // content, no server round-trip. Three tabs, following SettingsModal's
  // existing tab pattern (ui.md).
  export let open: boolean;
  export let onClose: (() => void) | undefined = undefined;

  let activeTab: 'about' | 'info' | 'help' = 'about';
</script>

<Modal {open} title="Help & About" {onClose}>
  <div class="modal-tabs">
    <Button variant={activeTab === 'about' ? 'riot' : 'ghost'} label="About" onclick={() => (activeTab = 'about')} />
    <Button variant={activeTab === 'info' ? 'riot' : 'ghost'} label="Info" onclick={() => (activeTab = 'info')} />
    <Button variant={activeTab === 'help' ? 'riot' : 'ghost'} label="Help" onclick={() => (activeTab = 'help')} />
  </div>

  {#if activeTab === 'about'}
    <div class="help-about-panel">
      <p>
        sync-tab-scroll renders and scrolls tablature in real time using
        <a href="https://www.alphatab.net/" target="_blank" rel="noopener noreferrer">alphaTab</a>,
        and takes inspiration from
        <a href="https://www.songsterr.com/" target="_blank" rel="noopener noreferrer">Songsterr</a>'s
        synchronized playback experience.
      </p>
      <p>
        <a href="https://github.com/kinda-bad/sync-tab-scroll" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
      </p>
      <p>
        <a href="https://github.com/sponsors/moui72" target="_blank" rel="noopener noreferrer">Sponsor this project</a>
      </p>
      <p class="version-mark" data-testid="version-mark">
        Version
        {#if buildInfo.url}
          <a href={buildInfo.url} target="_blank" rel="noopener noreferrer">{buildInfo.label}</a>
        {:else}
          {buildInfo.label}
        {/if}
      </p>
    </div>
  {:else if activeTab === 'info'}
    <div class="help-about-panel">
      <p>
        Sync-tab-scroll is a live session viewer: a host picks a song and
        everyone in the session sees the tab scroll in sync as it plays.
      </p>
    </div>
  {:else}
    <div class="help-about-panel">
      <p>Create or join a session from the landing screen, pick a song and your part, and hit Start once everyone's ready.</p>
      <p>Use the "Song & part" nav control to change your song or part, and Settings for everything else: People, Playback, View, Lyrics and Audio. Controls only the host can change are marked "Host".</p>
    </div>
  {/if}
</Modal>

<style>
  .modal-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .help-about-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .version-mark {
    color: var(--ink-dim);
    font-size: 0.85em;
  }
</style>
