# sync-tab-scroll — Project Status

_Updated: 2026-07-10 (`/ardd-analyze`, terminal step of `/ardd-implement`
completing `tasks-catalog-activation-key-access-436e.md` — all 11 tasks
done on branch `catalog-activation-key-access`, which is 12 commits ahead
of `main` and not yet merged. No cross-artifact contradictions found.)_

ARDD update available: installed `9189817`, source at `8c68d84` — run
`/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | draft ⚠️ | 1 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording — resolved for
  `consented-song-submission` as per-song; revisit only if re-recording
  consent per song becomes real friction for a repeat submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.
- Whether `CatalogSong.lyricLineBreaks` is worth keeping — computed and
  unit-tested, but the current single-line ticker overlay never uses the
  grouped line boundaries for layout.

These are documented defaults, not blockers, and all carry `[OPEN: ...]`
markers stating a resolved answer inline (cosmetic labeling drift, see
Within-Artifact Issues). Untouched by this session's
`catalog-activation-key-access` implementation.

### infrastructure.md
- `[OPEN: custom domain]` — the Railway-assigned `*.up.railway.app`
  domain is sufficient for now; a custom domain is deferred, not
  resolved by `railway-terraform-deployment`. Unrelated to this
  session's work.

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state (client's own WS reachability)
  and `datamodel.md`'s `Participant.connectionStatus` field (server's
  per-participant socket state) share a name but describe different
  concepts. Not contradictory, just worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). Not a
  contradiction, just drift for a future `/ardd-verify` to record.
- [MINOR] The feature register's pre-convention "Metronome toggle"/
  "Count-in toggle" entries still carry their original logging-time
  descriptions, superseded by the implemented design.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [VAGUE] `lyricLineBreaks` retention — still unresolved whether it's
  worth keeping given nothing reads the grouped result for layout
- [VAGUE] The three `[OPEN: ...]` inline markers in the Consent Record
  section already state a resolved decision in the same sentence — the
  `[OPEN:` tag reads as still-undecided even though the prose isn't.
  Non-blocking.

### infrastructure.md
- [OPEN] Custom domain (see above) — genuinely deferred, not a labeling
  quirk.

## Constitution Compliance

No violations found this pass. `catalog-activation-key-access`'s
implementation followed Principle VII (test-first for every server/pipeline
task — the paired failing test preceded each implementation), Principle V
(Node's built-in `crypto` for key hashing, no new dependency), Principle IV
(a dedicated `catalogue-unlock` handler wired through `dispatch.ts`, one
handler per message type), and Principle I (`Session.unlockedCatalogueIds`
and the server-global `LoadedCatalog` as single sources of truth). The
handler carries a Production Annotation for the deliberate lack of
wrong-key rate limiting, per the constitution's Production Posture.

## Diagrams

- datamodel.md — stale ⚠️ (new `Catalogue` entity + `CatalogSong.catalogueId`
  + `Session.unlockedCatalogueIds`, now implemented but not yet in the ERD —
  run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (Railway/Dockerfile/Terraform topology plus
  the new catalogue-unlock flow, not reflected in the container diagram —
  run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (catalogue-grouped picker + host-only unlock control,
  now implemented but not in the component hierarchy — run
  `/ardd-render ui`)

Implementation has now landed, so a single `/ardd-render` pass across all
three is worth running (previously deferred until implementation).

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-07. A fresh full
`/ardd-verify` pass is worth running given the volume of new
server/client/pipeline code this feature (and `railway-terraform-deployment`
before it) added.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented — see
`.project/features/`:
- `catalog-activation-key-access` — **implemented** on branch
  `catalog-activation-key-access` (11/11 tasks,
  `tasks-catalog-activation-key-access-436e.md` at `status: completed`).
  Not yet merged into `main`.
- All 13 other features previously implemented and merged.

## In Flight

Branch `catalog-activation-key-access` (current checkout, not a separate
worktree) — 12 commits ahead of `main`, all signed and verified,
implementing `catalog-activation-key-access` end to end. The tasks file
is `completed` and the feature is flipped to `implemented`; both flips
ride this branch and reach `main` only on merge. Nothing else is in
flight (no sibling worktrees, no open draft PRs).

Verified end-to-end before completion against a live server built from
real `create-catalogue` output: a private catalogue's songs are withheld
until unlocked, a wrong key is rejected with no state change or broadcast,
and a correct key unlocks the catalogue so both the host and an
already-joined participant receive the widened catalog without rejoining
(11/11 protocol-level checks; UI control visibility covered by the T010
Playwright CT suite). The literal two-browser `pnpm dev` walkthrough
(T011's wording) was not driven through Chrome — the dev client runs on
port 6000, which Chrome blocks — so the purely-visual pass remains
available to run manually via the preview build (port 6001) if desired.

## Recommended Next Step

1. Merge `catalog-activation-key-access` into `main` — this lands the
   code and all its state (completed tasks file, `implemented` feature
   flip) atomically. All 12 commits are signed.
2. Run `/ardd-render datamodel`, `/ardd-render infrastructure`, and
   `/ardd-render ui` (or a single pass) now that the picker/unlock/
   catalogue-entity work has landed and the three diagrams are stale.
3. Consider `/ardd-verify` given the volume of new code across
   `server`, `client`, `packages/shared`, and `packages/pipeline`.
4. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `8c68d84`).
5. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in `datamodel.md`'s Consent Record section — worth folding into a
   future `/ardd-refine`/`/ardd-verify` pass.
