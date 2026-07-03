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

  const spans: HTMLSpanElement[] = flat.map((syllable) => {
    const span = document.createElement('span');
    span.className = 'lyric-syllable';
    span.textContent = syllable.text + ' ';
    track.appendChild(span);
    return span;
  });

  let activeIndex = -1;

  function centerActiveSyllable(): void {
    if (activeIndex < 0) return;
    const activeSpan = spans[activeIndex];
    const translateX = overlay.clientWidth / 2 - (activeSpan.offsetLeft + activeSpan.offsetWidth / 2);
    track.style.transform = `translateX(${translateX}px)`;
  }

  function updateActiveSyllable(tickPosition: number): void {
    let index = -1;
    for (let i = 0; i < flat.length; i++) {
      if (flat[i].tickPosition <= tickPosition) index = i;
      else break;
    }
    if (index === activeIndex) return;
    if (activeIndex >= 0) spans[activeIndex].classList.remove('at-highlight');
    if (index >= 0) spans[index].classList.add('at-highlight');
    activeIndex = index;
    centerActiveSyllable();
  }

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
