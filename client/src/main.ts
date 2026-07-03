import { mount } from 'svelte';
import App from './App.svelte';
import { startSessionPersistence } from './session-persistence';
import { applyTheme, loadStoredTheme } from './theme';
import './styles/tokens.css';
import './styles/motifs.css';
import './lyrics.css';

startSessionPersistence();
applyTheme(loadStoredTheme() ?? 'dark');
mount(App, { target: document.getElementById('app')! });
