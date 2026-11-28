import type { AlphaTabApi } from '@coderline/alphatab';
import * as atLib from '@coderline/alphatab';
import type { LyricsOverlay } from './lyrics-overlay';
import type { MeasureBoundary } from './lyrics-gap-timing';
import { layoutBandItems, xAtPosition, type BandAnchor } from './horizontal-lyrics-layout';
import { loadStoredLyricsTickerFontSize, type LyricsTickerFontSize } from './lyrics-ticker-font-size-preference';
import { loadStoredMeasureMarkers } from './lyrics-measure-markers-preference';

export interface BandItem {
  text: string;
  /** Playback-timeline position: a tick (`unit: 'tick'`) or ms (`unit: 'ms'`). */
  at: number;
}

export interface HorizontalLyricsBandOptions {
  /** What `BandItem.at` counts: playback ticks (GP syllables) or ms (`.lrc` lines). */
  unit: 'tick' | 'ms';
  /** Measure boundaries (ticks), for the "Measure markers" preference and bar-line clearing. Tick unit only. */
  measures?: MeasureBoundary[];
  /** Follow the personal "Lyrics ticker font size" preference (the in-tab band). The Lyrics part's band keeps its own size. */
  followFontSizePreference?: boolean;
}

/** Base spacing: about four characters of text per quarter note (or per half second of an `.lrc`). */
const EMS_PER_QUARTER = 4;
const TICKS_PER_QUARTER = 960;
const MS_PER_QUARTER_EQUIVALENT = 500;
/** How far past the last position report the band keeps moving on its own (ms) before it holds. */
const MAX_EXTRAPOLATION_MS = 400;

/**
 * The horizontal view's lyrics band (ui.md Playback View, "Horizontal
 * view"; feature horizontal-scroll-view). Every item sits on one line at its
 * playback position (horizontal-lyrics-layout.ts), and the line moves right
 * to left so each item's left edge reaches the playhead exactly when it is
 * sung. It follows the playback order like the ticker does, so a repeat
 * sings forward, never back. Motion is per animation frame, extrapolated
 * from alphaTab's position reports at their measured rate, so the band
 * glides rather than stepping each time a report arrives. Same
 * `LyricsOverlay` surface as the ticker, so the engine's toggle, font-size
 * and measure-marker hooks drive it unchanged.
 */
