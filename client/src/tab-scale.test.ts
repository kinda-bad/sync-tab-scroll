import { describe, expect, it } from 'vitest';
import { tabScaleForViewportWidth } from './tab-scale';

describe('tabScaleForViewportWidth', () => {
  it('scales notation up on phone-width viewports so it is legible without pinch-zoom', () => {
    expect(tabScaleForViewportWidth(320)).toBe(1.3);
    expect(tabScaleForViewportWidth(390)).toBe(1.3);
    expect(tabScaleForViewportWidth(430)).toBe(1.3);
  });

  it('keeps alphaTab default scale at tablet width and up', () => {
    expect(tabScaleForViewportWidth(768)).toBe(1);
    expect(tabScaleForViewportWidth(1440)).toBe(1);
  });

  it('treats 500px as the phone/not-phone boundary (matches the e2e layout-viewport ceiling)', () => {
    expect(tabScaleForViewportWidth(499)).toBe(1.3);
    expect(tabScaleForViewportWidth(500)).toBe(1);
  });
});
