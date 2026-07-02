import { writable } from 'svelte/store';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import type { WsClient } from './ws-client';

export type ViewState = 'landing' | 'lobby' | 'playback';

// Single reactive client store (constitution Principle I) — view routing
// state and session state live here together, not in separate ad-hoc
// stores or mutable context objects.
export interface ClientState {
  view: ViewState;
  session: Session | null;
  selfParticipantId: string | null;
  catalog: CatalogSong[];
  /** The single shared WsClient (constitution Principle III) — created once on Landing form submit, read by every later view instead of each view opening its own connection. */
  wsClient: WsClient | null;
}

function createClientStore() {
  const { subscribe, set, update } = writable<ClientState>({
    view: 'landing',
    session: null,
    selfParticipantId: null,
    catalog: [],
    wsClient: null,
  });
  return { subscribe, set, update };
}

export const clientStore = createClientStore();
