import type { AlphaTabApi } from '@coderline/alphatab';
import type { Syllable } from './lyrics-beat-walk';
import type { MeasureBoundary } from './lyrics-gap-timing';
import { loadStoredLyricsTickerFontSize, type LyricsTickerFontSize } from './lyrics-ticker-font-size-preference';
import { loadStoredMeasureMarkers } from './lyrics-measure-markers-preference';

export interface LyricsOverlay {
  setVisible(visible: boolean): void;
  setFontSize(size: LyricsTickerFontSize): void;
  setMeasureMarkersVisible(visible: boolean): void;
  destroy(): void;
}

export interface LyricsOverlayOptions {
  /** Measure-boundary tick data (lyrics-gap-timing.ts's computeMeasureBoundaries), for the "Measure markers" preference (T003/T004). Omitted/empty means no markers ever render. */
  measures?: MeasureBoundary[];
}

const FONT_SIZE_REM: Record<LyricsTickerFontSize, string> = {
  small: '0.85rem',
  medium: '1.125rem',
  large: '1.5rem',
  huge: '2rem',
};

/**
 * The in-tab lyrics overlay (ui.md): highlights the syllable being played
 * right now, using brand.md's `.at-highlight` active/base color roles.
 * Driven by `api.playerPositionChanged` (tick position) compared against
 * the flat syllable stream from lyrics-beat-walk.ts, not alphaTab's own
 * per-beat SVG groups — toggle-able independent of which track is
 * currently rendered, since the lyrics-bearing track need not be the one
 * on screen (infrastructure.md).
 */
