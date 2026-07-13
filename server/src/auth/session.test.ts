import { describe, expect, it } from 'vitest';
import type { AuthSession, User } from '@sync-tab-scroll/shared';
import { NullAccountStore } from '../accounts/null-store.js';
import type { AccountStore } from '../accounts/store.js';
import { resolveUserIdFromCookie } from './session.js';

const USER: User = { id: 'user-1', oauthProvider: 'google', oauthSubject: 's', displayName: 'A', email: null, createdAt: 0 };

/** A store stub that returns a fixed session/user, for the resolution seam. */
function stubStore(session: AuthSession | null, user: User | null): AccountStore {
  const s = new NullAccountStore() as unknown as AccountStore & { enabled: boolean };
  return {
    ...s,
    enabled: true,
    getAuthSession: async () => session,
    getUser: async () => user,
  };
}

/** A store whose reads throw — simulates a mid-run DB failure (§13 S7). */
function throwingStore(): AccountStore {
  const s = new NullAccountStore() as unknown as AccountStore;
  return {
    ...s,
    enabled: true,
    getAuthSession: async () => {
      throw new Error('DB down');
    },
  };
}

describe('resolveUserIdFromCookie — the single cookie→session→userId seam (T011)', () => {
  it('returns the userId for a valid, unexpired, unrevoked session', async () => {
    const session: AuthSession = { id: 'sid', userId: 'user-1', createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: null };
    const id = await resolveUserIdFromCookie(stubStore(session, USER), 'sts_session=sid');
    expect(id).toBe('user-1');
  });

  it('returns null for a revoked session', async () => {
    const session: AuthSession = { id: 'sid', userId: 'user-1', createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: Date.now() };
    expect(await resolveUserIdFromCookie(stubStore(session, USER), 'sts_session=sid')).toBeNull();
  });

  it('returns null for an expired session', async () => {
    const session: AuthSession = { id: 'sid', userId: 'user-1', createdAt: 0, expiresAt: Date.now() - 1, revokedAt: null };
    expect(await resolveUserIdFromCookie(stubStore(session, USER), 'sts_session=sid')).toBeNull();
  });

  it('returns null when there is no session cookie', async () => {
    expect(await resolveUserIdFromCookie(stubStore(null, null), undefined)).toBeNull();
    expect(await resolveUserIdFromCookie(stubStore(null, null), 'other=1')).toBeNull();
  });

  it('returns null (no throw) when the store errors mid-run — fail soft to anonymous', async () => {
    await expect(resolveUserIdFromCookie(throwingStore(), 'sts_session=sid')).resolves.toBeNull();
  });
});
