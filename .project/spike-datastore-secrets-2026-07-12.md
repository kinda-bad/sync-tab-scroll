# Spike: datastore + secrets architecture (2026-07-12)

Time-boxed feasibility spike, investigation only — nothing provisioned or
applied. De-risks Postgres + OAuth secrets handling before artifact design.

Constraints honored throughout:
1. Server must boot with no DB configured (auth routes self-disable).
2. No encrypted tfstate; secrets must stay **out of state entirely**.

Legend: **[verified]** = checked against the provider's real schema, the
repo, or current vendor docs. **[inferred]** = reasonable conclusion not
directly exercised (no plan/apply was allowed).

---

## 1. Can the Railway Terraform provider provision Postgres?

**No.** `terraform providers schema -json` against the installed provider
(v0.6.2, `terraform-community-providers/railway ~> 0.6`) lists exactly
these resources — **[verified]**:

```
railway_custom_domain, railway_environment, railway_project,
railway_service, railway_service_domain, railway_shared_variable,
railway_tcp_proxy, railway_variable, railway_variable_collection
```

There is no database, plugin, or template resource, and no data sources at
all. Railway's managed Postgres is deployed from a **template** (image +
volume + generated credentials), and the provider has no template support.

Two ways to get Postgres on Railway:

- **Out-of-band (recommended):** create the Postgres service in the Railway
  dashboard/CLI inside the same project. Terraform never knows it exists;
  `terraform plan` won't touch it (Terraform only reconciles resources in
  its own state — unmanaged services in the project are invisible to it).
  **[verified mechanism, inferred for this project]**
- **DIY via `railway_service.source_image`** (e.g. `postgres:16` +
  `volume`): technically possible **[verified the schema supports it]**,
  but then Terraform must set `POSTGRES_PASSWORD`, which lands in plaintext
  tfstate — Terraform's `sensitive` flag only redacts CLI output; state
  still stores the literal value. **Rejected**: violates constraint 2, and
  you also lose Railway's managed-Postgres backups/tooling.

### Referencing DATABASE_URL without the secret entering state

Railway **reference variables** solve this **[verified against Railway
docs]**: a variable on the app service with value
`${{Postgres.DATABASE_URL}}` is resolved by Railway at deploy time. If
Terraform manages that variable (`railway_variable`), tfstate contains only
the literal reference string, never the credential. **[inferred:** the
provider passes the value through verbatim — same API path the dashboard
uses; confirm with one manual test at implementation time. Fallback if it
ever misbehaves: set the reference variable in the dashboard instead and
keep it out of Terraform entirely.]

Railway also offers **sealed variables** (never visible in UI/API after
sealing) for defense-in-depth on the OAuth secrets. **[verified]** Caveat:
sealed variables aren't copied to duplicated/PR environments and can't be
un-sealed.

## 2. Keeping OAuth secrets and DB creds out of tfstate

Rule: **Terraform manages topology and non-secret config only. Every
secret is set out-of-band on Railway and never appears in `.tf` files,
tfvars, or state.**

| Value | Where it lives | Who sets it | In tfstate? |
|---|---|---|---|
| `DATABASE_URL` | Railway-generated on the Postgres service | Railway template | No — app service gets `${{Postgres.DATABASE_URL}}` reference (that string may be in state; it's not a secret) |
| `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` | Railway variable | Dashboard/CLI (not secret, but simplest to co-locate) | No |
| `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_SECRET` | Railway **sealed** variable | Dashboard/CLI, sourced from 1Password | No |
| Session-cookie signing secret | Railway sealed variable | Dashboard/CLI, sourced from 1Password | No |
| `RAILWAY_TOKEN` (TF auth) | env var at `terraform` invocation (already the pattern) | Operator, from 1Password | No |

Concrete out-of-band flow (single-operator friendly): store canonical
copies in 1Password; push to Railway with the CLI so nothing hits disk:

```
railway variables --service app \
  --set "GOOGLE_CLIENT_SECRET=$(op read 'op://vault/google-oauth/client-secret')"
```

then seal it in the dashboard. Local dev keeps using `.env` (existing
constitution Principle VIII posture); with no `DATABASE_URL`/client
secrets present, the server boots with auth disabled (constraint 1 — a
server-code concern, unaffected by any of this).

Anti-pattern to avoid: `railway_variable` resources whose `value` comes
from a TF variable holding a secret — `sensitive = true` does **not** keep
it out of state.

## 3. Supabase as Postgres + Auth substrate

**Feasibility — [verified from Supabase docs]:** Supabase Auth now uses
asymmetric JWT signing keys with a public JWKS endpoint
(`/.well-known/jwks.json`); a plain Node server can verify access tokens
locally (e.g. `jose` + `createRemoteJWKSet`) with no network call per
connection and no shared JWT secret on the server. So yes, a non-framework
Node + `ws` server *can* authenticate Supabase sessions on the WS upgrade.

**But the fit is poor for this app's specific requirement** (HTTP-only
cookie → WS upgrade):

