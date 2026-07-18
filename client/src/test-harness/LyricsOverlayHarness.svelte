<script lang="ts">
  import { onMount } from 'svelte';
  import { createLyricsOverlay } from '../lyrics-overlay';
  import type { Syllable } from '../lyrics-beat-walk';
  import type { AlphaTabApi } from '@coderline/alphatab';

  let container: HTMLDivElement;

  onMount(() => {
    const lines: Syllable[][] = [
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

    let handler: ((e: { currentTick: number }) => void) | undefined;
    const fakeApi = {
      playerPositionChanged: {
        on: (cb: (e: { currentTick: number }) => void) => {
          handler = cb;
        },
        off: () => {
          handler = undefined;
        },
      },
    } as unknown as AlphaTabApi;

    // Measure boundaries at ticks 0 (measure 1, before "When") and 300
    // (measure 2, between "were" tick 200 and "here" tick 400) — used by
    // the measure-markers CT spec to assert marker DOM position.
    const measures = [
      { tick: 0, number: 1 },
      { tick: 300, number: 2 },
    ];

    const overlay = createLyricsOverlay(fakeApi, lines, container, { measures });

    (window as unknown as { __drive: (tick: number) => void }).__drive = (tick: number) => handler?.({ currentTick: tick });
    (window as unknown as { __setVisible: (visible: boolean) => void }).__setVisible = (visible: boolean) => overlay.setVisible(visible);
    (window as unknown as { __setFontSize: (size: string) => void }).__setFontSize = (size: string) =>
      overlay.setFontSize(size as never);
    (window as unknown as { __setMeasureMarkersVisible: (visible: boolean) => void }).__setMeasureMarkersVisible = (visible: boolean) =>
      overlay.setMeasureMarkersVisible(visible);
  });
</script>

<div style="position: relative; width: 400px; height: 300px;" data-testid="engine-containers-stub">
  <div bind:this={container} class="lyrics-overlay-container" data-testid="overlay-container"></div>
</div>
