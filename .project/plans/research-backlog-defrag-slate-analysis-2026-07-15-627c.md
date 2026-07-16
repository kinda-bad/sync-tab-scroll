---
topic: "Analyze the open backlog's code footprints and propose a 'defrag' slate for implementation sessions"
date: 2026-07-15
status: complete
---

# Research: Backlog Defrag Slate Analysis

## Question

Across the open items in `.project/features/`, estimate each item's code
footprint against the real codebase, then propose a "defrag" slate:
**bundles** (items touching overlapping code, cheaper to implement together
and safer against merge conflicts) and **parallel sets** (items pairwise
disjoint in footprint, safe to fan out across worktrees). This is a
prototype of a possible future `/ardd-plan` "slate mode"; the quality of the
method is itself the experiment.

## Findings

### Headline: the open backlog is a single item

A grep of every feature file's `status` field is unambiguous:

```
15 × implemented
 1 × backlogged   → phase-2-in-app-authoring
 0 × planned
 0 × tasked
```

Only **`phase-2-in-app-authoring`** is open. There is **no cross-item
slate to compute** — bundling and parallelization are relations *between*
items, and with N=1 the relation set is empty. This is the finding, not a
footnote, and I am reporting it as such rather than manufacturing a slate.

(Note: `STATUS.md` is stale on exactly this point — its Feature Backlog line
reads "0 backlogged," written the same day `phase-2-in-app-authoring` was
logged as `backlogged`. STATUS.md is single-writer/`/ardd-status`-owned and
untouched here; the discrepancy is called out below as evidence, not fixed.)

I explicitly did **not** reclassify the shipped-feature maintenance tails —
part-mute-toggle's pending live click-through, the stale `ui.md` diagram,
the two pre-existing cross-artifact GAPs — as open backlog to inflate N.
They are maintenance on already-`implemented` features, not register
backlog, and don't qualify for a slate.

### The real decomposition is one level down: phase-2's five ripple items

The single open item is large and already scoped. The defrag question has a
valid answer if we recurse into the sub-work `phase-2-in-app-authoring`
would entail — which the design of record
(`design-user-accounts-2026-07-12.reviewed.md` §8) and
`research-phase-2-in-app-authoring-scoping-2026-07-14-6879.md` already
enumerate as five ripple items. I ground each against real paths below
(read-only grep/glob of the repo; no free-association).

**R1 — Storage (server writes catalogue dirs to the Railway volume).**
Footprint: `server/src/catalog-static.ts` (44 lines, already serves the
volume), `server/src/catalog-loader.ts` (220 lines, the filesystem-scan
loader — would gain a *write*/re-scan path), `packages/pipeline/src/` on-disk
format (`create-catalogue.ts`, the directory layout the server must mirror),
`infra/` Terraform (volume already provisioned). Confidence: **high** — the
smallest-diff path reuses existing loader/static modules.

**R2 — Mutation model (`ctx.catalog` becomes mutable, broadcast-obligated).**
Footprint: `server/src/handlers/context.ts` (`HandlerContext.catalog`),
`server/src/handlers/catalogue-unlock.ts` (85 lines — the existing `catalog`
re-send this reuses), `server/src/server.ts` (`createServer()` builds
`ctx.catalog` once today). Confidence: **high**, and the scoping doc states
R2 "falls out mechanically once storage (R1) is decided" — i.e. R2 is
**not independent of R1**.

**R3 — Per-user catalogue visibility (first per-recipient `catalog` message).**
Footprint: `packages/shared/src/messages.ts` (wire schema — new/parameterized
`catalog` message), `server/src/handlers/session-join.ts` and
`catalogue-unlock.ts` (send sites), `server/src/membership-unlock.ts`
(visibility logic), `client/src/store.ts` + `ws-client.ts` (receive).
Confidence: **medium-high** on the paths, but the scoping doc flags R3 as
the single most implementation-risky piece, depending on R2.

**R4 — Upload trust surface (accept + parse attacker-supplied `.gp`).**
Footprint: `packages/pipeline/src/gp-parser.ts`, `extract-lyrics.ts`,
`lrclib.ts` (a `.gp` is a zip; lrclib is a request-time network call),
`server/src/server.ts` (new upload route alongside auth/catalog/static),
plus size-limit/sandbox/staging logic that doesn't exist yet. Confidence:
**medium** — parsing modules exist, but the request-time server-side wrapper
is greenfield. Shares R1's storage *write* path (staging → accept into
catalog dir), so **partial overlap with R1**, not disjoint.

**R5 — Consent/ToS capture (replace `dev-placeholder` `tosVersion`).**
Footprint: `server/src/consent.ts` (28 lines), `packages/pipeline/src/record-consent.ts`,
`datamodel.md`'s Production Annotations (`tosVersion`), and a client capture
surface. Confidence: **high** on paths. The scoping doc marks this a
legal/operator decision that gates *shipping*, not *building* — so it is
**time-separable** from the rest.

**Client authoring UI (implied sixth surface).** Footprint: `client/src/views/`
(a new authoring view alongside `Landing`/`Lobby`/`Playback`),
`client/src/components/` (new upload/form component — confirmed greenfield:
no upload component exists in `components/` today). Confidence: **low /
speculative** — no wireframe or component exists; footprint is a projection,
flagged as such per method.

### Pairwise overlap picture (within phase-2)

- **R1 ↔ R2 ↔ R3**: a **single shared seam** — the catalog-mutation path
  (`catalog-loader.ts` write → `ctx.catalog` mutable → `catalogue-unlock.ts`/
  `messages.ts` re-send). These are not merely overlapping; the scoping doc
  makes them **sequentially dependent** (R1 → R2 → R3). This is a *bundle by
  necessity*, and specifically **not** parallelizable.
