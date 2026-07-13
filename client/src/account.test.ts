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

describe('signOut (T001) — verify via /me', () => {
  let reload: ReturnType<typeof vi.fn>;
  let originalWindow: unknown;

  /**
   * Builds a fetch mock that routes by URL: `/auth/logout` (POST) either
   * resolves `{ok:true}` or throws (an aborted response the server still
   * processed), and `/me` (GET) either resolves a `MeResponse` body or throws.
   */
  const routedFetch = (opts: {
    logout: 'ok' | 'throw';
    me: { accountsEnabled: boolean; user: { displayName: string } | null } | 'throw' | 'notok';
  }): typeof fetch =>
    (async (url: string) => {
      if (url === '/auth/logout') {
        if (opts.logout === 'throw') throw new Error('aborted');
        return { ok: true } as Response;
      }
      // '/me'
      if (opts.me === 'throw') throw new Error('offline');
      if (opts.me === 'notok') return { ok: false, json: async () => ({}) } as unknown as Response;
      return { ok: true, json: async () => opts.me } as unknown as Response;
    }) as unknown as typeof fetch;

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

  it('(a) logout throws but /me confirms signed-out → store signed-out, no toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'throw', me: { accountsEnabled: true, user: null } }));

    expect(get(accountStore)).toEqual({ status: 'signed-out', displayName: null });
    expect(get(toastStore).length).toBe(before);
    expect(reload).not.toHaveBeenCalled();
  });

  it('(b) logout resolves ok and /me confirms signed-out → store signed-out, no toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'ok', me: { accountsEnabled: true, user: null } }));

    expect(get(accountStore)).toEqual({ status: 'signed-out', displayName: null });
    expect(get(toastStore).length).toBe(before);
    expect(reload).not.toHaveBeenCalled();
  });

  it('(c) /me still returns a user → store signed-in, exactly one toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'ok', me: { accountsEnabled: true, user: { displayName: 'Ada' } } }));

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('(c) logout throws and /me still returns a user → store signed-in, exactly one toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'throw', me: { accountsEnabled: true, user: { displayName: 'Ada' } } }));

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('(d) both logout and /me fail → menu stays signed-in, retryable toast (T004)', async () => {
    // A transient /me failure must NOT blank the account menu to *unavailable*
    // (that state is reserved for a DB-less server, feedback F003). The menu
    // stays signed-in and the user gets a retryable Error toast.
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'throw', me: 'throw' }));

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('signOut (T004) — an unreachable /me keeps the menu signed-in (F003)', () => {
  const routedFetch = (opts: {
    logout: 'ok' | 'throw';
    me: { accountsEnabled: boolean; user: { displayName: string } | null } | 'throw' | 'notok';
  }): typeof fetch =>
    (async (url: string) => {
      if (url === '/auth/logout') {
        if (opts.logout === 'throw') throw new Error('aborted');
        return { ok: true } as Response;
      }
      if (opts.me === 'throw') throw new Error('offline');
      if (opts.me === 'notok') return { ok: false, json: async () => ({}) } as unknown as Response;
      return { ok: true, json: async () => opts.me } as unknown as Response;
    }) as unknown as typeof fetch;

  beforeEach(() => {
    accountStore.set({ status: 'signed-in', displayName: 'Ada' });
  });

  it('(a-throw) logout ok but /me throws → store stays signed-in, retryable toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'ok', me: 'throw' }));

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
  });

  it('(a-notok) logout ok but /me is non-ok → store stays signed-in, retryable toast', async () => {
    const before = get(toastStore).length;

    await signOut(routedFetch({ logout: 'ok', me: 'notok' }));

    expect(get(accountStore)).toEqual({ status: 'signed-in', displayName: 'Ada' });
    expect(get(toastStore).length).toBe(before + 1);
  });
});

describe('loadAccount (T004) — boot behavior unchanged on a failed /me', () => {
  it('(b-throw) a /me that throws still resolves the store to unavailable', async () => {
    const throwing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const state = await loadAccount(throwing);
    expect(state).toEqual({ status: 'unavailable', displayName: null });
    expect(get(accountStore).status).toBe('unavailable');
  });

  it('(b-notok) a non-ok /me still resolves the store to unavailable', async () => {
    const notOk = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    const state = await loadAccount(notOk);
    expect(state).toEqual({ status: 'unavailable', displayName: null });
    expect(get(accountStore).status).toBe('unavailable');
  });
});
