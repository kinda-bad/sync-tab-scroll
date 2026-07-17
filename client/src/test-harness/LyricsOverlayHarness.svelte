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

    const overlay = createLyricsOverlay(fakeApi, lines, container);

    (window as unknown as { __drive: (tick: number) => void }).__drive = (tick: number) => handler?.({ currentTick: tick });
    (window as unknown as { __setVisible: (visible: boolean) => void }).__setVisible = (visible: boolean) => overlay.setVisible(visible);
  });
</script>

<div style="position: relative; width: 400px; height: 300px;" data-testid="engine-containers-stub">
  <div bind:this={container} class="lyrics-overlay-container" data-testid="overlay-container"></div>
</div>
