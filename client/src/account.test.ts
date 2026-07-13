import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { accountStateFromMe, accountStore, loadAccount, signOut } from './account.js';
import { toastStore } from './toast-store.js';

describe('accountStateFromMe (T016)', () => {
  it('maps accountsEnabled=false to unavailable (affordances absent)', () => {
    expect(accountStateFromMe({ accountsEnabled: false, user: null })).toEqual({ status: 'unavailable', displayName: null });
  });

  it('maps enabled + no user to signed-out', () => {
    expect(accountStateFromMe({ accountsEnabled: true, user: null })).toEqual({ status: 'signed-out', displayName: null });
  });

  it('maps enabled + user to signed-in with the display name', () => {
    expect(accountStateFromMe({ accountsEnabled: true, user: { displayName: 'Ada' } })).toEqual({ status: 'signed-in', displayName: 'Ada' });
  });
});

describe('loadAccount (T016)', () => {
  const okFetch = (body: unknown): typeof fetch =>
    (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;

  it('updates the store from a successful /me', async () => {
    await loadAccount(okFetch({ accountsEnabled: true, user: { displayName: 'Bo' } }));
    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Bo' });
  });

  it('resolves to unavailable on a network error (affordances stay absent)', async () => {
    const throwing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await loadAccount(throwing);
    expect(get(accountStore).status).toBe('unavailable');
  });

  it('resolves to unavailable on a non-200 /me', async () => {
    const notOk = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    await loadAccount(notOk);
    expect(get(accountStore).status).toBe('unavailable');
  });
});

describe('signOut (T001)', () => {
  let reload: ReturnType<typeof vi.fn>;
  let originalWindow: unknown;

  beforeEach(() => {
    // signOut must NOT reload; stub window.location.reload to observe it.
    reload = vi.fn();
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    (globalThis as unknown as { window: unknown }).window = { location: { reload } };
    // Seed a signed-in state before each case.
    accountStore.set({ status: 'signed-in', displayName: 'Ada' });
  });

  afterEach(() => {
    (globalThis as unknown as { window?: unknown }).window = originalWindow;
  });

  it('confirmed logout (res.ok) flips the store to signed-out with no reload', async () => {
    const okFetch = (async () => ({ ok: true })) as unknown as typeof fetch;

    await signOut(okFetch);

    expect(get(accountStore)).toEqual({ status: 'signed-out', displayName: null });
    expect(reload).not.toHaveBeenCalled();
  });

  it('non-OK logout leaves the store signed-in and pushes exactly one toast', async () => {
    const notOk = (async () => ({ ok: false })) as unknown as typeof fetch;
    const before = get(toastStore).length;

    await signOut(notOk);

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('a thrown fetch leaves the store signed-in and pushes exactly one toast', async () => {
    const throwing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const before = get(toastStore).length;

    await signOut(throwing);

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
    expect(reload).not.toHaveBeenCalled();
  });
});
