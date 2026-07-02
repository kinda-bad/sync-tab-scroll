<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TextInput from './TextInput.svelte';

  const { Story } = defineMeta({
    title: 'Components/TextInput',
    component: TextInput,
  });
</script>

<Story name="DisplayName" args={{ label: 'Your name', placeholder: 'Musician' }} />
<Story name="JoinCode" args={{ label: 'Session code', placeholder: 'ABC123', uppercase: true }} />
