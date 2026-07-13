import { Pool } from 'pg';
import type { AccountStore } from './store.js';
import { NullAccountStore } from './null-store.js';
import { PgAccountStore } from './pg-store.js';

/**
 * Selects the account-store implementation from configuration (infrastructure.md
 * User Accounts "DB-optional boot"). No `DATABASE_URL` (unset or empty) ⇒ the
 * {@link NullAccountStore}, so the whole account layer self-disables and local
 * dev / CI / tests / self-hosted mode run with no database and no OAuth config
 * (design §2, §12.4). A hard `DATABASE_URL`-at-boot dependency would be a defect
 * against that guarantee.
 *
 * A configured `DATABASE_URL` selects the Postgres-backed store; the caller must
 * `await store.init()` once to apply migrations before serving. Construction is
 * synchronous (`new Pool` doesn't connect until first query), keeping this
 * selector sync.
 */
export function createAccountStore(databaseUrl: string | undefined): AccountStore {
  if (!databaseUrl) return new NullAccountStore();
  return new PgAccountStore(new Pool({ connectionString: databaseUrl }));
}
