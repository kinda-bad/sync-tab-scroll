import { mount } from 'svelte';
import App from './App.svelte';
import { startSessionPersistence } from './session-persistence';
import { applyTheme, loadStoredTheme } from './theme';
import { loadAccount } from './account';
import './styles/tokens.css';
import './styles/motifs.css';
import './lyrics.css';

startSessionPersistence();
applyTheme(loadStoredTheme() ?? 'dark');
// Resolve /me on load (ui.md Account & Sign-In). Fire-and-forget: the account
// store starts 'unknown' and updates when this resolves; a server with no DB
// resolves to 'unavailable' (affordances absent), never blocking boot.
void loadAccount();
mount(App, { target: document.getElementById('app')! });
