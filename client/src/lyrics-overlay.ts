import type { AlphaTabApi } from '@coderline/alphatab';
import type { Syllable } from './lyrics-beat-walk';
import type { MeasureBoundary } from './lyrics-gap-timing';
import { loadStoredLyricsTickerFontSize, type LyricsTickerFontSize } from './lyrics-ticker-font-size-preference';
import { loadStoredLyricsTickerPosition, type LyricsTickerPosition } from './lyrics-ticker-position-preference';
import { loadStoredMeasureMarkers } from './lyrics-measure-markers-preference';
import {
  loadStoredLyricsTickerAnchor,
  loadStoredLyricsTickerScroll,
  type LyricsTickerAnchor,
  type LyricsTickerScroll,
} from './lyrics-ticker-motion-preference';

export interface LyricsOverlay {
  setVisible(visible: boolean): void;
  setFontSize(size: LyricsTickerFontSize): void;
  setPosition(position: LyricsTickerPosition): void;
  setMeasureMarkersVisible(visible: boolean): void;
  setAnchor(anchor: LyricsTickerAnchor): void;
  setScroll(scroll: LyricsTickerScroll): void;
  destroy(): void;
}

export interface LyricsOverlayOptions {
  /** Measure-boundary tick data (lyrics-gap-timing.ts's playbackMeasureBoundaries), for the "Measure markers" preference (T003/T004). Omitted/empty means no markers ever render. */
  measures?: MeasureBoundary[];
  /** Initial anchor / scroll style (lyrics-ticker-scroll-modes); omitted means the stored personal preference. */
  anchor?: LyricsTickerAnchor;
  scroll?: LyricsTickerScroll;
}

/**
 * Where a left-anchored syllable sits, as a fraction of the strip's width:
 * near the left edge, with room for the word just sung.
 */
const LEFT_ANCHOR = 0.15;
/** Edge scrolling pages once the highlight comes within this fraction of the strip's width of an edge. */
const EDGE_MARGIN = 0.1;

