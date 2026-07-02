<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Components/Button',
    component: Button,
  });
</script>

<Story name="Ghost" args={{ variant: 'ghost', label: 'Change song' }} />
<Story name="Riot" args={{ variant: 'riot', label: 'Start' }} />
<Story name="Hazard" args={{ variant: 'hazard', label: 'Pause' }} />
<Story name="Disabled" args={{ variant: 'riot', label: 'Start', disabled: true }} />