export function createHorizontalLyricsBand(
  api: AlphaTabApi,
  items: BandItem[],
  container: HTMLElement,
  options: HorizontalLyricsBandOptions,
): LyricsOverlay {
  const band = document.createElement('div');
  band.className = 'hview-lyrics';
  if (options.followFontSizePreference) band.dataset.lyricsSize = loadStoredLyricsTickerFontSize();
  container.appendChild(band);

  const track = document.createElement('div');
  track.className = 'hview-lyrics-track';
  band.appendChild(track);

  const spans = items.map((item) => {
    const span = document.createElement('span');
    span.className = 'lyric-syllable hview-lyrics-item';
    span.textContent = item.text;
    track.appendChild(span);
    return span;
  });

  const measures = options.unit === 'tick' ? (options.measures ?? []) : [];
  const markerEls = measures.map((measure) => {
    const marker = document.createElement('span');
    marker.className = 'hview-lyrics-marker';
    const number = document.createElement('span');
    number.className = 'lyrics-measure-marker-number';
    number.textContent = String(measure.number);
    marker.appendChild(number);
    track.appendChild(marker);
    return marker;
  });
  let measureMarkersVisible = loadStoredMeasureMarkers();
  const applyMarkerVisibility = () => markerEls.forEach((el) => (el.style.display = measureMarkersVisible ? '' : 'none'));
  applyMarkerVisibility();

  let pxPerUnit = 0;
  let anchors: BandAnchor[] = [];

  function layout(): void {
    const fontPx = parseFloat(getComputedStyle(band).fontSize) || 16;
    const unitsPerQuarter = options.unit === 'tick' ? TICKS_PER_QUARTER : MS_PER_QUARTER_EQUIVALENT;
    pxPerUnit = (fontPx * EMS_PER_QUARTER) / unitsPerQuarter;
    const widths = spans.map((span) => span.getBoundingClientRect().width);
    const xs = layoutBandItems(
      items.map((item, i) => ({ at: item.at, width: widths[i] })),
      pxPerUnit,
      fontPx * 0.5,
    );
    anchors = items.map((item, i) => ({ at: item.at, x: xs[i] }));
    spans.forEach((span, i) => (span.style.left = `${xs[i]}px`));
    markerEls.forEach((el, i) => (el.style.left = `${xAtPosition(anchors, measures[i].tick, pxPerUnit)}px`));
  }

  // Highlight: the last item at or before the position, cleared at each bar
  // line until that bar's first item starts — the ticker's own rule (ui.md
  // "Bar-line clearing").
  let activeIndex = -1;
  let currentMeasure = -1;
  function updateHighlight(position: number): void {
    let index = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].at <= position) index = i;
      else break;
    }
    let measure = -1;
    for (let i = 0; i < measures.length; i++) {
      if (measures[i].tick <= position) measure = i;
      else break;
    }
    if (measure !== currentMeasure) {
      if (currentMeasure >= 0) markerEls[currentMeasure].classList.remove('lyrics-measure-marker--current');
      if (measure >= 0) markerEls[measure].classList.add('lyrics-measure-marker--current');
      currentMeasure = measure;
    }
    if (index !== activeIndex) {
      if (activeIndex >= 0) spans[activeIndex].classList.remove('at-highlight');
      activeIndex = index;
    }
    const stale = currentMeasure >= 0 && activeIndex >= 0 && items[activeIndex].at < measures[currentMeasure].tick;
    if (activeIndex >= 0) spans[activeIndex].classList.toggle('at-highlight', !stale);
  }

  let shown = 0;
  function show(position: number): void {
    shown = position;
    track.style.transform = `translateX(${-xAtPosition(anchors, position, pxPerUnit)}px)`;
    updateHighlight(position);
  }

  // Position reports and their measured rate (units per wall-clock ms).
  let lastAt = 0;
  let lastNow = 0;
  let rate = 0;
  let playing = false;
  let frame = 0;

  const positionOf = (e: { currentTick: number; currentTime: number }) => (options.unit === 'tick' ? e.currentTick : e.currentTime);

  const onPosition = (e: { currentTick: number; currentTime: number; isSeek: boolean }) => {
    const at = positionOf(e);
    const now = performance.now();
    const elapsed = now - lastNow;
    if (playing && !e.isSeek && lastNow > 0 && at >= lastAt && elapsed > 5 && elapsed < 1000) {
      const measured = (at - lastAt) / elapsed;
      rate = rate > 0 ? rate * 0.7 + measured * 0.3 : measured;
    }
    lastAt = at;
    lastNow = now;
    // A seek, or a report while not playing, places the band exactly; while
    // playing the frame loop below moves it, never backward for a report
    // that lands just behind its own estimate.
    if (!playing || e.isSeek || Math.abs(at - shown) > rate * 1000) show(at);
  };

  function tickFrame(): void {
    if (!playing) return;
    const ahead = Math.min(performance.now() - lastNow, MAX_EXTRAPOLATION_MS);
    show(Math.max(shown, lastAt + rate * ahead));
    frame = requestAnimationFrame(tickFrame);
  }

  const onState = (e: { state: number }) => {
    const nowPlaying = e.state === atLib.synth.PlayerState.Playing;
    if (nowPlaying === playing) return;
    playing = nowPlaying;
    cancelAnimationFrame(frame);
    if (playing) {
      lastNow = performance.now();
      frame = requestAnimationFrame(tickFrame);
    } else {
      show(lastAt);
    }
  };

  api.playerPositionChanged.on(onPosition);
  api.playerStateChanged.on(onState);

  layout();
  show(0);

  const onResize = () => {
    layout();
    show(shown);
  };
  window.addEventListener('resize', onResize);

  return {
    setVisible(visible: boolean) {
      band.style.display = visible ? '' : 'none';
    },
    setFontSize(size: LyricsTickerFontSize) {
      if (!options.followFontSizePreference) return;
      band.dataset.lyricsSize = size;
      onResize();
    },
    setPosition() {
      // The band has its own place above the tab; the ticker's top/bottom
      // preference doesn't apply to it.
    },
    setAnchor() {
      // The ticker's Anchor and Scrolling modes (lyrics-ticker-scroll-modes)
      // are the ticker's only: the band always glides past the fixed playhead.
    },
    setScroll() {},
    setMeasureMarkersVisible(visible: boolean) {
      measureMarkersVisible = visible;
      applyMarkerVisibility();
    },
    destroy() {
      playing = false;
      cancelAnimationFrame(frame);
      api.playerPositionChanged.off(onPosition);
      api.playerStateChanged.off(onState);
      window.removeEventListener('resize', onResize);
      band.remove();
    },
  };
}
