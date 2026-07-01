import { writable } from 'svelte/store';

export type ViewState = 'landing' | 'lobby' | 'playback';

export interface ClientState {
  view: ViewState;
}

function createClientStore() {
  const { subscribe, set, update } = writable<ClientState>({ view: 'landing' });
  return { subscribe, set, update };
}

export const clientStore = createClientStore();
