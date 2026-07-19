import type { CatalogSong, Catalogue, ReadinessStatus, SelectedPart, Session } from './index.js';

export type ClientMessage =
  | { type: 'session-create'; displayName: string }
  | { type: 'session-join'; code: string; displayName: string; participantId?: string }
  | { type: 'part-select'; part: SelectedPart }
  | { type: 'readiness-update'; readiness: ReadinessStatus }
  // Human ready confirmation (`explicit-participant-readiness`): flips the
  // sender's readiness `loaded → ready` (true) or `ready → loaded` (false).
  | { type: 'ready-set'; ready: boolean }
  // Host's answer to `start-confirmation-needed` (infrastructure.md Start
  // Negotiation): proceed → run the normal start flow; cancel → no start.
  | { type: 'start-confirmation-answer'; proceed: boolean }
  | { type: 'host-remove-participant'; participantId: string }
  | { type: 'playback-control'; action: 'start' | 'pause' | 'resume' | 'stop' | 'seek'; tickPosition?: number }
  | { type: 'lobby-cursor-set'; tickPosition: number | null }
  | { type: 'spotlight-mode-set'; enabled: boolean }
  | { type: 'count-in-set'; enabled: boolean }
  | { type: 'song-select'; songId: string }
  | { type: 'catalogue-unlock'; key: string }
  | { type: 'playback-tick-report'; tickPosition: number }
  | { type: 'host-delegate'; targetParticipantId: string }
  | { type: 'request-host' }
  | { type: 'host-request-decline' };

export type ServerMessage =
  | { type: 'session-state'; session: Session; selfParticipantId: string }
  | { type: 'catalog'; catalogues: Catalogue[]; songs: CatalogSong[] }
  // Typed terminal signal for a join against a code with no live session
  // (F001): the client treats this as unconditionally terminal (clear stored
  // session, suppress reconnect, close), rather than inferring it from a
  // stringly-typed `error` plus a `session === null` guess. Carries the
  // requested `code` so the client can surface it in the toast.
  | { type: 'session-not-found'; code: string }
  // Start negotiation (infrastructure.md Start Negotiation,
  // `explicit-participant-readiness`): the server holds a host start while
  // any connected participant isn't `ready` —
  // `start-confirmation-needed` opens the host's "start anyway?" modal,
  // `host-start-pending` opens each not-ready participant's "are you
  // ready?" modal, and `host-start-resolved` auto-dismisses it when the
  // host answers (or disconnects — resolved `started: false`).
  | { type: 'start-confirmation-needed'; notReadyCount: number }
  | { type: 'host-start-pending' }
  | { type: 'host-start-resolved'; started: boolean }
  | { type: 'error'; message: string };
