import type * as at from '@coderline/alphatab';

/**
 * The horizontal view's scroll handler (feature horizontal-scroll-view,
 * infrastructure.md Tab Rendering). alphaTab 1.9.0 already ships what the
 * view needs: `LayoutMode.Horizontal` with `ScrollMode.Smooth` keeps the
 * on-time position at `scrollOffsetX` and scrolls the sheet past it, beat to
 * beat, with its own rAF animation (alphaTab's `HorizontalSmoothScrollHandler`).
 * This is that handler's `onBeatCursorUpdating`, unchanged.
 *
 * The one difference is `forceScrollTo`, which alphaTab's version gets wrong
 * in 1.9.0: it calls `scrollToY(scroll, onNotesX + scrollOffsetY, 0)`, the
 * vertical axis with a horizontal coordinate. `api.scrollToCursor()` lands
 * there, and both the engine (on every Start, the first-play scroll fix) and
 * alphaTab itself (on a pause) call it, so in the horizontal view each Start
 * and pause scrolled the band (or the page) vertically and left the sheet
 * where it was. Here it scrolls horizontally to the cursor, which also lets
 * the engine bring a parked cursor (start marker, Spotlight, click-to-seek)
 * to the playhead. Installed through alphaTab's public `customScrollHandler`
 * extension point (Principle V), not a patch.
 *
 * The default Smooth handler alphaTab still creates alongside this one is
 * what pads the end of the sheet (canvas `padding-right`), so the last beat
 * can reach the playhead too.
 */
export function createHorizontalScrollHandler(api: at.AlphaTabApi): at.IScrollHandler {
  let lastScroll = -1;
  return {
    [Symbol.dispose]() {},
    forceScrollTo(currentBeatBounds: at.rendering.BeatBounds) {
      const ui = api.uiFacade;
      ui.scrollToX(ui.getScrollContainer(), currentBeatBounds.onNotesX + api.settings.player.scrollOffsetX, 0);
      lastScroll = -1;
    },
    onBeatCursorUpdating(_startBeat, _endBeat, _cursorMode, startX, endX, duration) {
      const ui = api.uiFacade;
      if (endX === lastScroll && duration > 0) return;
      const scroll = ui.getScrollContainer();
      const offset = api.settings.player.scrollOffsetX;
      ui.scrollToX(scroll, startX + offset, 0);
      if (duration === 0) {
        lastScroll = -1;
        return;
      }
      lastScroll = endX;
      ui.scrollToX(scroll, endX + offset, duration);
    },
  };
}
