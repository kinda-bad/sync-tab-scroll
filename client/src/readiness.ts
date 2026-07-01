import type { AlphaTabApi } from '@coderline/alphatab';

/**
 * Resolves once both the score has parsed/rendered and the SoundFont has
 * loaded — whichever finishes last (infrastructure.md, ui.md Loading
 * state). Applies identically to a visible or headless alphaTab instance.
 */
export function waitUntilReady(api: AlphaTabApi): Promise<void> {
  return new Promise((resolve) => {
    let scoreLoaded = false;
    let soundFontLoaded = false;

    const checkDone = () => {
      if (scoreLoaded && soundFontLoaded) resolve();
    };

    api.scoreLoaded.on(() => {
      scoreLoaded = true;
      checkDone();
    });
    api.soundFontLoaded.on(() => {
      soundFontLoaded = true;
      checkDone();
    });
  });
}
