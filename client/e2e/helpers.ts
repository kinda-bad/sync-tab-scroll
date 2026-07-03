import type { Page } from '@playwright/test';
import { WebSocket } from 'ws';

export interface StoredSession {
  code: string;
  displayName: string;
  participantId: string;
}

/** Reads the {code, displayName, participantId} session-persistence.ts writes to localStorage. */
export async function readStoredSession(page: Page): Promise<StoredSession> {
  const raw = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:session'));
  if (!raw) throw new Error('No session in localStorage yet');
  return JSON.parse(raw);
}

/**
 * Sends a raw WS message as an already-existing participant, bypassing
 * whatever real UI/event would normally trigger it — used specifically to
 * drive `readiness-update: ready` past alphaTab's `isReadyForPlayback` gate,
 * which never resolves under any browser-automation context (Chrome's
 * autoplay policy blocks the audio decode this depends on; confirmed
 * empirically, matches this project's known pre-existing limitation). This
 * reconnects as the same participantId via a second, real WS connection —
 * the exact `session-join` reconnect path already used for page refreshes —
 * rather than adding any test-only hook to production code.
 */
export async function sendAsParticipant(session: StoredSession, message: object): Promise<void> {
  const ws = new WebSocket('ws://localhost:8080');
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  ws.send(JSON.stringify({ type: 'session-join', code: session.code, displayName: session.displayName, participantId: session.participantId }));
  await new Promise((resolve) => setTimeout(resolve, 200));
  ws.send(JSON.stringify(message));
  await new Promise((resolve) => setTimeout(resolve, 200));
  ws.close();
}
