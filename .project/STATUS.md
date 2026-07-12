# sync-tab-scroll — Project Status

_Updated: 2026-07-12 (`/ardd-analyze` after `/ardd-refine constitution`
amended the deployment posture to **v1.5.0** — reversing no-auth/no-datastore
for the additive user-accounts direction. `datamodel` and `infrastructure`
now need refining to catch up; that's the intended next design work, not a
defect.)_

ARDD update available: installed `9189817`, source at `a4f7f9c` — run
`/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.5.0) | 0 |
| datamodel.md | stable ✅ | 0 (accounts model pending refine) |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 (accounts/OAuth/DB pending refine) |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

None recorded as `[OPEN:` markers. The accounts feature's design decisions are
all resolved in the design-of-record
(`.project/design-user-accounts-2026-07-12.reviewed.md`, §12 owner decisions +
§13 adversarial resolutions) — they just aren't written into `datamodel`/
`infrastructure` yet (see Cross-Artifact Issues).

## Cross-Artifact Issues

- [GAP — expected/in-progress] `constitution.md` v1.5.0 now sanctions optional
  OAuth accounts + a durable Postgres datastore (identity, catalogue
  membership, revocable server-side sessions), but `datamodel.md` and
  `infrastructure.md` do not yet define them. This is the deliberate next step:
  `/ardd-refine datamodel` then `/ardd-refine infrastructure`, driven by the
  reviewed design doc. Not a contradiction — a pending propagation.
- [GAP] `ui.md`'s "Connection lost" state and `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts.
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`.
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. The v1.5.0 amendment keeps every Core Principle (I–VIII)
intact — it changed only the Project Scope & Intent posture (MINOR bump), and
carries a Sync Impact Report entry.

## Diagrams

- datamodel.md — current ✅ (will go stale once `User`/`CatalogueMembership`/
  `sessions` are added at refine time)
- infrastructure.md — current ✅ (will go stale once OAuth/DB are added)
- ui.md — current ✅

## Code-vs-Artifact Defects

**0 known defects** — `DEFECTS.md` all-clear, last checked 2026-07-10.

## Feedback

No open feedback.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented — see
`.project/features/`. (The accounts feature is being designed via the
design-of-record + `/ardd-refine`; it will enter the register when
`/ardd-plan` scopes Phase 1.)

## In Flight

**User-accounts feature — in design.** Design-of-record:
`.project/design-user-accounts-2026-07-12.reviewed.md` (stress-tested via
architect refine → owner decisions → datastore/secrets spike
`spike-datastore-secrets-2026-07-12.md` → adversarial red-team
`design-user-accounts-2026-07-12.adversarial.md`). Constitution amended
(1.5.0). Next: refine `datamodel` + `infrastructure`, then `/ardd-plan` Phase 1.

No sibling worktrees, no draft PRs. Working tree is dirty — the amended
`constitution.md` and the four design/spike docs are uncommitted on `main`.

## Recommended Next Step

`/ardd-refine datamodel` — add `User`, `Participant.userId?` (optional),
`CatalogueMembership` (with key-epoch + stable-id key per §13 S5/S8), and a
revocable server-side `sessions` table (§13 S2). Then `/ardd-refine
infrastructure` (OAuth flow, cookie/WS identity + Origin check, out-of-band
Postgres + sealed secrets, DB-optional boot, re-lock-on-host-change), then
`/ardd-plan` for Phase 1. Consider committing the amended constitution + design
docs first.
