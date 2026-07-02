<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ListRow from './ListRow.svelte';
  import ReadinessBadge from './ReadinessBadge.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Components/ListRow',
    component: ListRow,
  });
</script>

{#snippet readyBadge()}
  <ReadinessBadge readiness="ready" />
{/snippet}

{#snippet selectButton()}
  <Button variant="ghost" label="Select" />
{/snippet}

{#snippet changeButton()}
  <Button variant="ghost" label="Change song" />
{/snippet}

<Story name="Participant" args={{ label: 'Jonny Greenwood', sublabel: 'connected', children: readyBadge }} />
<Story name="CatalogEntry" args={{ label: 'Creep', sublabel: 'Radiohead', children: selectButton }} />
<Story name="Active" args={{ label: 'Creep', sublabel: 'Radiohead', active: true, children: changeButton }} />