- Supabase's OAuth flow is client-driven (`supabase-js` in the browser);
  its default token storage is `localStorage`, and even `@supabase/ssr`
  uses **JS-readable cookies** (the browser client must read them). Getting
  the token into an **HTTP-only** cookie means hand-writing a
  token-relay endpoint plus server-side refresh handling for Supabase's
  ~1-hour access tokens — you end up hand-rolling the session layer
  anyway, just around someone else's tokens. **[verified defaults;
  refresh-burden inferred]**
- It adds a second external dependency/dashboard (Supabase org, key
  rotation, pause-on-inactivity on the free tier) for an app that already
  has Railway.
- Its secrets story is equivalent, not better: `SUPABASE_URL` + publishable
  key aren't secrets; the DB URL / secret key would still be set as
  out-of-band Railway variables. Nothing Supabase would be
  Terraform-managed (there is a Supabase TF provider, but using it
  reintroduces the secrets-in-state problem).
- What it *would* save — the OAuth dance and user table — is small: with a
  vetted minimal library (e.g. `arctic` or `openid-client`), Google+GitHub
  code-flow + a signed HTTP-only session cookie is a few hundred lines on
  the existing shared `http.Server` (`server/src/server.ts` already routes
  HTTP and WS upgrade through one `http.createServer` — the cookie is
  right there on the upgrade request's headers).

**Verdict: skip Supabase.** For a framework-based app wanting hosted auth
UI it shines; for a plain Node+ws server that specifically wants HTTP-only
cookie sessions, it makes the auth *harder* to do correctly while adding a
dependency. Adopt it later only if the project ever wants Supabase-specific
features (RLS-from-the-browser, realtime, hosted auth pages).

## 4. Recommended architecture

```
Railway project "sync-tab-scroll"
├─ app service            ← Terraform-managed (existing railway_service)
│   ├─ non-secret vars    ← Terraform (railway_variable, as today)
│   ├─ DATABASE_URL = ${{Postgres.DATABASE_URL}}   ← reference, no secret in state
│   └─ OAuth client secrets, session signing key   ← dashboard/CLI (sealed), from 1Password
└─ Postgres service       ← created ONCE in dashboard (template); NOT in Terraform
```

- **Postgres host:** Railway managed Postgres, created out-of-band in the
  dashboard, unmanaged by Terraform (document this in infrastructure.md as
  a deliberate unmanaged resource, like the volume's contents).
- **DATABASE_URL delivery:** Railway reference variable
  `${{Postgres.DATABASE_URL}}` on the app service — either as one more
  `railway_variable` in `infra/main.tf` (state holds only the reference
  string) or set in the dashboard; prefer Terraform for visibility since
  the value isn't secret.
- **Auth:** hand-rolled server-side OAuth (Google + GitHub) via a small
  vetted library on the existing `http.Server`; signed HTTP-only session
  cookie; WS upgrade reads/validates the cookie from the upgrade request.
  Auth routes register only when `DATABASE_URL` + client IDs/secrets are
  configured (constraint 1).
- **Secret homes:** 1Password = canonical store; Railway sealed variables =
  runtime delivery; `.env` (gitignored) = local dev; Terraform = zero
  secrets.
- **Terraform manages:** project, app service, domain, volume, non-secret
  vars, the DATABASE_URL *reference*. **Out-of-band:** Postgres service,
  all secret values, OAuth app registration at Google/GitHub.

## Blockers / risks

- **No hard blocker.** The one unexercised step: confirm the provider
  writes the `${{Postgres.DATABASE_URL}}` value verbatim (one throwaway
  variable on first apply). If it mangles it, set the reference in the
  dashboard instead — architecture unchanged.
- The Postgres service is invisible to Terraform: deleting/recreating the
  Railway *project* via Terraform would orphan/destroy it. Note this in
  infrastructure.md; back up before any project-level TF surgery.
- Community provider risk (already documented in `infra/README.md`)
  unchanged; v0.6.2 released 2026-04, repo active.
- Sealed variables don't copy to duplicated environments — re-set secrets
  if a second Railway environment is ever created.
