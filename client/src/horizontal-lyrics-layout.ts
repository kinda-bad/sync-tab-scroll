/**
 * Pure layout math for the horizontal view's lyrics band (ui.md Playback
 * View, "Horizontal view"; feature horizontal-scroll-view). Items (syllables
 * by playback tick, or `.lrc` lines by ms) sit on one line at
 * `position × scale`, pushed right only as far as needed so no text
 * overlaps the item before it. The band then moves by a piecewise-linear
 * map through every item's (position, x) anchor, so each item still reaches
 * the playhead exactly at its own position, and the band never jumps.
 */
export interface BandAnchor {
  /** Position on the playback timeline (a tick or ms, the caller's unit). */
  at: number;
  /** Left edge of the item's text in band pixels. */
  x: number;
}

/** Left edge (band px) of each item, in order. `items` must be sorted by `at`. */
export function layoutBandItems(items: { at: number; width: number }[], pxPerUnit: number, gapPx: number): number[] {
  const xs: number[] = [];
  let minX = -Infinity;
  for (const item of items) {
    const x = Math.max(item.at * pxPerUnit, minX);
    xs.push(x);
    minX = x + item.width + gapPx;
  }
  return xs;
}

/** Band x for a playback position, through the anchors (sorted by `at`, x non-decreasing). */
export function xAtPosition(anchors: BandAnchor[], at: number, pxPerUnit: number): number {
  if (anchors.length === 0) return at * pxPerUnit;
  const first = anchors[0];
  if (at <= first.at) return first.x - (first.at - at) * pxPerUnit;
  const last = anchors[anchors.length - 1];
  if (at >= last.at) return last.x + (at - last.at) * pxPerUnit;
  // Last anchor at or before `at` (binary search), then the next one after it.
  let lo = 0;
  let hi = anchors.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (anchors[mid].at <= at) lo = mid;
    else hi = mid - 1;
  }
  const a = anchors[lo];
  const b = anchors[lo + 1];
  if (b.at === a.at) return b.x;
  return a.x + ((b.x - a.x) * (at - a.at)) / (b.at - a.at);
}
