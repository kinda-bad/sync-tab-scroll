-- CatalogueOwnership (Phase 2 in-app authoring; datamodel.md CatalogueOwnership).
-- The durable form of "this user owns/can edit this catalogue" — kept as its own
-- table rather than a field on Catalogue, since Catalogue is not a durable
-- entity (filesystem-derived). `catalogue_id` follows the same no-cross-store-FK
-- rule as `catalogue_membership.catalogue_id`; `owner_id` IS a real same-store FK.

CREATE TABLE IF NOT EXISTS catalogue_ownership (
  id           text   PRIMARY KEY,
  catalogue_id text   NOT NULL,             -- plain stable id, NOT an FK (S8)
  owner_id     text   NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  created_at   bigint NOT NULL,
  UNIQUE (catalogue_id, owner_id)           -- idempotent create per catalogue-owner pair
);

-- "Does this user own catalogue X" cheaply on every `catalog` message build,
-- and an owner's own catalogue list (datamodel.md Indexes).
CREATE INDEX IF NOT EXISTS catalogue_ownership_owner_id_idx
  ON catalogue_ownership (owner_id);
