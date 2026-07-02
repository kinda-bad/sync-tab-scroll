import { mount } from 'svelte';
import App from './App.svelte';
import { startSessionPersistence } from './session-persistence';
import './lyrics.css';

startSessionPersistence();
mount(App, { target: document.getElementById('app')! });
