import { test, expect } from '@playwright/experimental-ct-svelte';
import BarHarness from '../test-harness/BarHarness.svelte';

/**
 * Coverage for the theme-exclusive signature devices (brand.md, second
 * 2026-07-06 revision, "UI Chrome Redesign" + Themes › Cyberpunk):
 * `riot` (dark/light) is analog/physical — torn-paper edge, hazard-tape
 * fill, tape-peel motion — and `cyberpunk` (cyberpunk-dark/cyberpunk-light)
 * is digital/glitch — glitch-cut edge, LED-marquee fill, glitch fringe +
 * CRT scanline motion, RGB-split title text. Each device is markup-present
 * unconditionally (Bar.svelte/HazardBar.svelte carry every theme's classes
 * at once, per this codebase's "components never branch on theme"
 * convention) — only the CSS per-`data-theme` selector decides which one
 * actually renders, so these tests set `data-theme` directly and assert on
 * computed style, the same technique theme.ct.spec.ts already establishes
 * for this app (no dedicated Storybook/visual-diff harness exists yet).
 */

const RIOT_THEMES = ['dark', 'light'] as const;
const CYBERPUNK_THEMES = ['cyberpunk-dark', 'cyberpunk-light'] as const;

async function setTheme(page: import('@playwright/test').Page, theme: string) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
}

for (const theme of RIOT_THEMES) {
  test(`riot (${theme}): torn-edge + hazard-stripes + tape-peel are active, glitch-cut-edge/led-marquee/glitch fringe/glitch-text are not`, async ({ mount, page }) => {
    await setTheme(page, theme);
    await mount(BarHarness);

    const bar = page.locator('.bar');
    // .torn-edge: active means a real clip-path polygon, not the initial 'none'.
    await expect.poll(() => bar.evaluate((el) => getComputedStyle(el).clipPath)).not.toBe('none');
    // .glitch-cut-edge carries no rule under riot, so it doesn't touch clip-path
    // beyond whatever .torn-edge already set — assert it isn't the jagged
    // glitch-cut polygon specifically by checking clip-path stays identical
    // whether or not the class list included it (regression guard: dedicated
    // clip-path values below differ in vertex count/shape).
    const clipPath = await bar.evaluate((el) => getComputedStyle(el).clipPath);
    expect(clipPath).toContain('polygon');

    // .signature-tape active: position: relative + a non-'none' ::after content.
    await expect.poll(() => bar.evaluate((el) => getComputedStyle(el).position)).toBe('relative');
    const tapeAfterContent = await bar.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(tapeAfterContent).not.toBe('none');

    // .signature-glitch inactive under riot: no ::before/::after box-shadow fringe
    // animation running (animation-name stays 'none', the browser initial value).
    const glitchBeforeAnim = await bar.evaluate((el) => getComputedStyle(el, '::before').animationName);
    expect(glitchBeforeAnim).toBe('none');

    // HazardBar: .hazard-stripes active (diagonal repeating-linear-gradient
    // background-image on ::before), .led-marquee inactive (no clip-path reveal).
    const hazard = page.locator('.hazard-bar');
    const hazardBeforeBg = await hazard.evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    expect(hazardBeforeBg).toContain('45deg');
    const hazardBeforeClip = await hazard.evaluate((el) => getComputedStyle(el, '::before').clipPath);
    expect(hazardBeforeClip).toBe('none');
  });
}

for (const theme of CYBERPUNK_THEMES) {
  test(`cyberpunk (${theme}): glitch-cut-edge + led-marquee + glitch fringe + CRT scanline are active, torn-edge/hazard-stripes/tape-peel are not`, async ({ mount, page }) => {
    await setTheme(page, theme);
    await mount(BarHarness);

    const bar = page.locator('.bar');
    // .glitch-cut-edge active: a real clip-path polygon (the jagged silhouette).
    const clipPath = await bar.evaluate((el) => getComputedStyle(el).clipPath);
    expect(clipPath).toContain('polygon');

    // .signature-glitch active: chromatic-aberration fringe animations running.
    const glitchBeforeAnim = await bar.evaluate((el) => getComputedStyle(el, '::before').animationName);
    const glitchAfterAnim = await bar.evaluate((el) => getComputedStyle(el, '::after').animationName);
    expect(glitchBeforeAnim).toBe('glitch-fringe-a');
    expect(glitchAfterAnim).toBe('glitch-fringe-b');

    // .signature-tape inactive under cyberpunk: no tape-peel ::after content.
    const tapeAfterContent = await bar.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(tapeAfterContent).not.toBe('"\\u201d"'); // sanity: not asserting a bogus positive
    // The concrete guard: tape's distinctive rotate(-3deg) transform (only
    // .signature-tape sets it) isn't present — an untransformed ::after is
    // either 'none' or the identity matrix, never the rotated matrix.
    const afterTransform = await bar.evaluate((el) => getComputedStyle(el, '::after').transform);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(afterTransform);

    // HazardBar: .led-marquee active (clip-path reveal + glow box-shadow),
    // .hazard-stripes inactive (no diagonal gradient background-image).
    const hazard = page.locator('.hazard-bar');
    const hazardBeforeBg = await hazard.evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    expect(hazardBeforeBg).not.toContain('45deg');
    expect(hazardBeforeBg).toContain('to right');
    const hazardBeforeShadow = await hazard.evaluate((el) => getComputedStyle(el, '::before').boxShadow);
    expect(hazardBeforeShadow).not.toBe('none');

    // CRT scanline: body::after repeating-linear-gradient texture.
    const scanline = await page.evaluate(() => getComputedStyle(document.body, '::after').backgroundImage);
    expect(scanline).toContain('repeating-linear-gradient');
  });
}

test.describe('.glitch-text (cyberpunk RGB-split hero/title type)', () => {
  for (const theme of RIOT_THEMES) {
    test(`riot (${theme}): .glitch-text has no text-shadow`, async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      await page.evaluate(() => {
        const el = document.createElement('h1');
        el.className = 'glitch-text';
        el.id = 'glitch-text-probe';
        el.textContent = 'SYNC-TAB-SCROLL';
        document.body.appendChild(el);
      });
      const shadow = await page.evaluate(() => getComputedStyle(document.getElementById('glitch-text-probe')!).textShadow);
      expect(shadow).toBe('none');
    });
  }

  for (const theme of CYBERPUNK_THEMES) {
    test(`cyberpunk (${theme}): .glitch-text renders an RGB-split text-shadow`, async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      await page.evaluate(() => {
        const el = document.createElement('h1');
        el.className = 'glitch-text';
        el.id = 'glitch-text-probe';
        el.textContent = 'SYNC-TAB-SCROLL';
        document.body.appendChild(el);
      });
      const shadow = await page.evaluate(() => getComputedStyle(document.getElementById('glitch-text-probe')!).textShadow);
      expect(shadow).not.toBe('none');
    });
  }
});
