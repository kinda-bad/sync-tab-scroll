# Adversarial Review — User Accounts / OAuth / Postgres Design

_Red-team pass against `design-user-accounts-2026-07-12.reviewed.md` (and the
adopted spike `spike-datastore-secrets-2026-07-12.md`). 2026-07-12._

Posture: attack-only. I assume the design is built exactly as written and hunt
for what breaks. Findings are severity-ranked with concrete scenario, evidence,
and a close condition. Verdict at the end.

---

## SHOWSTOPPER

### S1. Hand-rolled OAuth with no `state`/CSRF parameter specified — login CSRF and code injection
**Attack:** §6 ("Auth mechanics") specifies the routes
(`/auth/<provider>/login`, `/callback`, `/logout`, `/me`) and the Authorization
Code flow, but **never once mentions the OAuth `state` parameter, PKCE, or a
nonce**. §3 says "Authorization Code flow, server-side" and stops there. A
hand-rolled Authorization Code flow with no `state`:
- **Login CSRF / forced login:** an attacker initiates the OAuth dance with
  *their own* provider account, captures the resulting `code`, and delivers the
  `/auth/google/callback?code=…` URL to a victim (image tag, link). The victim's
  browser completes the callback, the server mints a cookie binding the victim's
  browser to the **attacker's** identity. The victim now unknowingly acts as the
  attacker's account — any private catalogue the victim's host-seat unlocks, any
  membership written, accrues to the attacker; conversely the attacker can later
  read state the victim entered. This is the textbook OAuth login-CSRF that
  `state` exists to stop (RFC 6749 §10.12).
- Without `state`, there is also nothing binding the callback to the browser that
  started it, so the "dev proxy round-trip" (§6 dev wrinkle) has no integrity
  check either.

**Evidence:** §6 whole section; §3 bullet 1. Grep of the design for "state",
"PKCE", "nonce", "CSRF" in the OAuth context: absent. The spike (§4
"Recommended architecture") also omits it.

**Close it:** the refine MUST require a signed/opaque `state` (and ideally PKCE
for the providers that support it), stored in a short-lived pre-auth cookie or
signed value, verified on callback. This is not an implementation detail to be
"discovered later" — it is the load-bearing security control of the flow and
must be named as a requirement before artifacts are written.

### S2. Stateless signed cookie + "long expiry" + no server-side session table = **no revocation, no logout that means anything**
**Attack:** §6 decides "HMAC-signed `{userId, iat}` … either way **no
server-side session table** — logout clears the cookie … `HttpOnly; Secure;
SameSite=Lax`, **long expiry**." §12.4 stores exactly one session-signing key.
Consequences:
- **Logout is cosmetic.** "Logout clears the cookie" only clears the copy in the
  *cooperating* browser. A stolen/exfiltrated cookie (XSS elsewhere, shared
  machine, proxy log, a leaked `Secure` cookie over a misconfigured origin)
  remains valid for the full "long expiry" with **no way to invalidate it**.
  There is no `sessionVersion`, no per-user token generation counter, no
  server-side allowlist/denylist to check against.
- **Account compromise is unrecoverable** short of rotating the single global
  signing key, which logs out *every* user simultaneously and is described
  nowhere as an operational procedure.
- **`iat` is carried but no expiry validation is specified.** "long expiry" with
  no rotation and no max-age check means a cookie is effectively a bearer token
  good for months.

**Evidence:** §6 "Session identity" bullet; §12.4 (single signing key, sealed).
No revocation/versioning mechanism anywhere in the doc.

**Close it:** either (a) add a `sessionVersion`/`tokenGeneration` column on
`User`, embed it in the cookie, and check it on verify (cheap, keeps
"stateless-ish", makes logout/"log out everywhere" real), or (b) explicitly
accept "cookies are irrevocable until global key rotation" as a written,
owner-signed risk with a bounded expiry (hours/days, not "long"). Getting this
wrong is expensive precisely because it's invisible until an incident.

