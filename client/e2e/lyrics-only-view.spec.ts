import { test, expect } from '@playwright/test';
import { createSessionAsHost } from './helpers';

/**
 * Regression coverage for feedback-lyrics-only-view-d7d8: the full-lyrics
 * view (ui.md "Lyrics part selected") rendered nothing in the production
 * build because alphaTab's ESM synth worker asset was never emitted into
 * dist/assets/, so playback readiness (and playerPositionChanged) never
 * resolved — this asserts real rendered text, not just the absence of a
 * tab canvas (single-participant.spec.ts's older lyrics-part test only
 * checked the latter). No sendAsParticipant raw-WS bypass here — the
 * worker-asset fix (vite.config.ts's alphaTabWorkerAssets()) lets readiness
 * resolve for real under Playwright automation now (confirmed empirically:
 * the old "Chrome autoplay policy blocks it" belief this project held was
 * never actually correct — the real blocker was always this same asset
 * bug, in front of automated and real browsers alike).
 */
test('lyrics part: real playback renders the synced lyrics text', async ({ page }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).last().click(); // Lyrics is the last row in Lobby.svelte's part list

  // No sendAsParticipant workaround — waiting on the real readiness
  // auto-trigger (soundFontLoaded) same as an actual user would.
  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  // synthetic-song's lyrics.lrc: `[00:00.00]test` — the first line's own
  // timestamp is 0, so it's expected to appear immediately once real
  // playback ticking begins.
  await expect(page.locator('.full-lyrics-view')).toHaveText('test', { timeout: 15_000 });
});
