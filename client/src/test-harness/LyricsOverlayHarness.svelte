<script lang="ts">
  import { onMount } from 'svelte';
  import { createLyricsOverlay } from '../lyrics-overlay';
  import type { Syllable } from '../lyrics-beat-walk';
  import type { AlphaTabApi } from '@coderline/alphatab';

  // Defaults are the fixture every existing overlay spec asserts against;
  // a spec can pass its own syllables/measures (e.g. a wordless measure).
  export let lines: Syllable[][] = [
    [
      { text: 'When', tickPosition: 0 },
      { text: 'you', tickPosition: 100 },
      { text: 'were', tickPosition: 200 },
    ],
    [
      { text: 'here', tickPosition: 400 },
      { text: 'before', tickPosition: 500 },
    ],
  ];
  // Measure boundaries at ticks 0 (measure 1, before "When") and 300
  // (measure 2, between "were" tick 200 and "here" tick 400) — used by
  // the measure-markers CT spec to assert marker DOM position.
  export let measures: { tick: number; number: number }[] = [
    { tick: 0, number: 1 },
    { tick: 300, number: 2 },
  ];

  // lyrics-ticker-scroll-modes: omitted means the stored preference
  // (center / constant by default), as in the app.
  export let anchor: 'center' | 'left' | undefined = undefined;
  export let scroll: 'constant' | 'edge' | 'line' | undefined = undefined;

  let container: HTMLDivElement;

  onMount(() => {

    let handler: ((e: { currentTick: number }) => void) | undefined;
    const fakeApi = {
      settings: { player: { scrollOffsetY: 0 } },
      playerPositionChanged: {
        on: (cb: (e: { currentTick: number }) => void) => {
          handler = cb;
        },
        off: () => {
          handler = undefined;
        },
      },
    } as unknown as AlphaTabApi;

    const overlay = createLyricsOverlay(fakeApi, lines, container, { measures, anchor, scroll });

    (window as unknown as { __drive: (tick: number) => void }).__drive = (tick: number) => handler?.({ currentTick: tick });
    (window as unknown as { __setVisible: (visible: boolean) => void }).__setVisible = (visible: boolean) => overlay.setVisible(visible);
    (window as unknown as { __setFontSize: (size: string) => void }).__setFontSize = (size: string) =>
      overlay.setFontSize(size as never);
    (window as unknown as { __setMeasureMarkersVisible: (visible: boolean) => void }).__setMeasureMarkersVisible = (visible: boolean) =>
      overlay.setMeasureMarkersVisible(visible);
    (window as unknown as { __setPosition: (position: string) => void }).__setPosition = (position: string) =>
      overlay.setPosition(position as never);
    (window as unknown as { __setAnchor: (anchor: string) => void }).__setAnchor = (value: string) => overlay.setAnchor(value as never);
    (window as unknown as { __setScroll: (scroll: string) => void }).__setScroll = (value: string) => overlay.setScroll(value as never);
  });
</script>

<div style="position: relative; width: 400px; height: 300px;" data-testid="engine-containers-stub">
  <div bind:this={container} class="lyrics-overlay-container" data-testid="overlay-container"></div>
</div>
