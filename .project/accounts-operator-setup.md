# Accounts — Operator Setup Runbook

_For the user-accounts feature (constitution v1.5.0). These are the manual,
out-of-band steps the code can't do for you — registering OAuth apps, creating
the Postgres store, and wiring secrets. Design of record:
`design-user-accounts-2026-07-12.reviewed.md`; datastore/secrets rationale:
`spike-datastore-secrets-2026-07-12.md`._

> **Timing:** Steps 1–2 (OAuth apps) and 4 (Postgres) can be done now. Steps
> 3, 5–7 (env var names, callback paths) are **proposed** and get finalized
> when `/ardd-plan` Phase 1 pins the exact code — treat the names below as the
> intended shape, confirm against the plan before relying on them. Nothing here
> is required until Phase 1 is actually implemented; the app runs fine today
> with no DB and no accounts.

Assumed constants (adjust if they change):

- Prod URL: `https://sync-tab-scroll.up.railway.app`
- Dev URL: `http://localhost:6080`
- OAuth callback path (per design): `/auth/<provider>/callback`
- 1Password vault: `sync-tab-scroll`

---

## 1. Register the GitHub OAuth app

1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**
   (or register it under the `kinda-bad` org: Org **Settings → Developer settings
   → OAuth Apps** if you want it org-owned).
2. Fill in:
   - **Application name:** `sync-tab-scroll`
   - **Homepage URL:** `https://sync-tab-scroll.up.railway.app`
   - **Authorization callback URL:** `https://sync-tab-scroll.up.railway.app/auth/github/callback`
3. Create it, then **note the Client ID** and **generate a new Client Secret**
   (copy it now — GitHub shows it once).
4. **Add a second callback for local dev:** in the app's settings, GitHub allows
   only one callback per app, so either add `http://localhost:6080/auth/github/callback`
   as the callback on a **separate "sync-tab-scroll (dev)" OAuth app**, or switch
   the callback when developing. (A separate dev app is cleaner.)

## 2. Register the Google OAuth client

1. Go to **https://console.cloud.google.com/** → create/select a project (e.g.
   `sync-tab-scroll`).
2. **APIs & Services → OAuth consent screen** → configure it (External; app name;
   support email; add your Google account as a **test user** while it's unverified).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - **Application type:** Web application
   - **Authorized redirect URIs:** add both
     - `https://sync-tab-scroll.up.railway.app/auth/google/callback`
     - `http://localhost:6080/auth/google/callback`
4. Create it, then **note the Client ID** and **Client Secret**.

## 3. Generate a session-signing secret

The server signs/derives its opaque `AuthSession` cookie handling from a secret.
Generate a strong random one:

```sh
openssl rand -base64 48
```

Keep the output for step 5. (Exact env var name — proposed `SESSION_SECRET` —
confirmed at Phase 1.)

## 4. Store all secrets in 1Password

Create items in the **`sync-tab-scroll`** vault so the canonical copies live
there (never in the repo or tfstate):

```sh
# GitHub OAuth
op item create --category "API Credential" --vault sync-tab-scroll \
  --title "github-oauth-sync-tab-scroll" \
  "client_id=<github client id>" "client_secret=<github client secret>"

# Google OAuth
op item create --category "API Credential" --vault sync-tab-scroll \
  --title "google-oauth-sync-tab-scroll" \
  "client_id=<google client id>" "client_secret=<google client secret>"

# Session secret
op item create --category Password --vault sync-tab-scroll \
  --title "sync-tab-scroll-session-secret" \
  "password=<the openssl output from step 3>"
```

## 5. Create the Railway Postgres (by hand — NOT Terraform)

The community Railway Terraform provider can't provision a database, and a DIY
approach would leak the password into tfstate. So create it in the dashboard:

1. **https://railway.app/** → open the **sync-tab-scroll** project.
2. **New → Database → Add PostgreSQL.** Railway provisions it and exposes a
   `DATABASE_URL` on the Postgres service.
3. Leave it running in the same project/environment as the `app` service.

> ⚠️ This service is invisible to Terraform. Do **not** run a project-level
> `terraform destroy` (it won't remove the DB and can orphan it). See
> `infrastructure.md` Production Annotations.

## 6. Wire `DATABASE_URL` into the app service (reference variable)

In the Railway dashboard, open the **`app`** service → **Variables** → add:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

This is a Railway **reference variable** — resolved at deploy time, so only the
non-secret reference string is stored (nothing lands in tfstate). Adjust
`Postgres` to the actual Postgres service name if different.

## 7. Set the OAuth + session secrets as **sealed** Railway variables

Push the secrets from 1Password to Railway via the CLI (so they never touch the
repo, `.tf`, or tfstate). From the repo root, with the CLI linked to the app
service (`railway link` / `railway status`):

```sh
railway variables \
  --set "GITHUB_CLIENT_ID=$(op read 'op://sync-tab-scroll/github-oauth-sync-tab-scroll/client_id')" \
  --set "GITHUB_CLIENT_SECRET=$(op read 'op://sync-tab-scroll/github-oauth-sync-tab-scroll/client_secret')" \
  --set "GOOGLE_CLIENT_ID=$(op read 'op://sync-tab-scroll/google-oauth-sync-tab-scroll/client_id')" \
  --set "GOOGLE_CLIENT_SECRET=$(op read 'op://sync-tab-scroll/google-oauth-sync-tab-scroll/client_secret')" \
  --set "SESSION_SECRET=$(op read 'op://sync-tab-scroll/session_secret/credential')"
```

Then in the dashboard, mark the two `*_SECRET` and `SESSION_SECRET` variables as
**Sealed** (Railway hides sealed values after save). Also set the non-secret
public config the OAuth flow needs (these are safe to Terraform-manage later,
but easiest to add here for now):

```
PUBLIC_BASE_URL   = https://sync-tab-scroll.up.railway.app
ALLOWED_ORIGINS   = https://sync-tab-scroll.up.railway.app
```

(`ALLOWED_ORIGINS` backs the WS-upgrade Origin allowlist — §13 S3.)

## 8. Redeploy and verify

1. Trigger a redeploy (`railway redeploy`, or it redeploys on the variable
   change / next push).
2. Verify:
   - `GET /me` returns **anonymous** when not signed in, and the app is fully
     usable signed-out (the additive guarantee).
   - The **Sign in with Google / GitHub** flow completes and `/me` then returns
     your user.
   - Locking 1Password afterward doesn't break the running app (secrets are now
     in Railway, not read at runtime from 1Password).

## Local development

For `pnpm dev`, put the same values in `server/.env` (git-ignored) with the
**localhost** callback URLs, and mirror the keys in `server/.env.example` with
placeholders (constitution Principle VIII, lint-enforced). With no
`DATABASE_URL` set, the server runs with accounts disabled — exactly the
anonymous app — so you can develop the rest without a local Postgres until you
need it (then a `podman`/`docker` Postgres container per the test decision).

---

### Quick checklist

- [ ] GitHub OAuth app (+ dev app) registered; client id/secret captured
- [ ] Google OAuth client registered; consent screen + test user set
- [ ] Session secret generated
- [ ] All three secrets in 1Password (`sync-tab-scroll` vault)
- [ ] Railway Postgres created in the project
- [ ] `DATABASE_URL = ${{Postgres.DATABASE_URL}}` on the app service
- [ ] OAuth + session secrets pushed as **sealed** Railway vars
- [ ] `PUBLIC_BASE_URL` / `ALLOWED_ORIGINS` set
- [ ] Redeployed; `/me` anonymous-by-default and sign-in verified
