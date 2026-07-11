# sync-tab-scroll — Project Status

_Updated: 2026-07-10 (`/ardd-analyze` after `/ardd-verify` re-checked the
merged `song-select-unlock-guard` work. `song-select-unlock-guard` merged
into `main` (`b65d5d0`); `DEFECTS.md` is all-clear (defect `31c5630a`
resolved). Diagrams current; no open feedback, nothing in flight, no
cross-artifact contradictions. `main` is 30 signed commits ahead of
`origin/main` — unpushed.)_

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
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). An omission,
  not a code-vs-artifact contradiction — the 2026-07-10 `/ardd-verify` pass
  did not record it as a defect.
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

- datamodel.md — current ✅ (ERD includes `Catalogue`, `CatalogSong.catalogueId`,
  `Session.unlockedCatalogueIds`, and the activation-key record)
- infrastructure.md — current ✅ (container diagram includes `create-catalogue`,
  per-session filtering, and the `catalogue-unlock` flow)
- ui.md — current ✅ (component hierarchy includes the catalogue-grouped
  picker, locked indicator, and host unlock control)

All three re-rendered into `README.md` on 2026-07-10.

## Code-vs-Artifact Defects

**0 known defects** — `DEFECTS.md` all-clear, last checked 2026-07-10. The
prior `31c5630a` (`song-select` locked-catalogue gap) is resolved:
`server/src/handlers/song-select.ts` now rejects a locked-catalogue
selection, matching `infrastructure.md`'s contract, covered by
`song-select.test.ts`. Datamodel, pipeline, infrastructure deployment, ui,
and constitution surfaces were all clean at the same pass.

## Feedback

No open feedback — F001 (`feedback-song-select-unlock-guard-705b.md`) was
`planned`, consumed by `plan-song-select-unlock-guard-2026-07-10.md`, and
its fix is now merged.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented — see
`.project/features/`:
- `catalog-activation-key-access` — **implemented** and merged into
  `main` (`f354caa`, 11/11 tasks,
  `tasks-catalog-activation-key-access-436e.md` at `status: completed`).
- All 13 other features previously implemented and merged.

Verified end-to-end before merge against a live server built from real
`create-catalogue` output: a private catalogue's songs are withheld until
unlocked, a wrong key is rejected with no state change or broadcast, and a
correct key unlocks the catalogue so both the host and an already-joined
participant receive the widened catalog without rejoining (11/11
protocol-level checks; UI control visibility covered by the T010 Playwright
CT suite). The literal two-browser `pnpm dev` walkthrough (T011's wording)
was not driven through Chrome — the dev client runs on port 6000, which
Chrome blocks — so the purely-visual pass remains available to run manually
via the preview build (port 6001) if desired.

## In Flight

Nothing in flight — no sibling worktrees, no open draft PRs, no draft
plans, no open feedback. Both recent feature branches
(`catalog-activation-key-access`, `song-select-unlock-guard`) have merged
into `main`; their local refs can be deleted at leisure. `main` is 30
signed commits ahead of `origin/main` — unpushed.

## Recommended Next Step

Project is at a clean resting state — all artifacts stable-or-known-draft,
diagrams current, `DEFECTS.md` all-clear, no open feedback or in-flight
work. Options:

1. `git push` — `main` is 30 signed commits ahead of `origin/main`. All
   are signed and verify, so pushing is safe whenever you're ready.
2. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `8c68d84`).
3. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in `datamodel.md`'s Consent Record section — worth folding into a
   future `/ardd-refine` pass.
4. Start the next feature: `/ardd-feature <idea>` to log one, or
   `/ardd-plan <slug>` against a backlogged entry (none currently
   backlogged).
2. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `8c68d84`).
3. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in `datamodel.md`'s Consent Record section — worth folding into a
   future `/ardd-refine` pass.
