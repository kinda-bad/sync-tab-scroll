import { mount } from 'svelte';
import App from './App.svelte';
import { startSessionPersistence } from './session-persistence';
import { applyTheme, loadStoredTheme } from './theme';
import { loadAccount } from './account';
import { __getPlaybackPositionForE2E } from './playback-engine';
import './styles/tokens.css';
import './styles/motifs.css';
import './lyrics.css';

// Read-only e2e test hook (T019, tasks-recording-drift-foundation) — no
// other window-reachable handle on the engine exists in the real (non-CT)
// build. See __getPlaybackPositionForE2E's own doc comment.
(window as unknown as { __getPlaybackPositionForE2E: typeof __getPlaybackPositionForE2E }).__getPlaybackPositionForE2E =
  __getPlaybackPositionForE2E;

startSessionPersistence();
applyTheme(loadStoredTheme() ?? 'dark');
// Resolve /me on load (ui.md Account & Sign-In). Fire-and-forget: the account
// store starts 'unknown' and updates when this resolves; a server with no DB
// resolves to 'unavailable' (affordances absent), never blocking boot.
void loadAccount();
mount(App, { target: document.getElementById('app')! });
