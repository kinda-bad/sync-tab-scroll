import { describe, expect, it } from 'vitest';
import { containerRuntimeAvailable, withTestDatabase } from './accounts/pg-test-container.js';
import { PgAccountStore } from './accounts/pg-store.js';
import { membershipDerivedUnlocks } from './membership-unlock.js';
import type { LoadedCatalogue } from './catalog-loader.js';
import { setCatalogueOwner } from './set-catalogue-owner.js';

const KINDA_BAD: LoadedCatalogue = { id: 'kinda-bad', name: 'Kinda Bad', public: false, salt: 's', hash: 'h', epoch: 2 };

describe.skipIf(!containerRuntimeAvailable())('set-catalogue-owner CLI (T018)', () => {
  const withStore = (fn: (store: PgAccountStore) => Promise<void>) =>
    withTestDatabase(async (pool) => {
      await fn(new PgAccountStore(pool));
    });

  it('grants an owner membership resolving the account by email, and that account then auto-unlocks the catalogue with no key', async () => {
    await withStore(async (store) => {
      const user = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 'op', displayName: 'Operator', email: 'op@example.com' });

      const membership = await setCatalogueOwner(store, 'kinda-bad', 'op@example.com');
      expect(membership.grantedVia).toBe('owner');
      expect(membership.keyEpoch).toBeNull();
      expect(membership.catalogueId).toBe('kinda-bad');
      expect(membership.userId).toBe(user!.id);

      // The owner membership auto-unlocks kinda-bad regardless of key epoch
      // (owner grants are not epoch-gated) — the payoff: no key entry.
      const memberships = await store.getMembershipsByUser(user!.id);
      expect(membershipDerivedUnlocks(memberships, [KINDA_BAD])).toEqual(['kinda-bad']);
    });
  }, 120_000);

  it('resolves the account by provider:subject too', async () => {
    await withStore(async (store) => {
      const user = await store.upsertUser({ oauthProvider: 'github', oauthSubject: '4242', displayName: 'Gh', email: null });
      const membership = await setCatalogueOwner(store, 'kinda-bad', 'github:4242');
      expect(membership.userId).toBe(user!.id);
      expect(membership.grantedVia).toBe('owner');
    });
  }, 120_000);

  it('throws when no account matches the identifier (they must sign in first)', async () => {
    await withStore(async (store) => {
      await expect(setCatalogueOwner(store, 'kinda-bad', 'nobody@example.com')).rejects.toThrow();
      await expect(setCatalogueOwner(store, 'kinda-bad', 'google:missing')).rejects.toThrow();
    });
  }, 120_000);
});
