<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HazardBar from './HazardBar.svelte';

  const { Story } = defineMeta({
    title: 'Components/HazardBar',
    component: HazardBar,
  });
</script>

<Story name="Empty" args={{ fill: 0 }} />
<Story name="Half" args={{ fill: 0.5 }} />
<Story name="Full" args={{ fill: 1 }} />
<Story name="WithLabel" args={{ fill: 0.66, label: '2 / 3 ready' }} />
