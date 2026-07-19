import { writable } from 'svelte/store';
import type { CatalogSong, Catalogue, Session } from '@sync-tab-scroll/shared';
import type { WsClient, ConnectionStatus } from './ws-client';

export type ViewState = 'landing' | 'lobby' | 'playback';

// Single reactive client store (constitution Principle I) — view routing
// state and session state live here together, not in separate ad-hoc
// stores or mutable context objects.
export interface ClientState {
  view: ViewState;
  session: Session | null;
  selfParticipantId: string | null;
  /** Songs visible to this session (a private catalogue's songs appear only once unlocked — infrastructure.md). */
  catalog: CatalogSong[];
  /** Every catalogue's client-safe metadata (id/name/public), always delivered even for a locked catalogue — drives the picker's catalogue grouping and locked indicators (ui.md). */
  catalogues: Catalogue[];
  /** The single shared WsClient (constitution Principle III) — created once on Landing form submit, read by every later view instead of each view opening its own connection. */
  wsClient: WsClient | null;
  /** Real playback position (0–1), local to this participant's own alphaTab instance — updated by playback-engine.ts's `playerPositionChanged` subscription. Read by App.svelte's hazard-strip fill while in the Playback view. */
  playbackProgress: number;
  /**
   * Whether this participant's own tab/lyrics have actually finished
   * rendering — `scoreLoaded` plus (for an instrument part) a real render
   * having happened while the container was visible (playback-engine.ts's
   * `renderedWhileVisible`, tasks-session-lifecycle-836f T008). Distinct
   * from `Participant.readiness` (cross-participant, includes SoundFont
   * load and is broadcast for everyone else's Lobby view) — this is a
   * purely local "is my own Playback view actually showing something yet"
   * signal, read by `Playback.svelte`'s loading indicator.
   */
  engineReady: boolean;
  /** Real WS connection state (ws-client.ts) — drives `ConnectionBanner.svelte`. Defaults to `'connecting'`, since a `WsClient` doesn't exist until `connect()` runs, but the very first connection attempt is already underway by the time anything could read this. */
  connectionStatus: ConnectionStatus;
  /**
   * Mirrors playback-engine.ts's module-closure `showOverlay` state
   * (tasks-bottom-bar-icons-47a6.md T004) — the in-tab lyrics overlay's
   * own visibility is otherwise invisible outside that closure, so
   * App.svelte had no reactive signal to collapse the strip's reserved
   * `padding-bottom` once the overlay itself was toggled off, leaving a
   * persistent background band behind. Defaults `true` to match the
   * overlay's own initial `showOverlay: true`.
   */
  lyricsOverlayVisible: boolean;
  /**
   * Start negotiation modal flags (explicit-participant-readiness, ui.md
   * Explicit Readiness & Start Negotiation). `startConfirmationOpen`: the
   * host's "N participants are not yet ready, start anyway?" modal — opened
   * by `start-confirmation-needed`, closed locally on answer or Esc (Esc
   * sends nothing; the server-side negotiation stays pending).
   * `hostStartPendingOpen`: the participant's "Host wants to start, are you
   * ready?" modal — opened by `host-start-pending`, auto-dismissed by
   * `host-start-resolved` either way.
   */
  startConfirmationOpen: boolean;
  hostStartPendingOpen: boolean;
}

function createClientStore() {
  const { subscribe, set, update } = writable<ClientState>({
    view: 'landing',
    session: null,
    selfParticipantId: null,
    catalog: [], catalogues: [],
    wsClient: null,
    playbackProgress: 0,
    engineReady: false,
    startConfirmationOpen: false,
    hostStartPendingOpen: false,
    connectionStatus: 'connecting',
    lyricsOverlayVisible: true,
  });
  return { subscribe, set, update };
}

export const clientStore = createClientStore();
