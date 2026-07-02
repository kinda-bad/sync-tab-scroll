<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ReadinessBadge from './ReadinessBadge.svelte';

  const { Story } = defineMeta({
    title: 'Components/ReadinessBadge',
    component: ReadinessBadge,
  });
</script>

<Story name="NoPart" args={{ readiness: 'no-part' }} />
<Story name="Loading" args={{ readiness: 'loading' }} />
<Story name="Ready" args={{ readiness: 'ready' }} />
<Story name="Offline" args={{ readiness: 'ready', connected: false }} />
