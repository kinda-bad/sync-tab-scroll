import { describe, expect, it } from 'vitest';
import { monoDarkTabColors, monoLightTabColors } from './brand-colors';

// brand.md, Themes › Mono: tab notation is ink and grays only — the accent
// is reserved for the cursor and current-bar highlight (CSS, not alphaTab
// resources), so every resource color alphaTab paints must be untinted.
describe('Mono tab-notation colors', () => {
  for (const [name, colors] of Object.entries({ monoDarkTabColors, monoLightTabColors })) {
    it(`${name}: every color is a pure gray (r = g = b)`, () => {
      for (const c of Object.values(colors)) {
        expect([c.g, c.b]).toEqual([c.r, c.r]);
      }
    });
  }

  it('dark notation is white ink, light notation is black ink', () => {
    expect(monoDarkTabColors.foreground).toMatchObject({ r: 255, a: 255 });
    expect(monoLightTabColors.foreground).toMatchObject({ r: 0, a: 255 });
  });
});
