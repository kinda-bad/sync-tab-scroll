import type { AccountStore } from './store.js';
import { NullAccountStore } from './null-store.js';

/**
 * Selects the account-store implementation from configuration (infrastructure.md
 * User Accounts "DB-optional boot"). No `DATABASE_URL` (unset or empty) ⇒ the
 * {@link NullAccountStore}, so the whole account layer self-disables and local
 * dev / CI / tests / self-hosted mode run with no database and no OAuth config
 * (design §2, §12.4). A hard `DATABASE_URL`-at-boot dependency would be a defect
 * against that guarantee.
 *
 * The Postgres-backed branch is wired in T006 (against the T004 schema and the
 * T005 container harness); until then a configured `DATABASE_URL` fails loudly
 * rather than silently disabling accounts.
 */
export function createAccountStore(databaseUrl: string | undefined): AccountStore {
  if (!databaseUrl) return new NullAccountStore();
  throw new Error(
    'DATABASE_URL is set but the Postgres account store is not yet wired (T006). Unset DATABASE_URL to run with accounts disabled.',
  );
}