export function createLyricsOverlay(
  api: AlphaTabApi,
  lines: Syllable[][],
  container: HTMLElement,
  options: LyricsOverlayOptions = {},
): LyricsOverlay {
  const flat = lines.flat();
  const overlay = document.createElement('div');
  overlay.className = 'lyrics-overlay';
  overlay.style.setProperty('--lyrics-ticker-font-size', FONT_SIZE_REM[loadStoredLyricsTickerFontSize()]);
  container.appendChild(overlay);

  const track = document.createElement('div');
  track.className = 'lyrics-track';
  overlay.appendChild(track);

  // Pre-singing placeholder (plan-lyrics-pre-singing-2026-07-04.md): shown
  // centered and highlighted from the very first paint, before any real
  // syllable has activated — replaces the old left-aligned/uncentered
  // natural position that read as a jump once the first syllable snapped
  // to center. One-way: once a real syllable activates, this is hidden
  // permanently (T006), never shown again even across a mid-song pause.
  const placeholder = document.createElement('span');
  placeholder.className = 'lyric-syllable lyrics-placeholder';
  placeholder.textContent = '… ';
  track.appendChild(placeholder);

  const spans: HTMLSpanElement[] = flat.map((syllable) => {
    const span = document.createElement('span');
    span.className = 'lyric-syllable';
    span.textContent = syllable.text + ' ';
    track.appendChild(span);
    return span;
  });

  // Measure markers (T003, ui.md "Measure markers" preference): inserted
  // into `track`'s child sequence at the correct tick-sorted position
  // relative to the syllable spans — mirroring playback-engine.ts's
  // gap-dot/gap-drain insertion pattern for the full lyric sheet, applied
  // here to the ticker. Deliberately NOT added to `flat`/`spans`: those
  // arrays stay syllable-only so activeIndex/updateActiveSyllable/
  // centerActiveSyllable's indexing is entirely unaffected by markers
  // existing or not.
  const markerEls: HTMLElement[] = (options.measures ?? []).map((measure) => {
    const marker = document.createElement('span');
    marker.className = 'lyrics-measure-marker';
    marker.style.display = 'none';

    const line = document.createElement('span');
    line.className = 'lyrics-measure-marker-line';
    marker.appendChild(line);

    const number = document.createElement('span');
    number.className = 'lyrics-measure-marker-number';
    number.textContent = String(measure.number);
    marker.appendChild(number);

    // First syllable at or after this measure's start tick — insert the
    // marker directly before it, so a measure starting exactly on a
    // syllable's own tick (e.g. measure 1 at tick 0, same as the first
    // syllable) still reads as "ahead of" that syllable, not after it. No
    // match means the marker belongs after every syllable (end of the
    // track).
    const beforeSpan = spans[flat.findIndex((s) => s.tickPosition >= measure.tick)];
    track.insertBefore(marker, beforeSpan ?? null);

    return marker;
  });

  let measureMarkersVisible = loadStoredMeasureMarkers();
  markerEls.forEach((el) => {
    el.style.display = measureMarkersVisible ? '' : 'none';
  });

  let activeIndex = -1;

  // Rect-based (not offsetLeft/clientWidth-based): those turned out to
  // disagree with real screen position by exactly `.lyrics-overlay`'s
  // padding-left whenever the always-present (sometimes display:none)
  // placeholder is track's first child, even while hidden — root cause
  // not fully pinned to a specific spec behavior, but rect-based math is
  // correct regardless of the mechanism. Backs out the span's *current*
  // untransformed position using the *live* computed transform (not a
  // JS-tracked "last commanded target") so this is correct even if called
  // again before a previous transition has visually settled — the
  // computed value mid-transition is the actual current interpolated
  // state, unlike a remembered target.
  function centerActiveSyllable(): void {
    const activeSpan = activeIndex < 0 ? placeholder : spans[activeIndex];
    const currentTranslateX = new DOMMatrix(getComputedStyle(track).transform).m41;
    const overlayRect = overlay.getBoundingClientRect();
    const spanRect = activeSpan.getBoundingClientRect();
    const untransformedSpanCenter = spanRect.left - currentTranslateX + spanRect.width / 2;
    const overlayCenter = overlayRect.left + overlayRect.width / 2;
    const translateX = overlayCenter - untransformedSpanCenter;
    track.style.transform = `translateX(${translateX}px)`;
  }

  // T003 (feedback F005): the guard against a `tickPosition === 0` entry
  // flipping active before a genuine playerPositionChanged event arrives is
  // already structurally satisfied here — `activeIndex` starts at -1 and
  // this function is never called synchronously at mount (only from a real
  // `playerPositionChanged` event below), so a first syllable at tick 0
  // only activates once such an event genuinely fires. The synchronous
  // initial paint below highlights the placeholder directly (its own
  // `at-highlight` toggle, independent of `activeIndex`), so it never leaks
  // into real syllable-highlight state.
  // Investigated for the "TIRO" measure 8->9 tie-boundary early-highlight
  // report (plan-99e6-2026-07-18-6d2b.md T001/T002,
  // feedback-lyrics-ticker-tiro-measure8-9310.md F001): this comparison
  // (last `flat[i]` with `tickPosition <= tickPosition`) is structurally
  // correct — no off-by-one, no stale `activeIndex` caching, no lookahead.
  // Confirmed two ways: (1) a synthetic tie-across-barline fixture in
  // `packages/shared/src/lyrics-walk.test.ts` already produces the
  // expected, non-early `tickPosition` for the post-tie syllable; (2)
  // replaying this exact scan against `walkSyllables`' real output for the
  // catalog's actual "TIRO" (Muse, Time Is Running Out) file across the
  // measure 8/9 tick range (26880-31200) returns the correct syllable at
  // every tick — the highlight only ever flips to "You're" at its own
  // tick 29760, never earlier. Neither this function nor `walkSyllables`
  // reproduces the reported early jump against current code/data, so the
  // root cause (if still present) is not a bug in this comparison or in
  // the shared walk's tie/dedup logic — see T003's task note for where
  // the investigation was left off.
  function updateActiveSyllable(tickPosition: number): void {
    let index = -1;
    for (let i = 0; i < flat.length; i++) {
      if (flat[i].tickPosition <= tickPosition) index = i;
      else break;
    }
    if (index === activeIndex) return;
    if (activeIndex < 0 && index >= 0) {
      placeholder.classList.remove('at-highlight');
      placeholder.style.display = 'none';
    }
    if (activeIndex >= 0) spans[activeIndex].classList.remove('at-highlight');
    if (index >= 0) spans[index].classList.add('at-highlight');
    activeIndex = index;
    centerActiveSyllable();
  }

  // Synchronous initial paint (T005): centered and highlighted before any
  // playerPositionChanged event ever fires, not just reactively once one
  // does — this is what makes the very first render correct instead of
  // relying on a later event to fix it up.
  placeholder.classList.add('at-highlight');
  centerActiveSyllable();

  const handler = (e: { currentTick: number }) => updateActiveSyllable(e.currentTick);
  api.playerPositionChanged.on(handler);

  // Recomputed on resize since the strip's/track's pixel geometry changes,
  // but the underlying formula is the same cheap DOM measurement — no
  // alphaTab re-layout involved (see plan-lyrics-ticker-2026-07-03.md).
  const resizeHandler = () => centerActiveSyllable();
  window.addEventListener('resize', resizeHandler);

  return {
    setVisible(visible: boolean) {
      overlay.style.display = visible ? '' : 'none';
    },
    setFontSize(size: LyricsTickerFontSize) {
      overlay.style.setProperty('--lyrics-ticker-font-size', FONT_SIZE_REM[size]);
    },
    setMeasureMarkersVisible(visible: boolean) {
      measureMarkersVisible = visible;
      markerEls.forEach((el) => {
        el.style.display = visible ? '' : 'none';
      });
    },
    destroy() {
      api.playerPositionChanged.off(handler);
      window.removeEventListener('resize', resizeHandler);
      overlay.remove();
    },
  };
}
