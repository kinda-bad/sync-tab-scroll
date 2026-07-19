import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import LyricsOverlayHarness from './test-harness/LyricsOverlayHarness.svelte';

function drive(page: Page, tick: number) {
  return page.evaluate((t) => (window as unknown as { __drive: (tick: number) => void }).__drive(t), tick);
}

function setFontSize(page: Page, size: string) {
  return page.evaluate((s) => (window as unknown as { __setFontSize: (size: string) => void }).__setFontSize(s), size);
}

function setPosition(page: Page, position: string) {
  return page.evaluate((p) => (window as unknown as { __setPosition: (position: string) => void }).__setPosition(p), position);
}

function setMeasureMarkersVisible(page: Page, visible: boolean) {
  return page.evaluate(
    (v) => (window as unknown as { __setMeasureMarkersVisible: (visible: boolean) => void }).__setMeasureMarkersVisible(v),
    visible,
  );
}

test('font size preference updates the overlay live via a CSS custom property', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  const overlay = page.locator('.lyrics-overlay');
  const fontSizeOf = () => overlay.evaluate((el) => getComputedStyle(el).fontSize);

  const mediumSize = await fontSizeOf();

  await setFontSize(page, 'huge');
  const hugeSize = await fontSizeOf();
  expect(parseFloat(hugeSize)).toBeGreaterThan(parseFloat(mediumSize));

  await setFontSize(page, 'small');
  const smallSize = await fontSizeOf();
  expect(parseFloat(smallSize)).toBeLessThan(parseFloat(mediumSize));
});

test('measure markers are hidden by default and appear at the correct tick-sorted DOM position when enabled', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  await expect(page.locator('.lyrics-measure-marker:visible')).toHaveCount(0);

  await setMeasureMarkersVisible(page, true);

  const markers = page.locator('.lyrics-measure-marker');
  await expect(markers).toHaveCount(2);
  await expect(markers.nth(0).locator('.lyrics-measure-marker-number')).toHaveText('1');
  await expect(markers.nth(1).locator('.lyrics-measure-marker-number')).toHaveText('2');

  // Marker 1 (tick 0) precedes "When" (tick 0); marker 2 (tick 300) sits
  // between "were" (tick 200) and "here" (tick 400) — verified via DOM
  // sequence order of .lyric-syllable/.lyrics-measure-marker children
  // (text content distinguishes each syllable/marker uniquely here).
  const trackChildren = await page.locator('.lyrics-track > *').evaluateAll((els) =>
    els.map((el) => ({ isMarker: el.className.includes('lyrics-measure-marker'), text: el.textContent?.trim() })),
  );
  const indexOfText = (text: string) => trackChildren.findIndex((c) => c.text === text);
  const markerIndexes = trackChildren.reduce<number[]>((acc, c, i) => (c.isMarker ? [...acc, i] : acc), []);

  expect(markerIndexes).toHaveLength(2);
  // Marker 1 comes before "When" (tick 0).
  expect(markerIndexes[0]).toBeLessThan(indexOfText('When'));
  // Marker 2 comes after "were" (tick 200) and before "here" (tick 400).
  expect(markerIndexes[1]).toBeGreaterThan(indexOfText('were'));
  expect(markerIndexes[1]).toBeLessThan(indexOfText('here'));

  await setMeasureMarkersVisible(page, false);
  await expect(page.locator('.lyrics-measure-marker:visible')).toHaveCount(0);
});

test('measure markers do not affect syllable highlighting/centering', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  await setMeasureMarkersVisible(page, true);

  await drive(page, 150);
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveText('you ');

  await page.waitForTimeout(300);
  const activeBox = await page.locator('.lyric-syllable.at-highlight').boundingBox();
  const overlayBox = await page.locator('.lyrics-overlay').boundingBox();
  expect(activeBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();
  const activeCenter = activeBox!.x + activeBox!.width / 2;
  const overlayCenter = overlayBox!.x + overlayBox!.width / 2;
  expect(Math.abs(activeCenter - overlayCenter)).toBeLessThanOrEqual(2);
});

// T005 (feature lyrics-ticker-position-preference): the overlay carries the
// `.lyrics-overlay--top` class for the top position and drops it for
// bottom (the class-less default) — the fixed-position CSS keys off it.
test('position preference toggles the overlay top class for both values', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  const overlay = page.locator('.lyrics-overlay');
  await expect(overlay).not.toHaveClass(/lyrics-overlay--top/);

  await setPosition(page, 'top');
  await expect(overlay).toHaveClass(/lyrics-overlay--top/);

  await setPosition(page, 'bottom');
  await expect(overlay).not.toHaveClass(/lyrics-overlay--top/);
});

// T006 (tasks-icons-a11y-ticker-a10d.md, feedback F007): the four ticker
// font-size steps scale up substantially on desktop viewports (>=1024px
// media query, roughly 1.5-2x), while small-screen values stay unchanged.
test('ticker font size scales up at the desktop breakpoint and steps stay distinct', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);
  const overlay = page.locator('.lyrics-overlay');
  const fontSizeOf = () => overlay.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  await page.setViewportSize({ width: 800, height: 600 });
  const phoneMedium = await fontSizeOf();

  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopMedium = await fontSizeOf();
  expect(desktopMedium).toBeGreaterThanOrEqual(phoneMedium * 1.4);

  // Steps remain clearly distinct at the desktop sizes too.
  await setFontSize(page, 'small');
  const desktopSmall = await fontSizeOf();
  await setFontSize(page, 'large');
  const desktopLarge = await fontSizeOf();
  await setFontSize(page, 'huge');
  const desktopHuge = await fontSizeOf();
  expect(desktopSmall).toBeLessThan(desktopMedium);
  expect(desktopLarge).toBeGreaterThan(desktopMedium);
  expect(desktopHuge).toBeGreaterThan(desktopLarge);
});
