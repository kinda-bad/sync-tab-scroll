import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { containerRuntimeAvailable, withTestDatabase } from './pg-test-container.js';
import { PgAccountStore } from './pg-store.js';

/**
 * Postgres repository CRUD against the real container harness (T005). Skips when
 * no container runtime is reachable. Duplicate-rejection is proven two ways:
 * the store's upserts are idempotent (one row per unique key), and a raw
 * duplicate INSERT is rejected by the live unique constraint.
 */
describe.skipIf(!containerRuntimeAvailable())('PgAccountStore (T006)', () => {
  const withStore = (fn: (store: PgAccountStore, pool: Pool) => Promise<void>) =>
    withTestDatabase(async (pool) => {
      await fn(new PgAccountStore(pool), pool);
    });

  it('reports itself enabled', async () => {
    await withStore(async (store) => {
      expect(store.enabled).toBe(true);
    });
  }, 120_000);

  it('upserts a User by (oauthProvider, oauthSubject) idempotently and round-trips it', async () => {
    await withStore(async (store, pool) => {
      const first = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 'sub-1', displayName: 'Ada', email: 'ada@example.com' });
      expect(first).not.toBeNull();
      expect(first!.oauthProvider).toBe('google');
      expect(first!.email).toBe('ada@example.com');

      // Same login key ⇒ same row (id/createdAt preserved), displayName updated.
      const second = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 'sub-1', displayName: 'Ada L.', email: null });
      expect(second!.id).toBe(first!.id);
      expect(second!.createdAt).toBe(first!.createdAt);
      expect(second!.displayName).toBe('Ada L.');
      expect(second!.email).toBeNull();

      const count = await pool.query('SELECT count(*)::int AS n FROM app_user');
      expect(count.rows[0].n).toBe(1);

      const fetched = await store.getUser(first!.id);
      expect(fetched!.id).toBe(first!.id);
    });
  }, 120_000);

  it('the (oauthProvider, oauthSubject) unique constraint rejects a raw duplicate insert', async () => {
    await withStore(async (store, pool) => {
      const u = await store.upsertUser({ oauthProvider: 'github', oauthSubject: 'gh-1', displayName: 'Bo', email: null });
      await expect(
        pool.query(
          'INSERT INTO app_user (id, oauth_provider, oauth_subject, display_name, created_at) VALUES ($1, $2, $3, $4, $5)',
          ['other-id', 'github', 'gh-1', 'Dup', Date.now()],
        ),
      ).rejects.toThrow();
      expect(u).not.toBeNull();
    });
  }, 120_000);

  it('creates, looks up, and revokes an AuthSession', async () => {
    await withStore(async (store) => {
      const user = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 's', displayName: 'S', email: null });
      const session = await store.createAuthSession({ userId: user!.id, expiresAt: Date.now() + 100_000 });
      expect(session).not.toBeNull();
      expect(session!.revokedAt).toBeNull();
      expect(session!.id.length).toBeGreaterThan(20); // opaque high-entropy id

      const looked = await store.getAuthSession(session!.id);
      expect(looked!.userId).toBe(user!.id);

      await store.revokeAuthSession(session!.id);
      const afterRevoke = await store.getAuthSession(session!.id);
      expect(afterRevoke!.revokedAt).not.toBeNull();
    });
  }, 120_000);

  it('creates memberships, queries by userId and by (userId, catalogueId), and upserts idempotently', async () => {
    await withStore(async (store, pool) => {
      const user = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 'm', displayName: 'M', email: null });
      const m = await store.upsertMembership({ userId: user!.id, catalogueId: 'kinda-bad', grantedVia: 'key', keyEpoch: 1 });
      expect(m).not.toBeNull();
      expect(m!.grantedVia).toBe('key');
      expect(m!.keyEpoch).toBe(1);

      const byUser = await store.getMembershipsByUser(user!.id);
      expect(byUser.map((x) => x.catalogueId)).toContain('kinda-bad');

      // Re-granting the same (userId, catalogueId) updates in place, no dup row.
      await store.upsertMembership({ userId: user!.id, catalogueId: 'kinda-bad', grantedVia: 'key', keyEpoch: 2 });
      const again = await store.getMembershipsByUser(user!.id);
      expect(again.length).toBe(1);
      expect(again[0].keyEpoch).toBe(2);

      const count = await pool.query('SELECT count(*)::int AS n FROM catalogue_membership');
      expect(count.rows[0].n).toBe(1);
    });
  }, 120_000);
});
