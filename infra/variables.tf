variable "project_name" {
  description = "Name of the Railway project."
  type        = string
  default     = "sync-tab-scroll"
}

variable "source_repo" {
  description = "GitHub repo (owner/name) Railway builds the service from — its committed Dockerfile is auto-detected and used."
  type        = string
  default     = "kinda-bad/sync-tab-scroll"
}

variable "source_repo_branch" {
  description = "Branch Railway deploys from."
  type        = string
  default     = "main"
}

variable "catalog_volume_mount_path" {
  description = "Where the catalog volume is mounted in the container — matches the service's CATALOG_ROOT env var (single source of truth: catalog_root local, below)."
  type        = string
  default     = "/data/catalog"
}

variable "host_reassign_grace_ms" {
  description = "Overrides the documented default (2 minutes, infrastructure.md Host Succession) only if set — an empty string leaves the service's own built-in default in effect, since this var is deliberately not passed to railway_variable at all in that case (see main.tf)."
  type        = string
  default     = ""
}
