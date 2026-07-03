import { describe, expect, it } from 'vitest';
import type { AlphaTabApi } from '@coderline/alphatab';
import { waitUntilReady } from './readiness';

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
