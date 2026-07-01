import type { ReadinessStatus, Session } from './index.js';

export type ClientMessage =
  | { type: 'session-create'; displayName: string }
  | { type: 'session-join'; code: string; displayName: string }
  | { type: 'part-select'; part: string | 'lyrics' | null }
  | { type: 'readiness-update'; readiness: ReadinessStatus }
  | { type: 'host-remove-participant'; participantId: string }
  | { type: 'playback-control'; action: 'start' | 'pause' | 'resume' | 'seek'; tickPosition?: number }
  | { type: 'lobby-cursor-set'; tickPosition: number | null };

export type ServerMessage = { type: 'session-state'; session: Session; selfParticipantId: string } | { type: 'error'; message: string };