/**
 * The in-tab lyrics overlay (ui.md): highlights the syllable being played
 * right now, using brand.md's `.at-highlight` active/base color roles.
 * Driven by `api.playerPositionChanged` (tick position) compared against
 * the flat syllable stream from lyrics-beat-walk.ts, already placed on
 * the playback timeline by the caller (`unrollSyllables`, so a repeated
 * bar's syllables appear once per pass), not alphaTab's own
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
  // The song's own lines (lyrics-ticker-scroll-modes whole-line mode):
  // line index of each syllable in `flat`.
  const lineOf: number[] = lines.flatMap((line, li) => line.map(() => li));
  let anchor: LyricsTickerAnchor = options.anchor ?? loadStoredLyricsTickerAnchor();
  let scroll: LyricsTickerScroll = options.scroll ?? loadStoredLyricsTickerScroll();
  // The line whole-line mode shows: the active syllable's, or the next one's
  // from the start of an empty bar.
  let shownLine = 0;
  const overlay = document.createElement('div');
  overlay.className = 'lyrics-overlay';
  // T006 (feedback F007): the step's rem value is no longer set inline
  // (an inline custom property would beat any media query) — the step is
  // carried as a data attribute and motifs.css maps it to a rem value,
  // with a >=1024px desktop override scaling the four steps up ~1.75x.
  overlay.dataset.lyricsSize = loadStoredLyricsTickerFontSize();
  // T005 (lyrics-ticker-position-preference): the ticker fixes to the top
  // or bottom of the viewport per the personal preference — a class toggle
  // (motifs.css `.lyrics-overlay--top`), bottom being the class-less default.
  overlay.classList.toggle('lyrics-overlay--top', loadStoredLyricsTickerPosition() === 'top');
  function applyModeClasses(): void {
    overlay.classList.toggle('lyrics-overlay--line', scroll === 'line');
    overlay.classList.toggle('lyrics-overlay--anchor-left', anchor === 'left');
  }
  applyModeClasses();
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
  // The line each marker shows with in whole-line mode: the line of the
  // syllable it sits before (the last line when it trails every syllable).
  const markerLine: number[] = [];
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
    const beforeIndex = flat.findIndex((s) => s.tickPosition >= measure.tick);
    const beforeSpan = spans[beforeIndex];
    track.insertBefore(marker, beforeSpan ?? null);
    markerLine.push(beforeIndex >= 0 ? lineOf[beforeIndex] : lines.length - 1);

    return marker;
  });

  // Measures in playback order (ui.md "Measure markers"): the word
  // highlight clears at each bar line (below).
  const measures = options.measures ?? [];
  // Which measures start at least one syllable: measure i spans
  // [measures[i].tick, measures[i + 1].tick). One that starts none is an
  // empty bar, which the strip centers on entry (below).
  const measureStartsSyllable = measures.map((measure, i) => {
    const end = measures[i + 1]?.tick ?? Infinity;
    return flat.some((s) => s.tickPosition >= measure.tick && s.tickPosition < end);
  });

  let measureMarkersVisible = loadStoredMeasureMarkers();

  let activeIndex = -1;
  let currentMeasure = -1;

  // Which syllables and markers are displayed: all of them, except in
  // whole-line mode, where only the shown line's. The pre-singing
  // placeholder shows until the first syllable, in every mode, and never
  // again after it (one-way, even after a seek back).
  let sung = false;
  function applyVisibility(): void {
    const lineMode = scroll === 'line';
    spans.forEach((span, i) => {
      span.style.display = !lineMode || lineOf[i] === shownLine ? '' : 'none';
    });
    markerEls.forEach((el, i) => {
      el.style.display = measureMarkersVisible && (!lineMode || markerLine[i] === shownLine) ? '' : 'none';
    });
    placeholder.style.display = sung ? 'none' : '';
  }
  applyVisibility();

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
  // The anchor point in screen coordinates: the strip's center, or near
  // its left edge (lyrics-ticker-scroll-modes).
  function anchorX(): number {
    const overlayRect = overlay.getBoundingClientRect();
    return overlayRect.left + overlayRect.width * (anchor === 'left' ? LEFT_ANCHOR : 0.5);
  }
  function placeAt(untransformedX: number): void {
    track.style.transform = `translateX(${anchorX() - untransformedX}px)`;
  }
  function untransformedLeft(el: HTMLElement): number {
    return el.getBoundingClientRect().left - new DOMMatrix(getComputedStyle(track).transform).m41;
  }
  // The point of an element that goes on the anchor: its center when
  // centered, its left edge when left-anchored.
  function anchorPointOf(el: HTMLElement): number {
    const left = untransformedLeft(el);
    return anchor === 'left' ? left : left + el.getBoundingClientRect().width / 2;
  }
  function nearEdge(el: HTMLElement): boolean {
    const r = el.getBoundingClientRect();
    const o = overlay.getBoundingClientRect();
    const margin = o.width * EDGE_MARGIN;
    return r.right > o.right - margin || r.left < o.left;
  }
  // Moves the strip to follow the highlight. `force` re-anchors even in
  // edge mode (first paint, resize, a settings change); otherwise edge mode
  // moves only when the highlight nears an edge, then pages it to the
  // anchor. Whole-line mode never translates: the line is laid out in the
  // strip (centered or left-aligned per the anchor, wrapping if long).
  function followHighlight(force: boolean): void {
    if (scroll === 'line') {
      track.style.transform = '';
      applyVisibility();
      return;
    }
    if (centeredEmptyMeasure !== null) {
      centerEmptyMeasure(centeredEmptyMeasure);
      return;
    }
    const activeSpan = activeIndex < 0 ? placeholder : spans[activeIndex];
    if (scroll === 'edge' && !force && !nearEdge(activeSpan)) return;
    placeAt(anchorPointOf(activeSpan));
  }
  function centerActiveSyllable(): void {
    followHighlight(true);
  }
  // Empty bars (user feedback 2026-11-27: "center empty measures when they
  // are entered so we can see words coming after a long break"): entering a
  // bar with no syllable start moves that bar to the anchor: its marker when
  // markers are shown, otherwise the boundary before the next word. The
  // words after the break then sit just past the anchor. Held until the next
  // syllable starts. Edge mode moves here too (a break is the natural moment
  // to page); whole-line mode shows the next line instead.
  let centeredEmptyMeasure: number | null = null;
  function centerEmptyMeasure(measure: number): void {
    if (scroll === 'line') {
      if (activeIndex + 1 < flat.length) shownLine = lineOf[activeIndex + 1];
      applyVisibility();
      return;
    }
    const marker = markerEls[measure];
    if (measureMarkersVisible && marker) {
      placeAt(anchorPointOf(marker));
      return;
    }
    const next = spans[activeIndex + 1];
    if (next) placeAt(untransformedLeft(next));
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
    updateCurrentMeasure(tickPosition);
    if (index !== activeIndex) {
      if (activeIndex < 0 && index >= 0) {
        placeholder.classList.remove('at-highlight');
        placeholder.style.display = 'none';
        sung = true;
      }
      if (activeIndex >= 0) spans[activeIndex].classList.remove('at-highlight');
      activeIndex = index;
      centeredEmptyMeasure = null;
      shownLine = activeIndex >= 0 ? lineOf[activeIndex] : 0;
      followHighlight(false);
    }
    // Before the first syllable the placeholder stays centered.
    if (activeIndex >= 0 && currentMeasure >= 0 && !measureStartsSyllable[currentMeasure] && centeredEmptyMeasure !== currentMeasure) {
      centeredEmptyMeasure = currentMeasure;
      centerEmptyMeasure(currentMeasure);
    }
    // Bar-line clearing (ui.md "Measure markers", user feedback
    // 2026-11-27): a syllable stays highlighted only within the bar it
    // starts in. At each bar line the highlight clears until that bar's
    // first syllable starts, whether or not the bar has any. No
    // per-syllable end times: it clears even if the syllable is still
    // sounding. The strip stays where it is, and the placeholder is
    // unaffected.
    const stale = currentMeasure >= 0 && activeIndex >= 0 && flat[activeIndex].tickPosition < measures[currentMeasure].tick;
    if (activeIndex >= 0) spans[activeIndex].classList.toggle('at-highlight', !stale);
  }

  // The measure containing the playback tick gets the current-bar style
  // (ui.md "Measure markers"). Measures are in playback order, so a
  // repeated measure's own marker for this pass is the one marked.
  function updateCurrentMeasure(tickPosition: number): void {
    let index = -1;
    for (let i = 0; i < measures.length; i++) {
      if (measures[i].tick <= tickPosition) index = i;
      else break;
    }
    if (index === currentMeasure) return;
    if (currentMeasure >= 0) markerEls[currentMeasure].classList.remove('lyrics-measure-marker--current');
    if (index >= 0) markerEls[index].classList.add('lyrics-measure-marker--current');
    currentMeasure = index;
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

  // Top position takes its own space (ui.md "Lyrics ticker position"):
  // the container — first in the tab view's flow (App.svelte) — is given
  // the strip's bottom edge (its height plus the hazard-strip clearance it
  // is pinned below) as its height, so the tab starts beneath it even at
  // the very top of the page, and alphaTab's own
  // `player.scrollOffsetY` shifts every auto-scroll down by the strip's
  // bottom edge, so the current bar's row lands beneath it rather than
  // behind it. alphaTab's scroll handlers read the setting at scroll time,
  // so no updateSettings() (and no re-render) is needed. A ResizeObserver
  // keeps both in step with the strip's real height (font-size preference,
  // desktop breakpoint). Bottom stays an overlay: auto-scroll aligns the
  // current row to the top, so a bottom strip never covers it, and the
  // tab view's padding-bottom already clears its last rows.
  function applyTopReserve(): void {
    const isTop = overlay.classList.contains('lyrics-overlay--top') && overlay.style.display !== 'none';
    const rect = overlay.getBoundingClientRect();
    container.style.height = isTop ? `${Math.ceil(rect.bottom)}px` : '';
    if (api.settings) api.settings.player.scrollOffsetY = isTop ? -Math.ceil(rect.bottom) : 0;
  }
  const reserveObserver = new ResizeObserver(() => applyTopReserve());
  reserveObserver.observe(overlay);
  applyTopReserve();

  return {
    setVisible(visible: boolean) {
      overlay.style.display = visible ? '' : 'none';
      applyTopReserve();
    },
    setFontSize(size: LyricsTickerFontSize) {
      overlay.dataset.lyricsSize = size;
    },
    setPosition(position: LyricsTickerPosition) {
      overlay.classList.toggle('lyrics-overlay--top', position === 'top');
      // The strip's pixel geometry moved — recenter against the new rect.
      centerActiveSyllable();
      applyTopReserve();
    },
    setAnchor(value: LyricsTickerAnchor) {
      anchor = value;
      applyModeClasses();
      centerActiveSyllable();
    },
    setScroll(value: LyricsTickerScroll) {
      scroll = value;
      applyModeClasses();
      applyVisibility();
      centerActiveSyllable();
    },
    setMeasureMarkersVisible(visible: boolean) {
      measureMarkersVisible = visible;
      applyVisibility();
      // Markers change the track's widths, and an empty bar centers on its
      // marker only while markers are shown.
      centerActiveSyllable();
    },
    destroy() {
      api.playerPositionChanged.off(handler);
      window.removeEventListener('resize', resizeHandler);
      reserveObserver.disconnect();
      container.style.height = '';
      if (api.settings) api.settings.player.scrollOffsetY = 0;
      overlay.remove();
    },
  };
}
