import { writable } from 'svelte/store';
import type { Session } from '@sync-tab-scroll/shared';

export type ViewState = 'landing' | 'lobby' | 'playback';

// Single reactive client store (constitution Principle I) — view routing
// state and session state live here together, not in separate ad-hoc
// stores or mutable context objects.
export interface ClientState {
  view: ViewState;
  session: Session | null;
  selfParticipantId: string | null;
}

function createClientStore() {
  const { subscribe, set, update } = writable<ClientState>({
    view: 'landing',
    session: null,
    selfParticipantId: null,
  });
  return { subscribe, set, update };
}

export const clientStore = createClientStore();
