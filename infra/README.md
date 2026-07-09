# infra

Terraform config for this project's Railway deployment. See the root
`README.md`'s "Deploying to Railway" section for the actual setup steps,
and `.project/artifacts/infrastructure.md`'s "Deployment (Railway +
Terraform)" section for the full design and rationale — this file only
covers the two tradeoffs specific to this Terraform config itself.

## Provider choice

Uses the community-maintained
[`terraform-community-providers/railway`](https://registry.terraform.io/providers/terraform-community-providers/railway)
provider. Railway has no first-party official Terraform provider as of
this writing. This is an accepted, deliberately flagged dependency risk,
not a silent assumption: it's third-party-maintained, and its resource
coverage is worth rechecking against
[the provider's docs](https://registry.terraform.io/providers/terraform-community-providers/railway/latest/docs)
before assuming a new resource type exists (for example, this provider has
no standalone `volume` resource — a service's volume is a nested
attribute of `railway_service` instead, which `main.tf` uses accordingly).
Revisit this choice if Railway ships an official provider, or if this one
goes unmaintained.

## State

Local state (`terraform.tfstate`, gitignored) — no remote backend (e.g.
Terraform Cloud) is configured. This matches the project's existing
single-operator/self-hosted posture elsewhere (no auth, no rate limiting,
fixed-interval reconnect over exponential backoff): one operator, one
deployment, nothing to coordinate across. `.terraform.lock.hcl` *is*
committed, per Terraform's own convention — only the mutable state and
provider cache (`.terraform/`) are gitignored.

Revisit local state only if multiple operators ever need to collaborate
on the same infrastructure — that's a real operational surface (a remote
backend account, state locking, credentials) this project doesn't need
yet.
