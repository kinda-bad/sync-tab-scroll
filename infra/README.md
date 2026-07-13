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

## Account layer: out-of-band Postgres + sealed secrets (operator runbook)

The optional account layer (constitution v1.5.0; infrastructure.md "User
Accounts") is deliberately **not fully Terraform-managed** (design §12.4): the
community provider has no database resource, and Terraform's `sensitive = true`
does *not* keep values out of `tfstate`. So the Postgres service and every
secret are provisioned **out of band**, and Terraform manages only topology +
the non-secret `DATABASE_URL` reference variable. These steps are operator-run
against live Railway and 1Password — they are not automated here.

### 1. Create the Postgres service by hand (T019)

In the Railway dashboard, add a **Postgres** database to the project (name it
exactly `Postgres` — `main.tf`'s `DATABASE_URL` reference depends on that name).

### 2. Let Terraform wire `DATABASE_URL` as a reference variable (T019)

`main.tf` already sets `DATABASE_URL = "$${{Postgres.DATABASE_URL}}"` (the
`$${{…}}` escaping emits the literal `${{Postgres.DATABASE_URL}}` for Railway to
resolve at deploy — only the reference string, never the real DSN, lands in
`tfstate`). On the **first** `terraform apply`, verify in the dashboard that the
app service's `DATABASE_URL` shows the reference resolving to the Postgres DSN.
If the provider didn't write it verbatim, set that one variable by hand in the
dashboard (`DATABASE_URL = ${{Postgres.DATABASE_URL}}`) — the fallback design
§12.4 anticipates.

The project has `lifecycle { prevent_destroy = true }` so a project-level
`terraform destroy` fails loudly rather than orphaning the hand-created Postgres
service Terraform can't see.

### 3. Push OAuth + session secrets as sealed Railway vars (T020)

Never put these in `.tfvars` or `tfstate`. Push them straight from 1Password to
Railway as **sealed** variables (creds already in the 1Password
`sync-tab-scroll` vault):

```sh
railway variables --set "GOOGLE_OAUTH_CLIENT_ID=$(op read op://sync-tab-scroll/google_oauth/username)"
railway variables --set "GOOGLE_OAUTH_CLIENT_SECRET=$(op read op://sync-tab-scroll/google_oauth/password)"
railway variables --set "GITHUB_OAUTH_CLIENT_ID=$(op read op://sync-tab-scroll/gh_oauth_prod/username)"
railway variables --set "GITHUB_OAUTH_CLIENT_SECRET=$(op read op://sync-tab-scroll/gh_oauth_prod/password)"
railway variables --set "SESSION_COOKIE_SECRET=$(op read op://sync-tab-scroll/session_cookie_secret/password)"
railway variables --set "PUBLIC_BASE_URL=https://sync-tab-scroll.up.railway.app"
```

(Exact 1Password item/field paths per the project's OAuth-credentials memory;
`SESSION_COOKIE_SECRET` is a long random string — generate once and store it in
the vault.) Also register the production OAuth redirect URIs with each provider:
`https://sync-tab-scroll.up.railway.app/auth/google/callback` and
`…/auth/github/callback`.

### 4. Verify (T020)

- Sign in end-to-end with Google and GitHub at
  `https://sync-tab-scroll.up.railway.app`; confirm `/me` returns the user and a
  key-unlock persists (re-join without re-typing the key).
- Confirm the anonymous path still serves if the DB reference fails to resolve
  (the account layer self-disables — infrastructure.md — rather than breaking
  create/join/play).

Sealed variables **do not** propagate to a duplicated Railway environment
(design §12.4 / Production Annotations) — re-run step 3 for any new environment.
