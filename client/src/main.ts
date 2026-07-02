import { mount } from 'svelte';
import App from './App.svelte';
import { startSessionPersistence } from './session-persistence';
import './styles/tokens.css';
import './styles/motifs.css';
import './lyrics.css';

startSessionPersistence();
mount(App, { target: document.getElementById('app')! });
