import { clientStore } from './store';

export const STORAGE_KEY = 'sync-tab-scroll:session';

export interface StoredSession {
  code: string;
  displayName: string;
  participantId: string;
}

export function loadStoredSession(): StoredSession | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  return JSON.parse(raw);
}

/** Clears the persisted session identity (leaveSession.ts) so a later join/create starts fresh. */
export function clearStoredSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Persists {code, displayName, participantId} once a session exists,
 * covering both create and join uniformly (a single writer, rather than
 * each view guessing what to persist). This is what lets a refresh
 * reconnect by identity (session-join's participantId) instead of always
 * minting a new participant — see the reconnect fix in session-join.ts.
 */
export function startSessionPersistence(): void {
  clientStore.subscribe((s) => {
    if (!s.session || !s.selfParticipantId) return;
    const participant = s.session.participants.find((p) => p.id === s.selfParticipantId);
    if (!participant) return;
    const stored: StoredSession = { code: s.session.code, displayName: participant.displayName, participantId: s.selfParticipantId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  });
}
