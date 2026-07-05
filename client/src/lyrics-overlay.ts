import type { AlphaTabApi } from '@coderline/alphatab';
import type { Syllable } from './lyrics-beat-walk';

export interface LyricsOverlay {
  setVisible(visible: boolean): void;
  destroy(): void;
}

/**
 * The in-tab lyrics overlay (ui.md): highlights the syllable being played
 * right now, using brand.md's `.at-highlight` active/base color roles.
 * Driven by `api.playerPositionChanged` (tick position) compared against
 * the flat syllable stream from lyrics-beat-walk.ts, not alphaTab's own
 * per-beat SVG groups — toggle-able independent of which track is
 * currently rendered, since the lyrics-bearing track need not be the one
 * on screen (infrastructure.md).
 */
export function createLyricsOverlay(api: AlphaTabApi, lines: Syllable[][], container: HTMLElement): LyricsOverlay {
  const flat = lines.flat();
  const overlay = document.createElement('div');
  overlay.className = 'lyrics-overlay';
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
    destroy() {
      api.playerPositionChanged.off(handler);
      window.removeEventListener('resize', resizeHandler);
      overlay.remove();
    },
  };
}
