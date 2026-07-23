import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

/**
 * T007 (tasks-icons-a11y-ticker-a10d.md, feedback F003): accessibility
 * sweep over every icon-only control and status icon — Bar, settings modal
 * (incl. TrackRow mute buttons), part picker, participant list (crown).
 * The standard (recorded in ui.md): every icon-only control carries a
 * non-empty accessible name (aria-label; tooltips/title complement, never
 * substitute), and decorative icons are aria-hidden with adjacent/SR-only
 * text where the meaning must still be announced.
 *
 * Audit outcome: the codebase already conforms structurally — every
 * icon-only control routes through Button.svelte's `iconOnly` mode, which
 * sets aria-label/title from the same label a text button would show and
 * marks the icon svg aria-hidden; the crown (ListRow) and account-menu
 * icons are aria-hidden with adjacent (SR-only or visible) text. This
 * sweep locks that invariant against regressions.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gpBuffer = fs.readFileSync(path.resolve(__dirname, '../test-fixtures/synthetic-song.gp'));

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/fixture-lyrics.lrc', (route) =>
    route.fulfill({ body: '[00:00.00]Hello there', contentType: 'text/plain' }),
  );
});

const song: CatalogSong = {
  id: 'creep',
  catalogueId: 'default',
  name: 'Creep',
  artist: 'Radiohead',
  gpFilePath: '/fixture.gp',
  parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  lyricsLrc: '/fixture-lyrics.lrc',
  lyricsTrackIndex: 0,
  lyricsLineIndex: 0,
  lyricLineBreaks: [2],
  recordingPath: null,
  syncPoints: null,
};

const session: Session = {
  code: 'ABCD',
  selectedSong: 'creep',
  availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  participants: [
    { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
    { id: 'p2', displayName: 'Bob', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1, userId: null },
  ],
  hostId: 'p1',
  playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
  countInEnabled: false,
  playbackSource: 'synth',
  lobbyCursorTick: null,
  spotlightMode: false,
  pendingHostRequest: null,
  unlockedCatalogueIds: [],
  hostBarsPerRow: null,
  earlyStopTick: null,
};

async function setStore(page: import('@playwright/test').Page) {
  await page.evaluate(
    ({ session, song }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'lobby', session, selfParticipantId: 'p1', catalog: [song], wsClient }));
    },
    { session, song },
  );
}

/** Every button rendering no visible text must expose a non-empty accessible name; every svg must be aria-hidden or sit inside a labelled control. */
async function sweep(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const failures: string[] = [];
    for (const btn of Array.from(document.querySelectorAll('button'))) {
      const visibleText = (btn.textContent ?? '').trim();
      const ariaLabel = (btn.getAttribute('aria-label') ?? '').trim();
      if (!visibleText && !ariaLabel) failures.push(`unnamed icon-only button: ${btn.outerHTML.slice(0, 120)}`);
    }
    for (const svg of Array.from(document.querySelectorAll('svg'))) {
      // alphaTab's own rendered notation surface (.at-surface-svg inside
      // .tab-container) is third-party render output, not an app control —
      // out of scope for this sweep of the app's own icons.
      if (svg.closest('.tab-container')) continue;
      if (svg.getAttribute('aria-hidden') === 'true') continue;
      if (svg.getAttribute('role') === 'img' && svg.getAttribute('aria-label')) continue;
      const host = svg.closest('button, [role="button"], a');
      const hostName = host ? ((host.getAttribute('aria-label') ?? '').trim() || (host.textContent ?? '').trim()) : '';
      if (!hostName) failures.push(`unannounced non-decorative svg: ${(svg.getAttribute('class') ?? '').slice(0, 80)}`);
    }
    return failures;
  });
}

test('sweep: Bar, settings modal (all four tabs), and part picker have no unnamed icon-only controls or unannounced icons', async ({
  mount,
  page,
}) => {
  await mount(AppHarness);
  await setStore(page);

  // Bar (song + part both selected, so no modal auto-opens).
  expect(await sweep(page)).toEqual([]);

  // Part picker (Song & part modal).
  await page.getByRole('button', { name: 'Song & part' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await sweep(page)).toEqual([]);
  await page.getByRole('button', { name: 'Close' }).click();

  // Settings modal, every tab (Participants incl. crown, Session,
  // Preferences, Tracks incl. TrackRow's icon-only mute buttons).
  await page.getByRole('button', { name: 'Settings' }).click();
  for (const tab of ['Participants', 'Session', 'Preferences', 'Tracks']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    expect(await sweep(page), `tab: ${tab}`).toEqual([]);
  }

  // Targeted: the crown is decorative with SR-only "Host" text adjacent.
  await page.getByRole('button', { name: 'Participants' }).click();
  const crown = page.locator('.row svg.lucide-crown');
  await expect(crown).toBeVisible();
  await expect(crown).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.row .sr-only', { hasText: 'Host' })).toHaveCount(1);
});

test('targeted: TrackRow mute button keeps the full Mute wording as its accessible name', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Tracks' }).click();

  const mute = page.getByRole('button', { name: /^Mute Guitar/ });
  await expect(mute).toBeVisible();
  await expect(mute).toHaveText('');
});
