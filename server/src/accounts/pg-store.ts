import * as crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { AuthSession, CatalogueMembership, CatalogueOwnership, OAuthProvider, User } from '@sync-tab-scroll/shared';
import type { AccountStore, CreateAuthSessionInput, CreateOwnershipInput, UpsertMembershipInput, UpsertUserInput } from './store.js';
import { runMigrations } from './migrate.js';

// pg returns bigint (int8) columns as strings to avoid precision loss; the
// Account Layer's epoch-millis timestamps are all < 2^53, so Number() is safe.
function num(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

interface UserRow {
  id: string;
  oauth_provider: string;
  oauth_subject: string;
  display_name: string;
  email: string | null;
  created_at: string;
}
function toUser(r: UserRow): User {
  return {
    id: r.id,
    oauthProvider: r.oauth_provider as OAuthProvider,
    oauthSubject: r.oauth_subject,
    displayName: r.display_name,
    email: r.email,
    createdAt: num(r.created_at),
  };
}

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}
function toSession(r: SessionRow): AuthSession {
  return {
    id: r.id,
    userId: r.user_id,
    createdAt: num(r.created_at),
    expiresAt: num(r.expires_at),
    revokedAt: r.revoked_at == null ? null : num(r.revoked_at),
  };
}

interface MembershipRow {
  id: string;
  user_id: string;
  catalogue_id: string;
  granted_via: string;
  key_epoch: number | null;
  granted_at: string;
}
function toMembership(r: MembershipRow): CatalogueMembership {
  return {
    id: r.id,
    userId: r.user_id,
    catalogueId: r.catalogue_id,
    grantedVia: r.granted_via as CatalogueMembership['grantedVia'],
    keyEpoch: r.key_epoch,
    grantedAt: num(r.granted_at),
  };
}

interface OwnershipRow {
  id: string;
  catalogue_id: string;
  owner_id: string;
  created_at: string;
}
function toOwnership(r: OwnershipRow): CatalogueOwnership {
  return {
    id: r.id,
    catalogueId: r.catalogue_id,
    ownerId: r.owner_id,
    createdAt: num(r.created_at),
  };
}

/**
 * Postgres-backed {@link AccountStore} (datamodel.md Account Layer). Every
 * method fails soft (§13 S7): a DB error is caught, logged once, and degraded to
 * the same empty/anonymous shape the null store returns — so a mid-run DB
 * failure never crashes the server or breaks the anonymous path; it just means
 * "logged-out / no persisted membership" for the duration.
 */
export class PgAccountStore implements AccountStore {
  readonly enabled = true;

  constructor(private readonly pool: Pool) {}

  /** Applies the Account Layer migrations. Called once at boot (factory). */
  async init(): Promise<void> {
    await runMigrations(this.pool);
  }

  private async guard<T>(label: string, fallback: T, op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (err) {
      console.error(`[account-store] ${label} failed (degrading to anonymous):`, err instanceof Error ? err.message : err);
      return fallback;
    }
  }

  async upsertUser(input: UpsertUserInput): Promise<User | null> {
    return this.guard('upsertUser', null, async () => {
      const { rows } = await this.pool.query<UserRow>(
        `INSERT INTO app_user (id, oauth_provider, oauth_subject, display_name, email, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (oauth_provider, oauth_subject)
         DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email
         RETURNING *`,
        [crypto.randomUUID(), input.oauthProvider, input.oauthSubject, input.displayName, input.email, Date.now()],
      );
      return rows[0] ? toUser(rows[0]) : null;
    });
  }

