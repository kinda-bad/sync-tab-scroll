import { describe, expect, it } from 'vitest';
import { loadMigrations } from './migrate.js';

/**
 * Structural verification of the Account Layer schema (datamodel.md Account
 * Layer + Indexes; §13 S2/S5/S8), DB-free so it always runs. Functional
 * application against a real Postgres — "the migration applies cleanly and the
 * constraints/indexes exist" in the running-DB sense — is exercised by the T005
 * container harness and the T006 pg-store CRUD (duplicate-rejection proves the
 * unique constraints are live). Here we pin that the DDL *declares* the required
 * shape so it can't silently drift from the datamodel.
 */
describe('account-layer migrations (T004)', () => {
  const sql = loadMigrations()
    .map((m) => m.sql)
    .join('\n')
    .toLowerCase();

  it('ships at least one migration', () => {
    expect(loadMigrations().length).toBeGreaterThan(0);
  });

  it('defines the three durable tables (user, catalogue_membership, auth_session)', () => {
    // `user` is a reserved word in Postgres, so the User table is `app_user`.
    expect(sql).toMatch(/create table[^;]*app_user/);
    expect(sql).toMatch(/create table[^;]*catalogue_membership/);
    expect(sql).toMatch(/create table[^;]*auth_session/);
  });

  it('User is unique on (oauth_provider, oauth_subject) — the login key', () => {
    expect(sql).toMatch(/unique[^;]*\(\s*oauth_provider\s*,\s*oauth_subject\s*\)/);
  });

  it('CatalogueMembership carries a key_epoch column and a plain-string catalogue_id with NO cross-store FK', () => {
    expect(sql).toMatch(/key_epoch/);
    // catalogue_id must be declared, and must not reference another table.
    expect(sql).toMatch(/catalogue_id\s+text/);
    expect(sql).not.toMatch(/catalogue_id[^,\n]*references/);
  });

  it('CatalogueMembership is unique on (user_id, catalogue_id) and indexed on user_id', () => {
    expect(sql).toMatch(/unique[^;]*\(\s*user_id\s*,\s*catalogue_id\s*\)/);
    expect(sql).toMatch(/create index[^;]*catalogue_membership[^;]*\(\s*user_id\s*\)/);
  });

  it('AuthSession has a primary key id and an index on user_id', () => {
    expect(sql).toMatch(/id\s+text\s+primary key/);
    expect(sql).toMatch(/create index[^;]*auth_session[^;]*\(\s*user_id\s*\)/);
  });

  it('membership/session user_id ARE real FKs into app_user (same-store integrity)', () => {
    expect(sql).toMatch(/user_id\s+text\s+not null\s+references\s+app_user/);
  });
});

describe('catalogue_ownership migration (T001)', () => {
  const sql = loadMigrations()
    .map((m) => m.sql)
    .join('\n')
    .toLowerCase();

  it('defines the catalogue_ownership table', () => {
    expect(sql).toMatch(/create table[^;]*catalogue_ownership/);
  });

  it('catalogue_id is a plain string with NO cross-store FK (same rule as catalogue_membership)', () => {
    const ownershipBlock = sql.slice(sql.indexOf('create table if not exists catalogue_ownership'));
    const createStatement = ownershipBlock.split(';')[0];
    expect(createStatement).toMatch(/catalogue_id\s+text/);
    expect(createStatement).not.toMatch(/catalogue_id[^,\n]*references/);
  });

  it('owner_id IS a real FK into app_user', () => {
    expect(sql).toMatch(/owner_id\s+text\s+not null\s+references\s+app_user/);
  });

  it('is indexed on owner_id', () => {
    expect(sql).toMatch(/create index[^;]*catalogue_ownership[^;]*\(\s*owner_id\s*\)/);
  });
});
