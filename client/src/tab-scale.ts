/**
 * alphaTab render scale by viewport width (plan-worktree-ui-improvements
 * T005). On phone-width screens the default 1.0 scale leaves fret numbers
 * too small to read without pinch-zooming; `settings.display.scale` is
 * alphaTab's supported zoom idiom, and LayoutMode.Page re-wraps bars to
 * the container width, so a larger scale means fewer bars per row — never
 * horizontal overflow.
 *
 * 500px matches the phone/not-phone ceiling the small-screen e2e helper
 * asserts on (client/e2e/helpers.ts): real phones lay out at ~320-430px.
 * The scale is fixed at renderer creation — a deliberate non-adjustable
 * default per the plan's open question; revisit only if it proves wrong
 * in live use.
 */
export function tabScaleForViewportWidth(width: number): number {
  return width < 500 ? 1.3 : 1;
}
