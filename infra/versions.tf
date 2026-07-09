# Terraform config for the Railway deployment target (infrastructure.md
# "Deployment (Railway + Terraform)"). State is local (terraform.tfstate,
# gitignored) — single-operator/self-hosted posture, no remote backend, per
# that section's reasoning. Intentionally no `backend` block: Terraform
# defaults to local state when none is configured.

terraform {
  required_version = ">= 1.5"

  required_providers {
    # Community-maintained, not Railway-official (infrastructure.md's
    # Deployment section documents this as an accepted, flagged risk, not a
    # silent assumption) — https://registry.terraform.io/providers/terraform-community-providers/railway
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.6"
    }
  }
}

# Reads the Railway API token from the RAILWAY_TOKEN environment variable —
# never stored in this repo or in a .tfvars file, matching this project's
# existing no-committed-secrets posture (constitution Principle VIII, even
# though that principle's .env convention itself governs local dev/CI only,
# not this deployed-service config — infrastructure.md's "Config split").
provider "railway" {}
