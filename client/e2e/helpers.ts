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
 * Asserts the page needs no horizontal scrolling — the small-screen
 * invariant (plan-worktree-ui-improvements): vertical scroll is fine,
 * horizontal never is. Checked on both the root element and body since
 * either can be the one that overflows depending on which descendant is
 * too wide.
 */
export async function expectNoHorizontalOverflow(page: Page, what: string): Promise<void> {
  const metrics = await page.evaluate(() => {
    // Any element whose computed overflow-x can actually scroll (auto/
    // scroll) and whose content is wider than its box forces the user to
    // scroll sideways — e.g. a modal body whose `overflow-y: auto` makes
    // overflow-x compute to auto as well. overflow:hidden containers
    // (Bar, lyrics ticker) clip rather than scroll, so they don't count.
    const scrollers: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      if (el.scrollWidth - el.clientWidth <= 0) continue;
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') {
        scrollers.push(`${el.tagName.toLowerCase()}.${String(el.className)} (+${el.scrollWidth - el.clientWidth}px)`);
      }
    }
    return {
      layoutWidth: document.documentElement.clientWidth,
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      scrollers,
    };
  });
  // Without <meta name="viewport">, mobile browsers lay the page out at a
  // ~980px virtual width and scale it down — nothing "overflows" that, the
  // page is just illegibly small. So fitting a phone means two things at
  // once: the layout viewport is the real device width, AND nothing
  // overflows it. The viewport size comes from the test's device emulation
  // (isMobile); 500 is a loose ceiling over real phone widths (~320-430)
  // that any un-metaʼd 980px fallback blows straight past.
  expect(metrics.layoutWidth, `${what}: layout viewport width should be device width, not the no-viewport-meta ~980px fallback`).toBeLessThanOrEqual(500);
  expect(metrics.doc, `${what}: <html> horizontal overflow (px)`).toBeLessThanOrEqual(0);
  expect(metrics.body, `${what}: <body> horizontal overflow (px)`).toBeLessThanOrEqual(0);
  expect(metrics.scrollers, `${what}: elements requiring horizontal scroll`).toEqual([]);
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
