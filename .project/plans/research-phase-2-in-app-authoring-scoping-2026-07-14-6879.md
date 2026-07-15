---
topic: "Phase 2 in-app authoring: scope what's needed for in-app catalogue/song creation"
date: 2026-07-14
status: complete
---

# Research: Phase 2 in-app authoring scoping

## Question

There's no song-import or catalogue-minting UI today — everything is
operator-run CLI (`create-catalogue`, the pipeline's extraction stages,
`record-consent`). What's actually needed to build an in-app authoring UI,
and what's still genuinely undecided before it can be planned?

## Findings

**This isn't starting from zero — it was already substantially scoped.**
`.project/design-user-accounts-2026-07-12.reviewed.md` (the design of
record for the just-shipped Accounts Phase 1) explicitly planned two
phases and deferred the second:

- **Phase 1 — Accounts + persisted unlock.** Shipped, merged, deployed,
  verified (`tasks-accounts-phase-1-02f7.md`, `completed` 20/20).
- **Phase 2 — In-app authoring UI.** "Carries real ownership/permissions
  (built where first needed) and the dynamic-catalog work (§8). Standalone
  'ownership & invites' is not its own milestone" (§12.2) — i.e. the
  design doc already collapsed the originally-separate "Phase B
  (ownership/invites)" into Phase 2, rather than shipping it standalone.
  The doc's own gate for starting Phase 2 planning was: "not to be planned
  until A is live and B's fate is decided" (§7). **Both conditions are
  now met** — A is live, and B's fate was decided at design time (folded
  into Phase 2). So Phase 2 is unblocked for planning, on the design doc's
  own terms — it was never actually "no design yet," just gated behind a
  condition that's since been satisfied.

**Verified the design's core technical claims still hold against current
code** (checked, not assumed, since Phase 1 shipped a lot of code since
this doc was written): `server.ts`'s `createServer()` still builds
`ctx.catalog` exactly once via `loadCatalog()` at server construction —
the "catalog built once, immutable server-global" claim (§8) is still
accurate. The comment at `server.ts:41-43` still confirms auth routes
mount ahead of catalog/static/404, matching §6's seam description. Two
catalog-related fixes shipped since this design doc was written
(`catalog-loader-dotfile-guard`, `hide-locked-catalogues`) are both
robustness fixes to the existing static filesystem-scan loader — neither
changes an assumption Phase 2's design depends on.

**The design doc's own ripple inventory (§8) is the real scope — five
items, already identified, only one is a pure technical call:**

1. **Storage** — Railway volume (server writes song directories, mutates/
   re-scans, same on-disk format the pipeline already writes) vs. object
   storage vs. DB blobs. The doc already names the volume as "leading
   candidate, not yet decided" — the volume already exists and
   `catalog-static.ts` already serves it, so "server writes the same
   directory layout the pipeline writes, then updates the in-memory
   catalog" is the smallest-diff path. This is close to a pure technical
   decision (no new infra to provision), but still needs an explicit
   owner sign-off since it's the foundation everything else builds on.
2. **Mutation model** — `HandlerContext.catalog` becomes mutable,
   broadcast-obligated state (every session whose visible catalog changed
   needs the `catalog` re-send `catalogue-unlock` already models). Falls
   out mechanically once storage (1) is decided — not an independent
   choice.
3. **Per-user visibility** — an owner must see their own unpublished
   catalogue when *they* join, the first time the `catalog` message would
   differ per recipient within one session. Genuinely new wire/model
   surface, bigger than any Phase 1 item. Technical design work, not an
   owner decision — but sizeable enough to flag as the most
   implementation-risky single piece.
4. **Upload trust surface** — arbitrary-file upload + server-side parsing
   of attacker-supplied zip/XML (a `.gp` file is a zip; the pipeline reads
   `score.gpif` raw) + request-time `lrclib.net` calls happening at
   request time on a public server. This is exactly the threat model
   `datamodel.md`'s existing "CLI drop-in over a web upload form"
   resolution rejected for consent recording — Phase 2 reverses that
   rejection. Needs owning: size limits, parse sandboxing/timeouts,
   staging before a file is accepted into the catalog.
5. **Consent/legal** — real in-app ToS capture, replacing the
   `dev-placeholder` `tosVersion` `datamodel.md`'s Production Annotations
   already names as a known gap. This is explicitly **not a technical
   decision** — the design doc's open question 4 (§9) frames it as
   "legal/operator decision, blocks Phase 2 shipping, not Phase 2 design"
   — i.e. Phase 2 can be *designed and built* without this being resolved,
   but cannot *ship* (to real users, on the public deployment) until it is.

**Two design-doc open questions are already resolved and don't need
re-litigating:** membership auto-unlock scope (host-only, §12.1) and DB
test strategy (podman Postgres, §12.3) — both settled during Phase 1 and
still standing; nothing about Phase 2 reopens either.

## Recommendation

**Not ready for `/ardd-plan` yet — one round of owner decisions first,
then plan.** This isn't a simplicity/framing problem the way
`part-mute-toggle` was; it's a genuinely large feature (the design doc
itself calls dynamic-catalog "the cost center... slightly bigger than the
original says") with real unresolved choices that determine its technical
shape, not just its priority. Two of the five ripple items need an
explicit owner call before a plan could even start (storage tier, and
whether to start upload-trust work at all before consent/ToS is real
text) — everything downstream (mutation model, per-user visibility,
even the task breakdown) depends on those two answers.

Recommended sequencing: answer the two owner questions below now (or
defer them explicitly), then either `/ardd-backlog phase-2-in-app-authoring`
(if there's no urgency — the idea is well-understood enough that a future
`/ardd-plan phase-2-in-app-authoring` could design it fully) or go straight
to a full `/ardd-plan` in this session if you want to keep moving today.

## Rejected Alternatives

- **Plan it directly, resolve open questions inline during planning**:
  rejected — the storage-tier and consent-posture questions are exactly
  the kind of thing `/ardd-plan`'s own step 3c calls out ("if a feature
  reveals a conflict with an existing decision, surface it here rather
  than silently working around it") and change the plan's actual shape,
  not just fill in a detail. Better to have the answers before drafting
  phases than to draft around an assumption and redo it.
- **Re-scope from scratch, ignoring the existing design doc**: rejected —
  the 2026-07-12 design doc is thorough, adversarially reviewed (see its
  §13, a red-team pass with 8 findings all resolved), and Phase 1 already
  shipped exactly as it specified. Re-deriving Phase 2's shape from zero
  would throw away real prior work and risk inconsistency with decisions
  Phase 1's actual implementation already committed to (e.g. the
  key-epoch/stable-id membership scheme from S5/S8, which Phase 2's
  ownership model must stay compatible with).

## Open Questions

Both resolved by the owner (2026-07-14), same day as this research:

1. **Storage tier — RESOLVED: Railway volume.** Server writes the same
   on-disk directory format the pipeline already writes, then re-scans;
   reuses `catalog-static.ts` unchanged. No object storage/DB blobs.
2. **Consent/ToS sequencing — RESOLVED: build now, gate shipping later.**
   Phase 2's upload/authoring mechanism can be designed and built ahead of
   real consent/ToS text; the public Railway deployment must not actually
   accept public-facing uploads until real ToS text replaces the
   `dev-placeholder`, but self-hosted/local use isn't blocked on that.

Next: `/ardd-plan phase-2-in-app-authoring` (same session, per owner
direction — not deferred to a later backlog pass).