  async getUser(id: string): Promise<User | null> {
    return this.guard('getUser', null, async () => {
      const { rows } = await this.pool.query<UserRow>('SELECT * FROM app_user WHERE id = $1', [id]);
      return rows[0] ? toUser(rows[0]) : null;
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.guard('getUserByEmail', null, async () => {
      const { rows } = await this.pool.query<UserRow>('SELECT * FROM app_user WHERE email = $1 ORDER BY created_at LIMIT 1', [email]);
      return rows[0] ? toUser(rows[0]) : null;
    });
  }

  async getUserByProviderSubject(oauthProvider: OAuthProvider, oauthSubject: string): Promise<User | null> {
    return this.guard('getUserByProviderSubject', null, async () => {
      const { rows } = await this.pool.query<UserRow>(
        'SELECT * FROM app_user WHERE oauth_provider = $1 AND oauth_subject = $2',
        [oauthProvider, oauthSubject],
      );
      return rows[0] ? toUser(rows[0]) : null;
    });
  }

  async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession | null> {
    return this.guard('createAuthSession', null, async () => {
      const id = crypto.randomBytes(32).toString('base64url'); // opaque, high-entropy
      const { rows } = await this.pool.query<SessionRow>(
        `INSERT INTO auth_session (id, user_id, created_at, expires_at, revoked_at)
         VALUES ($1, $2, $3, $4, NULL)
         RETURNING *`,
        [id, input.userId, Date.now(), input.expiresAt],
      );
      return rows[0] ? toSession(rows[0]) : null;
    });
  }

  async getAuthSession(id: string): Promise<AuthSession | null> {
    return this.guard('getAuthSession', null, async () => {
      const { rows } = await this.pool.query<SessionRow>('SELECT * FROM auth_session WHERE id = $1', [id]);
      return rows[0] ? toSession(rows[0]) : null;
    });
  }

  async revokeAuthSession(id: string): Promise<void> {
    await this.guard('revokeAuthSession', undefined, async () => {
      await this.pool.query('UPDATE auth_session SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL', [id, Date.now()]);
    });
  }

  async upsertMembership(input: UpsertMembershipInput): Promise<CatalogueMembership | null> {
    return this.guard('upsertMembership', null, async () => {
      const { rows } = await this.pool.query<MembershipRow>(
        `INSERT INTO catalogue_membership (id, user_id, catalogue_id, granted_via, key_epoch, granted_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, catalogue_id)
         DO UPDATE SET granted_via = EXCLUDED.granted_via, key_epoch = EXCLUDED.key_epoch, granted_at = EXCLUDED.granted_at
         RETURNING *`,
        [crypto.randomUUID(), input.userId, input.catalogueId, input.grantedVia, input.keyEpoch, Date.now()],
      );
      return rows[0] ? toMembership(rows[0]) : null;
    });
  }

  async getMembershipsByUser(userId: string): Promise<CatalogueMembership[]> {
    return this.guard('getMembershipsByUser', [], async () => {
      const { rows } = await this.pool.query<MembershipRow>('SELECT * FROM catalogue_membership WHERE user_id = $1', [userId]);
      return rows.map(toMembership);
    });
  }

  async createOwnership(input: CreateOwnershipInput): Promise<CatalogueOwnership | null> {
    return this.guard('createOwnership', null, async () => {
      const { rows } = await this.pool.query<OwnershipRow>(
        `INSERT INTO catalogue_ownership (id, catalogue_id, owner_id, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (catalogue_id, owner_id) DO UPDATE SET catalogue_id = EXCLUDED.catalogue_id
         RETURNING *`,
        [crypto.randomUUID(), input.catalogueId, input.ownerId, Date.now()],
      );
      return rows[0] ? toOwnership(rows[0]) : null;
    });
  }

  async getOwnershipsByOwner(ownerId: string): Promise<CatalogueOwnership[]> {
    return this.guard('getOwnershipsByOwner', [], async () => {
      const { rows } = await this.pool.query<OwnershipRow>('SELECT * FROM catalogue_ownership WHERE owner_id = $1', [ownerId]);
      return rows.map(toOwnership);
    });
  }

  async isOwner(catalogueId: string, ownerId: string): Promise<boolean> {
    return this.guard('isOwner', false, async () => {
      const { rows } = await this.pool.query(
        'SELECT 1 FROM catalogue_ownership WHERE catalogue_id = $1 AND owner_id = $2 LIMIT 1',
        [catalogueId, ownerId],
      );
      return rows.length > 0;
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
