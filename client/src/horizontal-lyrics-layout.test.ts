import { describe, expect, it } from 'vitest';
import { layoutBandItems, xAtPosition } from './horizontal-lyrics-layout';

describe('layoutBandItems (horizontal lyrics band)', () => {
  it('places each item at its position times the scale when nothing overlaps', () => {
    const xs = layoutBandItems(
      [
        { at: 0, width: 10 },
        { at: 100, width: 10 },
        { at: 300, width: 10 },
      ],
      0.5,
      4,
    );
    expect(xs).toEqual([0, 50, 150]);
  });

  it('pushes an item right of the previous one when their text would overlap', () => {
    const xs = layoutBandItems(
      [
        { at: 0, width: 80 },
        { at: 100, width: 30 },
        { at: 400, width: 10 },
      ],
      0.5,
      4,
    );
    // 50 would overlap the first item (0..80), so it moves to 80 + 4.
    expect(xs).toEqual([0, 84, 200]);
  });

  it('keeps pushing through a run of crowded items', () => {
    const xs = layoutBandItems(
      [
        { at: 0, width: 40 },
        { at: 10, width: 40 },
        { at: 20, width: 40 },
      ],
      1,
      0,
    );
    expect(xs).toEqual([0, 40, 80]);
  });
});

describe('xAtPosition (horizontal lyrics band)', () => {
  const anchors = [
    { at: 100, x: 50 },
    { at: 200, x: 300 },
    { at: 400, x: 400 },
  ];

  it('returns an anchor exactly at its own position, so each item reaches the playhead on time', () => {
    expect(xAtPosition(anchors, 100, 0.5)).toBe(50);
    expect(xAtPosition(anchors, 200, 0.5)).toBe(300);
    expect(xAtPosition(anchors, 400, 0.5)).toBe(400);
  });

  it('interpolates linearly between anchors', () => {
    expect(xAtPosition(anchors, 150, 0.5)).toBe(175);
    expect(xAtPosition(anchors, 300, 0.5)).toBe(350);
  });

  it('extends at the base scale before the first and after the last anchor', () => {
    expect(xAtPosition(anchors, 0, 0.5)).toBe(0);
    expect(xAtPosition(anchors, 600, 0.5)).toBe(500);
  });

  it('falls back to the base scale with no anchors', () => {
    expect(xAtPosition([], 300, 0.5)).toBe(150);
  });

  it('is monotonic when two anchors share a position', () => {
    const shared = [
      { at: 100, x: 50 },
      { at: 100, x: 90 },
      { at: 200, x: 140 },
    ];
    expect(xAtPosition(shared, 100, 0.5)).toBeLessThanOrEqual(xAtPosition(shared, 101, 0.5));
    expect(xAtPosition(shared, 150, 0.5)).toBe(115);
  });
});
