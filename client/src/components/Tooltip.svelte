<script lang="ts">
  // T001 (tasks-hover-long-press-tooltip-for-i-9124.md): standalone popover
  // shown by a hosting control (e.g. Button.svelte's iconOnly mode) on
  // hover/long-press, per ui.md's "Bar controls are icon-based" paragraph.
  //
  // T001 (tasks-icons-a11y-ticker-a10d.md, feedback F005): portaled to
  // document.body. Found live: the Bar's torn-edge/glitch-cut-edge
  // `clip-path` (Bar.svelte's .bar) clips every descendant's painting —
  // including a positioned tooltip popping above the bar — so only a sliver
  // below the tear ever rendered, and no z-index inside the bar could fix
  // that. The tooltip therefore renders as a `position: fixed` element
  // appended to <body>, anchored to the host control's rect, with a z-index
  // above alphaTab's injected cursors (1000) and the lyrics ticker (1001).
  export let label: string;
  export let visible = false;
  /** The control this tooltip is anchored to (its rect positions the popover). */
  export let anchor: HTMLElement | undefined = undefined;

  let left = 0;
  let top = 0;

  function reposition(el: HTMLElement | undefined): void {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    left = rect.left + rect.width / 2;
    top = rect.top - 8;
  }

  $: if (visible) reposition(anchor);

  // Svelte action: move the element out of the (clip-path'd) host subtree
  // into <body>; removed again on destroy.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }
</script>

{#if visible}
  <span class="tooltip" role="tooltip" use:portal style="left: {left}px; top: {top}px;">{label}</span>
{/if}

<style>
  .tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--ink);
    pointer-events: none;
    /* Above alphaTab's .at-cursors (inline z-index: 1000) and the lyrics
       ticker (1001, motifs.css). */
    z-index: 1200;
  }
</style>