- **R4 ↔ R1**: partial overlap on the storage write/staging path; the
  `.gp`-parsing half (`packages/pipeline`) is separable but the accept-into-
  catalog half is not.
- **R5**: cleanly separable in *time* (build-now/gate-later, owner-resolved),
  touching `consent.ts` + `record-consent.ts` + datamodel — low overlap with
  R1–R3's server-catalog seam.
- **Client authoring UI ↔ server surfaces**: disjoint at the file level
  (`client/` vs `server/`), coupled only through `packages/shared/messages.ts`
  — the classic front/back split.

## Recommendation

**There is no multi-item defrag slate to run — the backlog holds one item.**
The actionable next step for this repo is unchanged from the phase-2 scoping
doc: **`/ardd-plan phase-2-in-app-authoring`** (owner already resolved both
gating questions on 2026-07-14). Slate mode has nothing to add at the
register level today.

If the intent is to sequence *within* phase-2 when it is planned, the
evidence supports exactly one internal shape — and it is mostly a **bundle,
barely a parallel set**:

- **Bundle A (sequential, mandatory-together): R1 → R2 → R3** — the shared
  catalog-mutation seam (`catalog-loader.ts`, `context.ts`,
  `catalogue-unlock.ts`, `messages.ts`). Evidence: shared files + the scoping
  doc's own dependency chain. Confidence: **high**. Do **not** fan these out
  — they collide on the same server state and are ordered.
- **Bundle A + R4**: keep R4 adjacent to Bundle A (partial storage-write
  overlap), but its `.gp`-parsing work in `packages/pipeline` can be staged
  first as low-risk prep. Confidence: **medium**.
- **Parallel candidate — R5 (consent/ToS)**: the cleanest disjoint slice
  (`consent.ts`/`record-consent.ts`/datamodel), safe to fan out to a separate
  worktree; owner-gated for shipping but not for building. Confidence:
  **medium-high**.
- **Parallel candidate — client authoring UI**: disjoint by directory
  (`client/`), couplable to the server work only through `messages.ts`.
  Confidence: **low (speculative)** — greenfield, no component exists yet.

**Poor candidate for any slot: phase-2 as a whole.** Huge, partly
speculative, and its own scoping doc gates it on owner decisions (now
resolved) — it is the textbook "plan it, don't slot it" item.

## Rejected Alternatives

- **Manufacture a slate from maintenance tails** (part-mute click-through,
  stale `ui.md` diagram, the two artifact GAPs): rejected — these are not
  register backlog; treating them as open items to reach N≥2 would be exactly
  the free-association the method is meant to avoid.
- **Recurse into phase-2 and present its ripple items as first-class backlog
  entries**: rejected as a register action — they aren't logged features and
  shouldn't be. Presented here only as *analysis* of how phase-2 would
  internally decompose, which is where the defrag logic legitimately applies.
- **Trust STATUS.md's backlog counts as the item source**: rejected — STATUS
  says "0 backlogged" while the register holds one `backlogged` item. A slate
  method must read the register directly.

## Open Questions

Meta-assessment of the method (with N=1, this is the experiment's real yield):

1. **The method degenerates against a near-drained backlog.** sync-tab-scroll
   has shipped 15/16 features; the one open item is a single large feature
   with its own design doc. A cross-item defrag slate is only meaningful at
   N≥2 open items with *independent* footprints. Slate mode needs an explicit
   **N=0 / N=1 branch**: report "nothing to defrag" and hand off to
   `/ardd-plan <the-one-item>`, rather than emit an empty or fabricated slate.

2. **The interesting decomposition was one level down, and the method had no
   principled way to reach it.** The genuine bundle/parallel structure lived
   *inside* phase-2's ripple inventory — but that inventory existed only
   because a prior `/ardd-research` scoping pass and a design doc had already
   enumerated it. A codified slate mode can't assume that scaffolding exists;
   for an un-scoped large feature it would have to *derive* the sub-footprint
   itself, which is real design work, not a mechanical overlap scan.

3. **Footprint estimation worked well where code exists, poorly where it
   doesn't.** R1–R3, R5 mapped to concrete files with high confidence because
   the seams (`catalog-loader.ts`, `context.ts`, `catalogue-unlock.ts`,
   `messages.ts`, `consent.ts`) are already present. The client authoring UI
   footprint is a guess — no component exists. Slate mode must **grade
   confidence per item** and refuse to place speculative-footprint items into
   parallel sets (a wrong "disjoint" call is the expensive failure mode: it
   green-lights a fan-out that then merge-conflicts).

4. **Overlap ≠ parallelizability; dependency is the hidden third axis.**
   R1/R2/R3 share files *and* are ordered. A pure file-overlap graph would
   correctly bundle them but wouldn't know they can't be reordered. Slate mode
   needs a dependency signal (from the plan/design doc, or inferred from
   data-flow direction) on top of the static path-overlap picture — path
   overlap alone under-constrains the answer.

5. **Missing input: staleness-tolerant register reading.** STATUS.md's stale
   backlog count would have misled a method that trusted it. Slate mode must
   source its item list from `.project/features/*.md` `status` frontmatter
   directly (grep), never from STATUS.md's assembled counts.

**Standing note:** "slate mode" is a *capability of ARDD itself*, not a
feature of sync-tab-scroll — it does not belong in this repo's backlog. This
document is a one-off research write with no lifecycle; if slate mode is worth
pursuing, that belongs in the artifact-driven-dev repo, not here.

Actionable next step for **this** project: **`/ardd-plan phase-2-in-app-authoring`**.
