import type { AuthSession, CatalogueMembership, OAuthProvider, User } from '@sync-tab-scroll/shared';
import type { AccountStore, CreateAuthSessionInput, UpsertMembershipInput, UpsertUserInput } from './store.js';

/**
 * The absent/no-database implementation of {@link AccountStore}, selected when
 * `DATABASE_URL` is unset (factory.ts). Every read returns empty/anonymous and
 * every write is an inert no-op, so the entire account layer self-disables and
 * the anonymous path runs exactly as before accounts existed (infrastructure.md
 * User Accounts; design §2). This is the seam that makes the DB-optional
 * guarantee fall out of normal code paths — callers never branch on "is there a
 * DB", they just get anonymous results.
 */
export class NullAccountStore implements AccountStore {
  readonly enabled = false;

  async init(): Promise<void> {
    // no-op — nothing to migrate when there's no database
  }

  async upsertUser(_input: UpsertUserInput): Promise<User | null> {
    return null;
  }

  async getUser(_id: string): Promise<User | null> {
    return null;
  }

  async getUserByEmail(_email: string): Promise<User | null> {
    return null;
  }

  async getUserByProviderSubject(_oauthProvider: OAuthProvider, _oauthSubject: string): Promise<User | null> {
    return null;
  }

  async createAuthSession(_input: CreateAuthSessionInput): Promise<AuthSession | null> {
    return null;
  }

  async getAuthSession(_id: string): Promise<AuthSession | null> {
    return null;
  }

  async revokeAuthSession(_id: string): Promise<void> {
    // no-op
  }

  async upsertMembership(_input: UpsertMembershipInput): Promise<CatalogueMembership | null> {
    return null;
  }

  async getMembershipsByUser(_userId: string): Promise<CatalogueMembership[]> {
    return [];
  }

  async close(): Promise<void> {
    // no-op
  }
}
