<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Bar from './Bar.svelte';
  import Button from './Button.svelte';
  import ReadinessBadge from './ReadinessBadge.svelte';

  const { Story } = defineMeta({
    title: 'Components/Bar',
    component: Bar,
  });
</script>

{#snippet songIdentity()}
  <strong style="font-family: var(--font-display); letter-spacing: 0.02em;">CREEP</strong>
  <span style="color: var(--ink-dim); font-size: 0.8125rem;"> — Radiohead</span>
{/snippet}

{#snippet startControl()}
  <Button variant="riot" label="Start" />
{/snippet}

{#snippet playbackControls()}
  <Button variant="ghost" label="Pause" />
  <Button variant="ghost" label="Stop" />
{/snippet}

{#snippet readyStatus()}
  <ReadinessBadge readiness="ready" />
{/snippet}

<Story name="Lobby" args={{ progress: 0.66, identity: songIdentity, controls: startControl, status: readyStatus }} />
<Story name="Playback" args={{ progress: 0.32, identity: songIdentity, controls: playbackControls, status: readyStatus }} />
