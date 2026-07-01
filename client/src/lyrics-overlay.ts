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

  const spans: HTMLSpanElement[] = flat.map((syllable) => {
    const span = document.createElement('span');
    span.className = 'lyric-syllable';
    span.textContent = syllable.text + ' ';
    overlay.appendChild(span);
    return span;
  });

  let activeIndex = -1;

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
  }

  const handler = (e: { currentTick: number }) => updateActiveSyllable(e.currentTick);
  api.playerPositionChanged.on(handler);

  return {
    setVisible(visible: boolean) {
      overlay.style.display = visible ? '' : 'none';
    },
    destroy() {
      api.playerPositionChanged.off(handler);
      overlay.remove();
    },
  };
}
