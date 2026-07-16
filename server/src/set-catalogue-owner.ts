import type { CatalogueMembership, OAuthProvider } from '@sync-tab-scroll/shared';
import type { AccountStore } from './accounts/store.js';
import { createAccountStore } from './accounts/factory.js';

/**
 * Ownership-bootstrap (design §12.2; datamodel.md CatalogueOwnership, Phase 2
 * in-app authoring). Grants the named account a durable `CatalogueOwnership`
 * row for an existing filesystem catalogue (e.g. `kinda-bad`) — there is no
 * in-app path to claim ownership of a catalogue nobody created in-app, so this
 * one-time operator CLI is the only way to backfill ownership of a
 * pre-existing catalogue. Creating the ownership also grants the matching
 * `CatalogueMembership(grantedVia:'owner')` row, so the owner is never locked
 * out of their own catalogue's content and auto-unlocks it on join with no key
 * entry at all — owner grants are not epoch-gated (membership-unlock.ts).
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

  const ownership = await store.createOwnership({ catalogueId, ownerId: user.id });
  if (!ownership) {
    throw new Error('Failed to write the ownership row (account store unavailable).');
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
