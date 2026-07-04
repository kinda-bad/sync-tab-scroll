import type { CatalogSong, ReadinessStatus, SelectedPart, Session } from './index.js';

export type ClientMessage =
  | { type: 'session-create'; displayName: string }
  | { type: 'session-join'; code: string; displayName: string; participantId?: string }
  | { type: 'part-select'; part: SelectedPart }
  | { type: 'readiness-update'; readiness: ReadinessStatus }
  | { type: 'host-remove-participant'; participantId: string }
  | { type: 'playback-control'; action: 'start' | 'pause' | 'resume' | 'stop' | 'seek'; tickPosition?: number }
  | { type: 'lobby-cursor-set'; tickPosition: number | null }
  | { type: 'spotlight-mode-set'; enabled: boolean }
  | { type: 'metronome-set'; enabled: boolean }
  | { type: 'count-in-set'; enabled: boolean }
  | { type: 'song-select'; songId: string }
  | { type: 'playback-tick-report'; tickPosition: number };

export type ServerMessage =
  | { type: 'session-state'; session: Session; selfParticipantId: string }
  | { type: 'catalog'; songs: CatalogSong[] }
  | { type: 'error'; message: string };
