-- Account Layer schema (datamodel.md Account Layer + Indexes; constitution
-- v1.5.0). The three durable entities are the ONLY persisted records anywhere;
-- realtime Session/Participant/PlaybackState stay in-memory. Timestamps are
-- bigint epoch-millis to match the datamodel's `number` fields exactly.
--
-- `user` is a reserved word in Postgres, so the User table is `app_user`.

CREATE TABLE IF NOT EXISTS app_user (
  id             text   PRIMARY KEY,
  oauth_provider text   NOT NULL,
  oauth_subject  text   NOT NULL,
  display_name   text   NOT NULL,
  email          text,                      -- nullable: may be absent/unverified
  created_at     bigint NOT NULL
);

-- The login lookup on every OAuth callback; also the "no account linking across
-- providers" guarantee — two rows for the same human on Google vs GitHub.
CREATE UNIQUE INDEX IF NOT EXISTS app_user_provider_subject_uidx
  ON app_user (oauth_provider, oauth_subject);

-- Revocable server-side sessions (§13 S2): the cookie carries only `id`.
CREATE TABLE IF NOT EXISTS auth_session (
  id         text   PRIMARY KEY,
  user_id    text   NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL,
  revoked_at bigint                          -- nullable: set to revoke early
);

-- Cookie → session is the primary lookup (PK id); user_id index serves
-- logout-everywhere / revocation.
CREATE INDEX IF NOT EXISTS auth_session_user_id_idx
  ON auth_session (user_id);

-- The durable form of "this user has unlocked this catalogue". `catalogue_id`
-- is the catalogue's STABLE id as a plain string with NO cross-store FK (§13
-- S8; datamodel.md) — a membership to an unloaded catalogue is inert, never an
-- integrity error. `user_id`, by contrast, IS a real same-store FK.
CREATE TABLE IF NOT EXISTS catalogue_membership (
  id           text    PRIMARY KEY,
  user_id      text    NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  catalogue_id text    NOT NULL,             -- plain stable id, NOT an FK (S8)
  granted_via  text    NOT NULL,             -- 'owner' | 'key' | 'invite'
  key_epoch    integer,                      -- Activation-Key epoch redeemed (S5); null for owner/invite
  granted_at   bigint  NOT NULL,
  UNIQUE (user_id, catalogue_id)             -- one grant per user-catalogue pair
);

-- Fetch a host's memberships to seed/re-derive Session.unlockedCatalogueIds.
CREATE INDEX IF NOT EXISTS catalogue_membership_user_id_idx
  ON catalogue_membership (user_id);
