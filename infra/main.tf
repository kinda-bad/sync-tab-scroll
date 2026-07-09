# Single Railway service running the repo's Dockerfile (infrastructure.md
# "Deployment (Railway + Terraform)" — one process serves the client SPA,
# the catalog, and the WS upgrade on one port). No separate static-hosting
# service.

resource "railway_project" "app" {
  name = var.project_name
}

resource "railway_service" "app" {
  name       = "app"
  project_id = railway_project.app.id

  source_repo        = var.source_repo
  source_repo_branch = var.source_repo_branch

  # Railway volume for catalog content (infrastructure.md — provisioned
  # empty; populating it stays the operator's job, same operator-driven
  # model pipeline.md already documents for local catalogs). A nested
  # attribute of railway_service in this provider, not a standalone
  # resource type.
  volume = {
    name       = "catalog"
    mount_path = var.catalog_volume_mount_path
  }
}

locals {
  # CATALOG_ROOT is derived from the volume's own mount path — one source
  # of truth, not two independently-typed values that could drift.
  catalog_root = var.catalog_volume_mount_path

  # Always-set service env vars. REQUIRE_SONG_CONSENT=true here is the
  # deployed default (infrastructure.md's Deployment section) — distinct
  # from server/.env.example's local `false` default, per that section's
  # Config split note; the two are allowed to differ.
  base_variables = {
    CATALOG_ROOT         = local.catalog_root
    REQUIRE_SONG_CONSENT = "true"
  }

  # HOST_REASSIGN_GRACE_MS is only set here if the operator overrode the
  # default via var.host_reassign_grace_ms — left unset otherwise, so the
  # service's own built-in default (server/src/config.ts) applies rather
  # than this config re-stating it as a duplicated literal.
  override_variables = var.host_reassign_grace_ms != "" ? {
    HOST_REASSIGN_GRACE_MS = var.host_reassign_grace_ms
  } : {}

  service_variables = merge(local.base_variables, local.override_variables)
}

resource "railway_variable" "app" {
  for_each = local.service_variables

  name           = each.key
  value          = each.value
  environment_id = railway_project.app.default_environment.id
  service_id     = railway_service.app.id
}

# The Railway-provided *.up.railway.app subdomain — sufficient for this
# deployment (infrastructure.md [OPEN: custom domain] defers an actual
# custom domain, not this one).
resource "railway_service_domain" "app" {
  subdomain      = var.project_name
  environment_id = railway_project.app.default_environment.id
  service_id     = railway_service.app.id
}
