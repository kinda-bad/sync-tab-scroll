import type { Preview } from '@storybook/svelte-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/styles/tokens.css';
import '../src/styles/motifs.css';

// Theme is a `data-theme` attribute on <html> (styles/tokens.css) — the
// same mechanism the real app uses (Playback.svelte's toggleTheme). A new
// theme (e.g. a future cyberpunk variant) is a new entry in `themes` below
// plus a matching `[data-theme='...']` block in tokens.css — nothing else
// changes.
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { dark: 'dark', light: 'light' },
      defaultTheme: 'dark',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
