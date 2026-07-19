import { describe, expect, it, vi } from 'vitest';
import type { AlphaTabApi } from '@coderline/alphatab';
import { waitUntilReady, warmUpAudioOutput } from './readiness';

function fakeEvent() {
  let callback: (() => void) | undefined;
  return {
    on: (cb: () => void) => {
      callback = cb;
    },
    fire: () => callback?.(),
  };
}

function fakeApi() {
  const scoreLoaded = fakeEvent();
  const soundFontLoaded = fakeEvent();
  const api = { scoreLoaded, soundFontLoaded } as unknown as AlphaTabApi;
  return { api, scoreLoaded, soundFontLoaded };
}

describe('waitUntilReady', () => {
  it('does not resolve after only scoreLoaded fires', async () => {
    const { api, scoreLoaded } = fakeApi();
    let resolved = false;
    waitUntilReady(api).then(() => {
      resolved = true;
    });

    scoreLoaded.fire();
    await Promise.resolve();
    expect(resolved).toBe(false);
  });

  it('resolves once both fire, scoreLoaded then soundFontLoaded', async () => {
    const { api, scoreLoaded, soundFontLoaded } = fakeApi();
    const promise = waitUntilReady(api);

    scoreLoaded.fire();
    soundFontLoaded.fire();

    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves once both fire, soundFontLoaded then scoreLoaded', async () => {
    const { api, scoreLoaded, soundFontLoaded } = fakeApi();
    const promise = waitUntilReady(api);

    soundFontLoaded.fire();
    scoreLoaded.fire();

    await expect(promise).resolves.toBeUndefined();
  });
});

// T019/T020 (plan-1619-2026-07-17-39c6.md): the reported playback-start
// stutter is consistent with a classic Web Audio first-buffer glitch — the
// AudioContext is currently only created/resumed lazily on the user
// gesture that presses "Start" (waitUntilReady itself does no warm-up).
// alphaTab's public `ISynthOutput.activate()` (reachable via the equally
// public `AlphaTabApi.player.output`) is a clean, stable, idempotent way to
// pre-resume the AudioContext at part-selection time — well before Start —
// rather than an unsupported internal cast (contrast T014/F001, where no
// such public mechanism existed). This only tests that the pre-warm is
// invoked at the right lifecycle point, not that it eliminates the
// reported stutter — that requires live audio A/B testing this suite
// can't perform (constitution Principle VII test-first, applied to an
// optimization whose *efficacy* isn't directly observable here).
describe('warmUpAudioOutput', () => {
  it('calls player.output.activate() when a player is present', () => {
    const activate = vi.fn();
    const api = { player: { output: { activate } } } as unknown as AlphaTabApi;

    warmUpAudioOutput(api);

    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when there is no player yet', () => {
    const api = { player: null } as unknown as AlphaTabApi;

    expect(() => warmUpAudioOutput(api)).not.toThrow();
  });
});

// T001 (explicit-participant-readiness): asset completion now reports the
// new intermediate 'loaded' state — human confirmation ('ready') is a
// separate, explicit step (ready-set), never implied by loading finishing.
describe('reportAssetReadiness', () => {
  it('sends readiness-update loaded once assets finish', async () => {
    const { api, scoreLoaded, soundFontLoaded } = fakeApi();
    const send = vi.fn();
    const { reportAssetReadiness } = await import('./readiness');
    reportAssetReadiness({ send } as never, api);

    scoreLoaded.fire();
    soundFontLoaded.fire();
    await Promise.resolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledWith({ type: 'readiness-update', readiness: 'loaded' });
  });
});
