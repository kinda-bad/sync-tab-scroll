import type { CatalogSong, Catalogue, ReadinessStatus, SelectedPart, Session } from './index.js';

export type ClientMessage =
  | { type: 'session-create'; displayName: string }
  | { type: 'session-join'; code: string; displayName: string; participantId?: string }
  | { type: 'part-select'; part: SelectedPart }
  | { type: 'readiness-update'; readiness: ReadinessStatus }
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
  | { type: 'error'; message: string };
