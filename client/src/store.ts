import { writable } from 'svelte/store';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import type { WsClient, ConnectionStatus } from './ws-client';

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
  /** Real playback position (0–1), local to this participant's own alphaTab instance — updated by playback-engine.ts's `playerPositionChanged` subscription. Read by App.svelte's hazard-strip fill while in the Playback view. */
  playbackProgress: number;
  /** Real WS connection state (ws-client.ts) — drives `ConnectionBanner.svelte`. Defaults to `'connecting'`, since a `WsClient` doesn't exist until `connect()` runs, but the very first connection attempt is already underway by the time anything could read this. */
  connectionStatus: ConnectionStatus;
}

function createClientStore() {
  const { subscribe, set, update } = writable<ClientState>({
    view: 'landing',
    session: null,
    selfParticipantId: null,
    catalog: [],
    wsClient: null,
    playbackProgress: 0,
    connectionStatus: 'connecting',
  });
  return { subscribe, set, update };
}

export const clientStore = createClientStore();
