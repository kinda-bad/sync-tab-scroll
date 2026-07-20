import type { AlphaTabApi } from '@coderline/alphatab';
import type { WsClient } from './ws-client';

/**
 * Resolves once both required assets have loaded — whichever finishes last
 * (infrastructure.md, ui.md Loading state). Applies identically to a visible or
 * headless alphaTab instance.
 *
 * Mode-aware (T014): in synth mode the assets are the score plus the SoundFont.
 * A backing-track instance loads no SoundFont and may never fire
 * `soundFontLoaded`, so in recording mode readiness is the score plus the
 * backing-track/player timeline load (`midiLoaded`) — waiting on
 * `soundFontLoaded` there would hang forever.
 */
export function waitUntilReady(api: AlphaTabApi, options: { recording?: boolean } = {}): Promise<void> {
  return new Promise((resolve) => {
    let scoreLoaded = false;
    let audioLoaded = false;

    const checkDone = () => {
      if (scoreLoaded && audioLoaded) resolve();
    };

    api.scoreLoaded.on(() => {
      scoreLoaded = true;
      checkDone();
    });
    const audioEvent = options.recording ? api.midiLoaded : api.soundFontLoaded;
    audioEvent.on(() => {
      audioLoaded = true;
      checkDone();
    });
  });
}

/**
 * Reports this participant's asset completion to the server
 * (`explicit-participant-readiness`, T001): once both assets are done the
 * participant is `loaded` — NOT `ready`, which is now a separate,
 * human-confirmed state flipped only by the Bar's ready control
 * (`ready-set`). Asset loading never implies human readiness.
 */
export function reportAssetReadiness(wsClient: WsClient, api: AlphaTabApi, options: { recording?: boolean } = {}): void {
  void waitUntilReady(api, options).then(() => wsClient.send({ type: 'readiness-update', readiness: 'loaded' }));
}

/**
 * Pre-warms the audio engine's `AudioContext` (T019/T020, infrastructure.md
 * Tab Rendering): calls alphaTab's public `ISynthOutput.activate()` — a
 * stable, documented, idempotent method (unlike F001/T014's unsupported
 * internal cast) — as soon as `api.player` exists, rather than waiting for
 * it to happen lazily on the first `play()` call the "Start" button
 * gesture triggers. `activate()` itself only actually resumes the context
 * when it's suspended/interrupted, so calling this early (right after the
 * api is created, well before "Start" is pressed) is safe to call whether
 * or not a warm-up was actually needed. No-op if the player isn't ready
 * yet (mirrors `waitUntilReady`'s own null-safety pattern for an
 * in-progress api).
 */
export function warmUpAudioOutput(api: AlphaTabApi): void {
  api.player?.output.activate();
}
