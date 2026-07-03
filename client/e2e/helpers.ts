import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { WebSocket } from 'ws';

export interface StoredSession {
  code: string;
  displayName: string;
  participantId: string;
}

/**
 * Navigates a fresh page to the app, clicks through the Landing chooser's
 * "Create a session" choice, and submits the create form with the given
 * name — the sequence every spec previously duplicated inline before the
 * chooser/split-form Landing restructure.
 */
export async function createSessionAsHost(page: Page, name: string): Promise<void> {
  await page.goto('http://localhost:4173/');
  await page.getByRole('button', { name: 'Create a session' }).click();
  await page.getByPlaceholder('Musician').fill(name);
  await page.getByRole('button', { name: 'Create session' }).click();
}

/**
 * Opens a new browser context/page, clicks through the Landing chooser's
 * "Join a session" choice, and submits the join form with the given name +
 * code — mirrors the shape of the inline `joinAsMember` helpers previously
 * duplicated across `multi-participant.spec.ts`/`host-controls.spec.ts`.
 */
export async function joinSessionAsMember(
  browser: Browser,
  name: string,
  code: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:4173/');
  await page.getByRole('button', { name: 'Join a session' }).click();
  await page.getByPlaceholder('Musician').fill(name);
  await page.getByLabel('Session code').fill(code);
  await page.getByRole('button', { name: 'Join' }).click();
  return { context, page };
}

/**
 * Reads the {code, displayName, participantId} session-persistence.ts
 * writes to localStorage — polls briefly rather than reading once, since
 * the write happens via a reactive clientStore subscription, not
 * synchronously with whatever UI action (e.g. clicking "Create session")
 * triggered it.
 */
export async function readStoredSession(page: Page): Promise<StoredSession> {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sync-tab-scroll:session')), { timeout: 5_000 })
    .not.toBeNull();
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
