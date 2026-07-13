import { describe, expect, it } from 'vitest';
import { createAccountStore } from './factory.js';
import { NullAccountStore } from './null-store.js';

describe('createAccountStore (repository seam — T003)', () => {
  it('returns the null/absent implementation when no DATABASE_URL is configured', () => {
    const store = createAccountStore(undefined);
    expect(store).toBeInstanceOf(NullAccountStore);
    expect(store.enabled).toBe(false);
  });

  it('treats an empty-string DATABASE_URL as absent (self-disables)', () => {
    const store = createAccountStore('');
    expect(store).toBeInstanceOf(NullAccountStore);
    expect(store.enabled).toBe(false);
  });
});

describe('NullAccountStore — the DB-optional guarantee (T003)', () => {
  it('reports itself disabled', () => {
    expect(new NullAccountStore().enabled).toBe(false);
  });

  it('reads return empty/anonymous', async () => {
    const store = new NullAccountStore();
    expect(await store.getUser('any')).toBeNull();
    expect(await store.getAuthSession('any')).toBeNull();
    expect(await store.getMembershipsByUser('any')).toEqual([]);
  });

  it('writes are inert no-ops (return null / resolve) and never throw', async () => {
    const store = new NullAccountStore();
    expect(
      await store.upsertUser({ oauthProvider: 'google', oauthSubject: 's', displayName: 'D', email: null }),
    ).toBeNull();
    expect(await store.createAuthSession({ userId: 'u', expiresAt: Date.now() + 1000 })).toBeNull();
    expect(
      await store.upsertMembership({ userId: 'u', catalogueId: 'c', grantedVia: 'key', keyEpoch: 1 }),
    ).toBeNull();
    await expect(store.revokeAuthSession('any')).resolves.toBeUndefined();
    await expect(store.close()).resolves.toBeUndefined();
  });
});
