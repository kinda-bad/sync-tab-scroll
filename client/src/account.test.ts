import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { accountStateFromMe, accountStore, loadAccount } from './account.js';

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
