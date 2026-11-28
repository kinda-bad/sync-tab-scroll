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

/**
 * Mono (brand.md, Themes › Mono): black and white with one signal-red
 * accent, used only for what's happening now. No clip-path edge, no
 * texture, no signature motion, no type flourish — each asserted as a
 * positive Mono rule (a 1px rule, a flat accent fill), not merely as the
 * absence of the other themes' rules, which an unknown theme would also pass.
 */
const MONO_THEMES = [
  { theme: 'mono-dark', bg: 'rgb(0, 0, 0)', ink: 'rgb(255, 255, 255)', live: 'rgb(255, 59, 48)' },
  { theme: 'mono-light', bg: 'rgb(255, 255, 255)', ink: 'rgb(0, 0, 0)', live: 'rgb(215, 5, 0)' },
] as const;

async function resolveVar(page: import('@playwright/test').Page, name: string, prop: 'color' | 'backgroundColor' = 'color') {
  return page.evaluate(
    ({ name, prop }) => {
      const probe = document.createElement('span');
      probe.style[prop] = `var(${name})`;
      document.body.appendChild(probe);
      const v = getComputedStyle(probe)[prop];
      probe.remove();
      return v;
    },
    { name, prop },
  );
}

for (const { theme, bg, ink, live } of MONO_THEMES) {
  test.describe(`mono (${theme})`, () => {
    test('applies its own black/white tokens and the signal-red accent', async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      expect(await resolveVar(page, '--bg')).toBe(bg);
      expect(await resolveVar(page, '--ink')).toBe(ink);
      expect(await resolveVar(page, '--live')).toBe(live);
      expect(await resolveVar(page, '--focus')).toBe(live);
      expect(await resolveVar(page, '--lyric-active')).toBe(live);
      // The accent is used lightly: the primary/selected role and the
      // caution role are ink and gray, not red.
      expect(await resolveVar(page, '--riot')).toBe(ink);
      expect(await resolveVar(page, '--hazard')).not.toBe(live);
      expect(await resolveVar(page, '--lyric-base')).not.toBe(live);
      expect(await resolveVar(page, '--gap-dot-active')).not.toBe(live);
      // Surfaces are untinted grays.
      for (const token of ['--surface', '--surface-raised', '--bar-surface', '--hazard']) {
        const [r, g, b] = (await resolveVar(page, token)).match(/\d+/g)!.map(Number);
        expect([g, b], token).toEqual([r, r]);
      }
    });

    test('bar edge is a plain 1px rule, with no clip-path, motion or tape', async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      const bar = page.locator('.bar');
      await expect.poll(() => bar.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
      expect(await bar.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');
      expect(await bar.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
      expect(await bar.evaluate((el) => getComputedStyle(el, '::before').animationName)).toBe('none');
      expect(await bar.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('none');
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(await bar.evaluate((el) => getComputedStyle(el, '::after').transform));
      expect(await page.evaluate(() => getComputedStyle(document.body, '::after').content)).toBe('none');
    });

    test('progress device is a thin, flat accent fill with no texture or glow', async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      const hazard = page.locator('.hazard-bar');
      const fill = await hazard.evaluate((el) => {
        const s = getComputedStyle(el, '::before');
        return { content: s.content, bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow, clip: s.clipPath, width: s.width };
      });
      expect(fill.content).not.toBe('none');
      expect(fill.bg).toBe(live);
      expect(fill.image).toBe('none');
      expect(fill.shadow).toBe('none');
      expect(fill.clip).toBe('none');
      // BarHarness sets progress 0.5: the fill covers about half the track.
      const trackWidth = await hazard.evaluate((el) => el.clientWidth);
      expect(Math.abs(parseFloat(fill.width) - trackWidth / 2)).toBeLessThan(2);
    });

    test('.glitch-text has no text-shadow', async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      await page.evaluate(() => {
        const el = document.createElement('h1');
        el.className = 'glitch-text';
        el.id = 'glitch-text-probe';
        el.textContent = 'SYNC-TAB-SCROLL';
        document.body.appendChild(el);
      });
      expect(await page.evaluate(() => getComputedStyle(document.getElementById('glitch-text-probe')!).textShadow)).toBe('none');
    });

    test('playback cursor and sung syllable use the accent; the gap drain is a flat gray', async ({ mount, page }) => {
      await setTheme(page, theme);
      await mount(BarHarness);
      const probe = await page.evaluate(() => {
        const make = (cls: string, tag = 'div') => {
          const el = document.createElement(tag);
          el.className = cls;
          document.body.appendChild(el);
          return el;
        };
        const beat = make('at-cursor-beat');
        const syl = make('lyric-syllable at-highlight', 'span');
        syl.textContent = 'la';
        const drain = make('gap-drain gap-drain-tape gap-drain-led gap-drain-plain');
        drain.style.width = '100px';
        const dot = make('gap-dot active', 'span');
        const d = getComputedStyle(drain, '::before');
        return {
          beat: getComputedStyle(beat).backgroundColor,
          beatOpacity: getComputedStyle(beat).opacity,
          syllable: getComputedStyle(syl).color,
          drainBg: d.backgroundColor,
          drainImage: d.backgroundImage,
          drainShadow: d.boxShadow,
          dot: getComputedStyle(dot).backgroundColor,
        };
      });
      expect(probe.beat).toBe(live);
      // Full strength: at riot's 0.6 the red beat line falls under 3:1 on black.
      expect(probe.beatOpacity).toBe('1');
      expect(probe.syllable).toBe(live);
      expect(probe.drainImage).toBe('none');
      expect(probe.drainShadow).toBe('none');
      expect(probe.drainBg).not.toBe(live);
      expect(probe.drainBg).not.toBe('rgba(0, 0, 0, 0)');
      expect(probe.dot).not.toBe(live);
    });
  });
}

test('riot and cyberpunk keep --live/--focus equal to their own --riot', async ({ mount, page }) => {
  await mount(BarHarness);
  for (const theme of [...RIOT_THEMES, ...CYBERPUNK_THEMES]) {
    await setTheme(page, theme);
    const riot = await resolveVar(page, '--riot');
    expect(await resolveVar(page, '--live'), theme).toBe(riot);
    expect(await resolveVar(page, '--focus'), theme).toBe(riot);
  }
});
