import { test, expect } from '@playwright/experimental-ct-svelte';
import * as at from '@coderline/alphatab';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

// A long generated score (64 bars, one sung syllable per beat) so the page
// has real scroll room and the end of the song sits at the bottom edge.
const LONG_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  const bars = Array.from({ length: 64 }, () => '0.4.4 0.4.4 0.4.4 0.4.4').join(' | ');
  const words = Array.from({ length: 64 * 4 }, (_, i) => `w${i + 1}`).join(' ');
  importer.initFromString(`\\tempo 240\n.\n\\track "Voice"\n\\lyrics "${words}"\n\\ts 4 4 ${bars}`, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();
const LRC_CONTENT = `[00:00.00]Hello there\n[00:02.00]General Kenobi`;

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: LONG_GP, contentType: 'application/octet-stream' }));
  await page.route('**/fixture-lyrics.lrc', (route) => route.fulfill({ body: LRC_CONTENT, contentType: 'text/plain' }));
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
  lyricLineBreaks: [64 * 4],
  recordingPath: null,
  syncPoints: null,
};

function instrumentSession(view: 'lobby' | 'playback'): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
    ],
    hostId: 'p1',
    playbackState: { status: view === 'playback' ? 'running' : 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
    startMarkerBar: null,
  };
}

async function setStore(page: import('@playwright/test').Page, view: 'lobby' | 'playback', session: Session) {
  await page.evaluate(
    ({ session, song, view }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({
        ...(s as object),
        view,
        session,
        selfParticipantId: 'p1',
        catalog: [song],
        wsClient,
      }));
    },
    { session, song, view },
  );
}

/**
 * Bottom lyrics ticker: the tab view's bottom padding follows the strip's
 * real height (lyrics-overlay.ts applyReserve), so at the end of a song the
 * last rows can scroll clear of the strip even at the large font steps
 * (up to 7rem at >=1024px), where a fixed padding left them behind it.
 */
for (const size of ['medium', 'huge'] as const) {
  test(`scrolled to the end, the tab's last row clears the bottom ticker (${size}, desktop)`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate((s) => {
      localStorage.setItem('sync-tab-scroll:lyrics-ticker-position', 'bottom');
      localStorage.setItem('sync-tab-scroll:lyrics-ticker-font-size', s);
    }, size);
    await mount(AppHarness);
    await setStore(page, 'playback', instrumentSession('playback'));
    await page.waitForSelector('.lyrics-overlay');
    await page.waitForSelector('.at-surface svg', { timeout: 20_000 });
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const tab = document.querySelector('.tab-container')!.getBoundingClientRect();
      const strip = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
      return { scrollY: window.scrollY, tabBottom: tab.bottom, stripTop: strip.top, stripHeight: strip.height };
    });
    expect(m.scrollY, 'the page must actually scroll for this to test anything').toBeGreaterThan(0);
    expect(m.tabBottom, JSON.stringify(m)).toBeLessThanOrEqual(m.stripTop + 1);
  });
}
