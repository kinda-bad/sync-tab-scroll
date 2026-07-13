import type { AuthSession, CatalogueMembership, OAuthProvider, User } from '@sync-tab-scroll/shared';

/**
 * Input for upserting a `User` by its unique `(oauthProvider, oauthSubject)`
 * login key (datamodel.md User). The server-generated `id`/`createdAt` are the
 * store's concern, not the caller's.
 */
export interface UpsertUserInput {
  oauthProvider: OAuthProvider;
  oauthSubject: string;
  displayName: string;
  email: string | null;
}

/** Input for creating an `AuthSession` (datamodel.md AuthSession). */
export interface CreateAuthSessionInput {
  userId: string;
  expiresAt: number;
}

/**
 * Input for upserting a `CatalogueMembership` (datamodel.md CatalogueMembership).
 * Unique per `(userId, catalogueId)`; a re-grant updates `grantedVia`/`keyEpoch`.
 */
export interface UpsertMembershipInput {
  userId: string;
  catalogueId: string;
  grantedVia: CatalogueMembership['grantedVia'];
  keyEpoch: number | null;
}

/**
 * The durable-account repository seam (design Technical Approach; plan Open
 * Question 2 — resolved as a single `AccountStore` facade rather than three
 * repos, so DB-optional selection happens at one factory point). Two
 * implementations exist: {@link NullAccountStore} (no `DATABASE_URL` — every
 * read is empty/anonymous, every write a no-op, `enabled === false`) and the
 * Postgres-backed store. This seam is what makes the DB-optional guarantee
 * (infrastructure.md User Accounts) and the mid-run fail-soft contract (§13 S7)
 * fall out of normal code paths instead of scattered `if (db)` guards: the
 * Postgres store catches its own errors and degrades to the same
 * empty/anonymous shape the null store returns.
 *
 * All methods are async (the Postgres store is I/O-bound); the null store
 * resolves synchronously-shaped defaults.
 */
export interface AccountStore {
  /** `false` for the null/absent store — auth routes are inert and `/me` is always anonymous. */
  readonly enabled: boolean;

  /** Upsert by `(oauthProvider, oauthSubject)`, returning the durable `User` (or null when unavailable). */
  upsertUser(input: UpsertUserInput): Promise<User | null>;
  /** Look up a `User` by id (null when absent/unavailable). */
  getUser(id: string): Promise<User | null>;

  /** Create a revocable `AuthSession` (null when unavailable). */
  createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession | null>;
  /** Resolve a cookie's opaque id → `AuthSession`; null when absent/unavailable. Callers reject expired/`revokedAt`. */
  getAuthSession(id: string): Promise<AuthSession | null>;
  /** Set `revokedAt` on a session (logout / logout-everywhere). Best-effort; never throws. */
  revokeAuthSession(id: string): Promise<void>;

  /** Upsert a `CatalogueMembership` by `(userId, catalogueId)` (null when unavailable). Best-effort at call sites (§13 S7). */
  upsertMembership(input: UpsertMembershipInput): Promise<CatalogueMembership | null>;
  /** Fetch a user's memberships to seed/re-derive `Session.unlockedCatalogueIds`; empty when absent/unavailable. */
  getMembershipsByUser(userId: string): Promise<CatalogueMembership[]>;

  /** Release any underlying resources (connection pool). No-op for the null store. */
  close(): Promise<void>;
}
