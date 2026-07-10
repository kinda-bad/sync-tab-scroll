# sync-tab-scroll — Project Status

_Updated: 2026-07-10 (`/ardd-analyze` after `/ardd-feedback` captured the
song-select unlock-guard defect (F001) from the day's `/ardd-verify` pass.
Diagrams current; 1 open defect, now mirrored as 1 open feedback item.
No cross-artifact contradictions. Nothing in flight.)_

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

**1 known defect** — see `DEFECTS.md`, last checked 2026-07-10:
- **[broken-contract] infrastructure.md** — its Song Catalog Delivery
  section says selecting a song from a not-yet-unlocked catalogue is
  "rejected as an error," but `server/src/handlers/song-select.ts` searches
  the full server-global song list with no `unlockedCatalogueIds` guard, so
  a stale/tampered client can select a locked catalogue's song. Deliberate
  T006 choice the artifact wasn't reconciled to. **Now captured as
  feedback** (F001, below) — the user chose to add the guard rather than
  relax the artifact. Limited blast radius — only a tampered client can
  reach it, and static `.gp` assets are already served ungated.

Deployment, datamodel, pipeline, ui, and constitution surfaces verified
clean this pass.

## Feedback

- 1 open feedback file — `feedback-song-select-unlock-guard-705b.md`
  (F001, a Bug tagged `[artifacts: infrastructure]`): add a server-side
  guard so `song-select` rejects a locked-catalogue selection, honoring
  `infrastructure.md`'s existing contract (the artifact needs no revision).
  Will be picked up by the next `/ardd-plan`.

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

Nothing in flight — no sibling worktrees, no open draft PRs. The
`catalog-activation-key-access` branch has merged into `main`; the local
branch ref can be deleted at leisure.

## Recommended Next Step

1. Run `/ardd-plan` to consume the open feedback
   (`feedback-song-select-unlock-guard-705b.md`, F001) into a plan for the
   `song-select` unlock guard. It's a small, self-contained server change
   (add a `catalogueId`/`unlockedCatalogueIds` check in
   `song-select.ts`, mirroring the invalid-id error path); the paired test
   belongs in `song-select.test.ts`.
2. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `8c68d84`).
3. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in `datamodel.md`'s Consent Record section — worth folding into a
   future `/ardd-refine` pass.