### S3. No Origin check on the WebSocket upgrade — cross-site WS hijack depends entirely on an unverified `SameSite` assumption
**Attack:** The design leans on cookies auto-attaching to the WS upgrade (§6:
"the browser attaches cookies to the WS upgrade request automatically, so WS
identity needs no protocol change"). But the current server does **zero origin
validation** on the upgrade: `new WebSocketServer({ server: httpServer })` with
a bare `wss.on('connection', …)` and no `verifyClient`/origin check
(`server/src/server.ts:38-40`; grep for `origin`/`verifyClient`/`handleUpgrade`
across `server/src/` returns nothing). The design's *entire* CSRF defense for the
authenticated WS is the implicit `SameSite=Lax` behavior — which it never states
as a security control, only as a dev-convenience observation (§6 dev wrinkle).
- WebSocket handshakes are **not** subject to the browser Same-Origin Policy the
  way `fetch` is; the classic "Cross-Site WebSocket Hijacking" attack is exactly
  this shape. `SameSite=Lax` does withhold the cookie on a cross-site,
  script-initiated WS handshake — so today's Lax choice happens to blunt it — but
  the design nowhere treats Origin validation as required, and any future loosen
  of the cookie to `SameSite=None` (which a cross-origin embedding or a
  multi-origin deployment could tempt) silently re-opens full account takeover
  over WS.

**Evidence:** `server/src/server.ts:38-40`; §6 relies on cookie auto-attach and
never mandates an `Origin` allowlist on upgrade.

**Close it:** require an explicit `Origin` allowlist check in the WS upgrade path
(reject unknown origins before attaching identity) as a hard artifact
requirement, independent of the SameSite behavior. Defense in depth is
mandatory here because the cookie flag is the *only* other control.

---

## SERIOUS

### S4. The resolved host-only auto-unlock (§12.1) **breaks the stated motivating use case** in §5
**Contradiction, not just a risk.** §5 states the band use case as *"any band
member joins and the setlist is just there, without requiring the host
specifically to hold the membership."* §12.1 then resolves the open question the
opposite way: **host-only** — "Non-host authenticated participants' [memberships]
do not [auto-populate]." So the shipped Phase 1 delivers: the setlist is "just
there" **only when the one specific member who holds the membership is the
session host.** A band whose drummer created the session but whose guitarist
holds the `kinda-bad` membership gets **no** auto-unlock; the guitarist must be
made host, or the key re-typed — i.e. the exact daily friction §1 says this whole
project exists to remove is only partially removed. The design's §1 promise
("log in once, never re-type the band key") is true only for the membership
holder *when they host*.

**Evidence:** §5 unlock-persistence rule (recommended any-authenticated) vs
§12.1 (resolved host-only); §1 motivation.

**Close it:** owner must reconcile §1's promise with §12.1's authorization
choice. Either (a) accept that Phase 1 only auto-unlocks for the hosting member
and reword §1 so the value claim is honest, or (b) revisit §12.1. Do not let the
refine write §1's promise and §12.1's restriction into the artifacts unreconciled
— they contradict.

### S5. Host succession produces an incoherent, order-dependent unlock state
**Attack / inconsistency:** unlocks are session-level and, once pushed to
`Session.unlockedCatalogueIds`, are **never removed** (`catalogue-unlock.ts:62`
only pushes; nothing pops; succession in `host-succession.ts` doesn't touch
unlocks). Combined with §12.1 host-only auto-populate at *join time only*, the
membership-driven unlock is **evaluated once, for whoever is host at that
join**, and then frozen:
- **Timing lottery:** if the membership-holding host joins first, the catalogue
  unlocks for the whole session (anonymous participants included) and stays
  unlocked forever — even after that host disconnects and an anonymous member is
  promoted (`promoteNextHost`). So "host-only" authorization silently leaks the
  private catalogue to an all-anonymous session after the authenticated host
  leaves. The stated invariant ("preserves today's host-only unlock
  authorization exactly," §12.1) is **not** preserved: today the unlock requires
  the *current* host to have supplied the key; here it persists past that host's
  departure.
- **Reverse lottery:** if the membership holder joins the session *after* it was
  created by an anonymous host, no re-run of the union is specified on plain
  member join (host-only), so their setlist never appears despite them being
  present and logged in.

There is no defined re-evaluation of the union on succession, on host-delegate
(`host-delegate.ts`), or on the membership-holder's later join. The design treats
auto-unlock as a create/join-time event but the host identity it keys off is
**mutable at runtime**.

**Evidence:** `catalogue-unlock.ts:62` (append-only), `host-succession.ts`
(no unlock handling), §5/§12.1 (join-time host-only union).

**Close it:** specify the auto-unlock's exact trigger set and whether
succession/delegate re-evaluates or de-escalates. Decide explicitly whether an
unlock survives the departure of the host that caused it (it does, in the current
model — say so and accept the leak, or add removal logic, which is a much bigger
change to a currently append-only structure).

### S6. `grantedVia:'key'` memberships are **never revoked on key rotation** — permanent access with no kill switch
**Attack:** the membership model (§5) records `grantedVia:'key'` at key entry and
has **no relationship to the key's current value**. The activation key lives in
the catalogue's on-disk `salt`/`hash` (`catalog-loader.ts:175`,
`catalogue-unlock.ts:51-56`). When the owner rotates the key (regenerates
salt/hash) — the natural response to a leaked key — **every existing
`grantedVia:'key'` membership stays valid forever**, because membership is a
standalone row keyed by `(userId, catalogueId)` with no key-version reference.
Rotation therefore does not evict anyone; it only changes what *new* joiners must
type. A leaked key that has already been redeemed into memberships is
un-revocable. This directly worsens the already-noted "no rate limiting on the
wrong-key path" (§11): a brute-forced or leaked key now converts into a
**durable** grant, not a per-session one.

**Evidence:** §5 `CatalogueMembership` (no key-version/epoch field); §12.1;
`catalogue-unlock.ts` (key verify has no notion of key generation); §11
(wrong-key path unlimited).

**Close it:** either add a key-epoch/version to the catalogue record and stamp it
on the membership (rotation bumps the epoch, stale memberships stop unioning), or
explicitly document that key memberships are permanent and key rotation is **not**
a revocation mechanism. The design currently implies rotation is a control; it
isn't.

### S7. Partial-failure state: DB reachable at boot, dies mid-run — silent, inconsistent behavior
**Attack:** §2 and §12.4 carefully guarantee "server boots with no DB" and treat
a hard DB-at-boot dependency as a defect. But the design **never specifies
runtime DB-failure semantics**, and the two persistence operations fail in
opposite, silent ways:
- **Membership write on key entry** (host enters valid key → upsert
  `CatalogueMembership`). If the DB is down at that moment, the per-session unlock
  still succeeds (it's memory, `catalogue-unlock.ts:62`) but the *persistence*
  fails. The user is told nothing and believes "I logged in, it's saved" — next
  session, the friction is back, with no error surfaced. The §1 promise silently
  fails.
- **Membership read on host join** (union into `unlockedCatalogueIds`). If the DB
  is down, either the join blocks on a DB timeout (harming the anonymous-first
  core loop — a DB outage now degrades logged-out users' join latency, violating
  §2's "no new moving parts for the baseline") or it proceeds with an empty
  membership set (silent no-unlock). Both are unspecified.
- Cookie verification is stateless (§6), so a user stays "logged in" (cookie
  valid) while all their durable capabilities silently vanish — the worst kind of
  partial outage: authenticated but capability-less, with no signal.

**Evidence:** §2, §12.4 (boot-time only); §6 (stateless cookie needs no DB);
§5 (read/write points). No runtime-failure contract anywhere.

**Close it:** the refine must specify runtime DB-failure behavior for both the
write path (surface a "couldn't save — you'll need the key next time" signal) and
the read/join path (bounded timeout, must not block the anonymous core loop, must
not silently look like "membership revoked"). §2's constraint is written as a
boot-time property; it needs a runtime clause.

### S8. Slug-as-string membership + Phase 2 user-created catalogues = **slug-collision privilege escalation**
**Attack:** §5 makes `catalogueId` a "plain slug string, no FK," and argues
dangling rows are inert. That holds while slugs come only from the trusted
filesystem/pipeline. Phase 2 (§7/§12.2 in-app authoring) lets users **create
catalogues**, which means users choose or influence slugs. A membership is keyed
by `(userId, slug)` and unions blindly by string match
(`visibleCatalog` set membership, `catalog-loader.ts:208`). Attack: a user who
once held membership to a private catalogue slug `kinda-bad` (or an attacker who
learns a valued slug) creates/authoring-uploads content, and if slug allocation
ever permits reuse or an operator deletes-and-recreates a slug, the **old
membership rows silently re-attach to different content.** Equally, a Phase 2
user who names their new catalogue with an existing private slug could shadow or
collide with it. The "inert by construction" claim is only true under the Phase 1
invariant "slugs are immutable, operator-controlled, never reused" — an invariant
Phase 2 explicitly breaks and the design never states as a constraint Phase 2
must uphold.

**Evidence:** §5 referential-integrity note (justified only against filesystem
deletion, not against user-controlled slug creation); §7/§12.2 Phase 2 authoring;
`catalog-loader.ts:208` (string-set match).

**Close it:** state the invariant the "inert dangling rows" argument depends on
(slugs are globally unique, immutable, never reused across content) as a hard
requirement Phase 2 must preserve, or switch memberships to a stable synthetic
catalogue key (surrogate id) before any user-created catalogue exists. This is a
Phase-1 data-model decision with Phase-2 blast radius — exactly the "does Phase 1
bake in rework" question, answered: yes, the bare-slug key does.

---

## MINOR (but fix-before-artifacts where noted)

### M1. Open-redirect risk on login/callback return-to is unaddressed
A hand-rolled `/auth/<provider>/login` typically carries a post-login
destination; if not strictly allowlisted, it's an open redirect (phishing
primitive) and interacts with the dev-proxy origin juggling (§6). The design
never mentions return-to handling. Name it: destinations must be same-origin
relative paths only.

### M2. `SameSite=Lax` + the reconnect-by-identity seat is fine, but should be stated
Good news for the "does a hijacked cookie let someone reclaim a host seat"
question: seat reclaim keys off the **unguessable `participantId` UUID** the
client resends (`session-join.ts:19`), *not* the cookie's `userId`. So a stolen
cookie yields the account's *memberships* (bad enough, see S2/S6) but **not**
another user's live participant/host seat. This is an actual strength — but it's
accidental, undocumented, and one refactor ("let's rejoin by userId now that we
have it") away from becoming a host-seat-takeover-by-cookie bug. Document that
seat reclaim must remain keyed on the capability UUID, never on `userId`.

### M3. `__Host-` prefix / cookie `Path` / signing-key rotation ergonomics unspecified
§6 lists `HttpOnly; Secure; SameSite=Lax` but not `__Host-` prefix, `Path=/`, or
a signing-key rotation story (single sealed key, §12.4 — rotating it is a
site-wide forced logout with no dual-key grace window). Minor, but cheap to get
right now.

### M4. Terraform-invisible Postgres: DR and env-duplication gaps are named but not owned
§12.4 and the spike honestly flag: the unmanaged Postgres is invisible to
Terraform (project-level `terraform destroy` orphans/destroys it with no plan
diff to warn the operator), sealed vars don't copy to duplicated environments,
and there is **no stated backup/restore or DR procedure** for the one now-durable
store holding all identity and membership data. "Back up before project-level TF
surgery" (spike Blockers) is a hope, not a control. For a single-operator posture
this is acceptable *if written as an accepted risk with a concrete backup cadence*
— currently it's just a caveat. Under-specified where getting it wrong (losing
the DB) silently destroys every user's persisted unlock, re-introducing the exact
friction the project removed.

### M5. `email`/`displayName` stored but no update/privacy/consent story
§5 `User` persists `email` and `displayName` from the provider profile. No
refresh policy (provider email changes → stale), no deletion/GDPR-style "delete
my account" path (there's no account deletion anywhere), and this is the first PII
the project stores — the constitution/infra amendment (§4) should acknowledge it.
Minor now, awkward later.

### M6. Over-engineering: `grantedVia` enum + `CatalogueOwnership` table land in Phase 1 scope creep
§12.2 collapses Phase B into Phase 2, yet §5 still specifies the `'invite'`
grantedVia value and the `CatalogueOwnership` table as if imminent. Phase 1 needs
only `grantedVia:'key'|'owner'` at most (and arguably just a boolean/no enum,
since Phase 1 has exactly one grant path: key). Shipping the invite enum value and
ownership table before Phase 2 exists is speculative schema. Trim Phase 1's schema
to what the key-persist feature needs; add the rest when authoring is planned.

---

## Verdict

**Go with fixes — the design is directionally sound but has security omissions
that must not be written into artifacts as-is.**

The core architectural bet is correct and well-evidenced: OAuth attaches at two
existing seams; the catalog is genuinely immutable-at-startup
(`catalog-loader.ts`, `server.ts:20`) so the dynamic-catalog cost is real and
correctly deferred; the DB-optional and slug-no-FK instincts are right *as far as
they go*. The problem is not the shape — it's that the highest-risk new surface
(hand-rolled OAuth + irrevocable stateless cookie) is the **least specified**
part of the document, and two "resolved" decisions (§12.1 host-only) quietly
contradict the design's own motivation and stated invariants.

**MUST be resolved before `/ardd-refine` writes this into the artifacts:**
- **S1** — OAuth `state`/CSRF is not optional; name it as a requirement.
- **S2** — cookie revocation/expiry: add `sessionVersion` or accept irrevocability
  in writing with a bounded expiry.
- **S3** — mandate an `Origin` allowlist on the WS upgrade as its own control.
- **S4** — reconcile §12.1 host-only with §1's "any band member" promise; the
  artifacts cannot encode a promise the resolved decision breaks.
- **S5** — define the auto-unlock trigger set and its behavior across host
  succession/delegate; decide whether an unlock outlives its causing host.
- **S6** — decide whether key rotation revokes key-memberships (epoch field) or
  document that it does not.
- **S7** — add a runtime DB-failure contract (§2 is boot-time-only today).

**Should be resolved, cheap now:** S8 (slug-key invariant for Phase 2), M1
(open-redirect), M6 (trim speculative schema).

The design does **not** need fundamental rework. It needs the auth section
written to the same rigor as the datastore spike, and the two host-only
resolutions (§12.1) reconciled with the rest of the document, before refine.
