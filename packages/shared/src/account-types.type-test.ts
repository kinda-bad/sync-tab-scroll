/**
 * Compile-time type assertions pinning the durable Account Layer shapes
 * (datamodel.md Account Layer) — `User`, `CatalogueMembership`, `AuthSession`
 * (constitution Principle VI, T002). This file is type-checked by
 * `pnpm check` (tsc --noEmit); it emits no runtime behavior. A drift between
 * these shapes and datamodel.md's fields fails the typecheck loudly.
 */
import type { AuthSession, CatalogueMembership, OAuthProvider, User } from './index.js';

// --- exact-shape equality helper -------------------------------------------
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// --- User -------------------------------------------------------------------
type _User = Expect<
  Equal<
    User,
    {
      id: string;
      oauthProvider: OAuthProvider;
      oauthSubject: string;
      displayName: string;
      email: string | null;
      createdAt: number;
    }
  >
>;
type _OAuthProvider = Expect<Equal<OAuthProvider, 'google' | 'github'>>;

// --- CatalogueMembership ----------------------------------------------------
type _Membership = Expect<
  Equal<
    CatalogueMembership,
    {
      id: string;
      userId: string;
      catalogueId: string;
      grantedVia: 'owner' | 'key' | 'invite';
      keyEpoch: number | null;
      grantedAt: number;
    }
  >
>;

// --- AuthSession ------------------------------------------------------------
type _AuthSession = Expect<
  Equal<
    AuthSession,
    {
      id: string;
      userId: string;
      createdAt: number;
      expiresAt: number;
      revokedAt: number | null;
    }
  >
>;

// Value-level pins for the nullable/union fields the task calls out.
const _keyEpochNull: CatalogueMembership['keyEpoch'] = null;
const _keyEpochNum: CatalogueMembership['keyEpoch'] = 1;
const _emailNull: User['email'] = null;
const _revokedNull: AuthSession['revokedAt'] = null;
void _keyEpochNull;
void _keyEpochNum;
void _emailNull;
void _revokedNull;
