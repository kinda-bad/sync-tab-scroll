import type { CatalogueMembership, OAuthProvider } from '@sync-tab-scroll/shared';
import type { AccountStore } from './accounts/store.js';
import { createAccountStore } from './accounts/factory.js';

/**
 * Ownership-bootstrap (design §12.2; plan Open Question 1 — resolved as a
 * `CatalogueMembership(grantedVia:'owner')` row, no separate `CatalogueOwnership`
 * table in Phase 1). Grants the named account an owner membership for an
 * existing filesystem catalogue (e.g. `kinda-bad`), so the operator's account
 * auto-unlocks it on join with no key entry at all — owner grants are not
 * epoch-gated (membership-unlock.ts).
 *
 * The account must already exist (the person has signed in at least once); the
 * identifier is either an `email` or a `provider:subject` (e.g. `github:4242`).
 * Throws if no matching account is found.
 */
export async function setCatalogueOwner(store: AccountStore, catalogueId: string, identifier: string): Promise<CatalogueMembership> {
  const providerMatch = /^(google|github):(.+)$/.exec(identifier);
  const user = providerMatch
    ? await store.getUserByProviderSubject(providerMatch[1] as OAuthProvider, providerMatch[2])
    : await store.getUserByEmail(identifier);

  if (!user) {
    throw new Error(`No account found for "${identifier}". The person must sign in at least once first (email or provider:subject).`);
  }

  const membership = await store.upsertMembership({ userId: user.id, catalogueId, grantedVia: 'owner', keyEpoch: null });
  if (!membership) {
    throw new Error('Failed to write the owner membership (account store unavailable).');
  }
  return membership;
}

async function main(): Promise<void> {
  const [catalogueId, identifier] = process.argv.slice(2);
  if (!catalogueId || !identifier) {
    console.error('Usage: set-catalogue-owner <catalogue-stable-id> <user-email | provider:subject>');
    console.error('  e.g. set-catalogue-owner kinda-bad op@example.com');
    console.error('       set-catalogue-owner kinda-bad github:4242');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL must be set — the account store is where owner memberships live.');
    process.exit(1);
  }

  const store = createAccountStore(databaseUrl);
  try {
    await store.init();
    const membership = await setCatalogueOwner(store, catalogueId, identifier);
    console.log(`Granted owner membership: user ${membership.userId} now owns catalogue "${catalogueId}" (auto-unlocks with no key).`);
  } finally {
    await store.close();
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
