<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
Added sections: all (initial)

Version change: 1.0.0 → 1.0.1
Resolved: deployment scale/audience open question (self-hosted/
small-group, no auth/rate-limiting requirement). Clarification only,
no principle redefined.

Version change: 1.0.1 → 1.1.0
Added: Core Principle V (Check Library Idioms Before Building Custom
Mechanism). Rationale: the live-rendering pivot (datamodel.md, pipeline.md,
infrastructure.md, ui.md) removed a whole reconciliation layer
(`LayoutMap`, per-density SVG pre-rendering) that existed only because the
prior design didn't use alphaTab's own built-in cursor and rendering
model. The custom mechanism was built to solve a problem the library
already solved natively.

Version change: 1.1.0 → 1.2.0
Added: Core Principle VI (Named Types Over Inline Duplication).
Rationale: `Participant.selectedPart` and the `part-select` wire
message's `part` field were both hand-typed as `number | 'lyrics' | null`
independently, with nothing tying them together — caught during an
`/ardd-critique` pass on the song-catalog-selection feature.

Version change: 1.2.0 → 1.3.0
Added: Core Principle VII (Test-First Development). Rationale: a task in
the lobby-cursor-modes implementation required a scripted test with no
test runner or test file anywhere in the repo to write it against —
every handler "tested" up to that point had only been verified manually.
This principle backs an assumption `/ardd-implement`'s own rules already
made but the constitution never actually required, and names the
resulting gap (client, shared, and nearly all of server currently
untested) as a present violation, not a grandfathered one. Follow-up:
run `/ardd-verify` to log the gap in `DEFECTS.md`, then backlog closing
it via `/ardd-feature` or a `/ardd-plan` pass.

Version change: 1.3.0 → 1.4.0
Added: Core Principle VIII (Config via .env, Synced by Example). Rationale:
config values (PORT, CATALOG_ROOT, VITE_BACKEND_PORT, HOST_REASSIGN_GRACE_MS,
REQUIRE_SONG_CONSENT) are currently set ad hoc via shell env-var prefixes
scattered across playwright.config.ts's webServer commands and package.json
scripts, with no single file a developer can inspect for the full set —
and this already caused a real bug this session: `VITE_BACKEND_PORT=6081`
prefixed only the first half of a `build && preview` command, so `preview`
silently re-read vite.config.ts with the var unset and proxied to the wrong
backend, with no error anywhere. A single `.env` (git-ignored, since it may
hold real secrets once a public-deployment posture is pursued) plus a
lint-enforced `.env.example` closes exactly that class of drift going
forward. Not yet implemented — no `.env`/`.env.example`/lint script exists
yet; this records the intended design ahead of building it.
-->

---
name: constitution
status: stable
last_updated: 2026-07-04
---

# sync-tab-scroll Constitution

## Project Scope & Intent

A synchronized tab-scrolling app for musicians playing together remotely:
participants join a shared session, each follows their own instrument part,
and tab scrolling/lyrics/metronome stay in lockstep, driven by a session
host. This is a rebuild of an earlier project (`sync-scroll`) that worked
functionally but accumulated architectural drift across 16 incrementally
bolted-on features. The rebuild's purpose is to fix that drift at the root —
not to change what the app does, but how its code is organized and kept
honest over time.

Deployment scale/audience: self-hosted/small-group tool, not public/
untrusted traffic — same trust model as sync-scroll. No auth or rate
limiting required by this constitution. Hardening remains a real future
direction (see infrastructure.md's Production Posture), so code
shouldn't make adding it later a rewrite, but it isn't built now.

## Core Principles

### I. Single Source of State

Application state lives in one reactive store per runtime (client store,
server session store). No shared mutable context objects (plain objects
threaded by reference between modules so "mutations are visible to both
sides") are permitted as a substitute for the store. If two modules need to
see the same state, they read from and write through the store — not a
side-channel object.

*Rationale*: sync-scroll's client had a real reactive store (Alpine) sitting
unused next to hand-rolled mutable context objects (`LayoutCtx`,
`HandlerCtx`) threaded through `index.ts` and `ws-handler.ts`. This produced
non-obvious data flow and a comment explicitly justifying the workaround
instead of fixing it.

### II. No Dead Architecture

When an approach is replaced, the old approach is deleted in the same
change — not archived in place, not left "for reference" in a directory
that no longer exists in practice. Documentation describes only what is
actually true of the current codebase; a README that references a removed
directory or an unused dependency is a bug.

*Rationale*: the tab pipeline pivoted from MIDI-based to Guitar-Pro-based
rendering. The README still claimed an old pipeline was "preserved... for
reference" in a directory that didn't exist, an unused Python venv remained
on disk, and `package.json` referenced a script file that no longer existed.

### III. Bootstrap/entry files wire dependencies only

Application entry points (e.g. a client `index.ts`, a server `index.ts`)
are limited to: reading config, constructing dependencies, and starting the
app. Business logic, DOM/transport glue, and persistence concerns each live
in their own module with a single responsibility, imported by the entry
point — never defined inline in it.

*Rationale*: sync-scroll's `client/src/index.ts` (398 lines) mixed Alpine
wiring, sessionStorage persistence, a ResizeObserver-driven density
checker, SVG loading, and app boot in one file with no internal boundaries.

### IV. Dispatch surfaces are decomposed by concern, not left as one switch

Large message/event dispatchers (e.g. a WebSocket message handler) route to
named handler functions or methods, one per message/event type. Each
handler is independently readable without scrolling through unrelated
cases. Duplicated logic across cases (e.g. two cases that both rebuild a
snapshot, save it, and sync three UI refs) is extracted, not copy-pasted.

*Rationale*: sync-scroll's client `createMessageHandler` was a 300-line
switch over 20 message types in one function; `session-created` and
`session-joined` duplicated ~15 lines of identical logic verbatim. The
server's equivalent (`MessageRouter`) already followed this principle
correctly and is the model to replicate.

### V. Check Library Idioms Before Building Custom Mechanism

Before implementing a custom mechanism to solve a problem in a concern
already owned by a library the project depends on, check whether that
library has a built-in, idiomatic way to solve it. Reaching for a hand-
built solution without checking is treated the same as introducing an
abstraction the codebase doesn't need — it should be surfaced as a
question ("does alphaTab already do this?") before being built, not
discovered as duplicated work later.

*Rationale*: sync-scroll's tab-scroll cursor was a hand-built overlay
reconstructed from a separately computed `LayoutMap`, because it wasn't
known that alphaTab's playback module already ships a native cursor
(`.at-cursor-bar`/`.at-cursor-beat`) derived from the same render pass as
the staff. That mismatch between the overlay and the staff was a real,
recurring bug class — one that the live-rendering pivot eliminated
structurally by using alphaTab's built-in cursor instead of reconciling
against one.

### VI. Named Types Over Inline Duplication

Favor named, exported types over inline type literals. If a type is used
in more than one place, it must be a named type with a single source of
truth — not independently retyped at each usage site, even if the
inline shapes happen to match today.

*Rationale*: `Participant.selectedPart` and the `part-select` wire
message's `part` field were both hand-typed as `number | 'lyrics' | null`
independently. Nothing enforced they stayed in sync — a future change to
one could silently drift from the other, since structurally-identical
inline types give TypeScript no way to flag the mismatch. Surfaced during
an `/ardd-critique` pass, not by a compile error.

### VII. Test-First Development

Every code change — client, server, and shared packages alike — is preceded
by a test that exercises the behavior being added or changed, written and
confirmed to fail before any implementation code is written. A task without
a test requirement is the exception (e.g. a pure research/decision task or
a documentation-only change), not the default; when in doubt, write the
test. This applies to the whole codebase, not just new features — there is
no carve-out for existing modules to remain untested indefinitely.

*Rationale*: `/ardd-implement`'s own task-execution rules already assumed
this ("write and fail the test before any implementation begins"), but no
constitution principle actually backed that assumption — until this
amendment, nothing in this document required a test runner to exist at
all. That gap was concrete, not theoretical: implementing the Spotlight-mode
feature (`plan-lobby-cursor-modes-2026-07-03.md`) hit a task requiring a
scripted test with no test runner, no `*.test.ts` file, and no WS test
harness anywhere in the repo to write it against — every prior "tested"
handler had only ever been verified manually. This principle closes that
gap going forward and puts a name on the standing violation it already
created: the current lack of coverage across `client`, `packages/shared`,
and all of `server` except one handler is a real, present violation of this
principle, not a pre-existing condition it grandfathers in.

### VIII. Config via `.env`, Synced by Example

Application config values (ports, feature flags, external URLs, and any
future secrets) are read from a single `.env` file per app/package that
needs one — not scattered `process.env.X ?? <inline default>` calls
treated as the source of truth with no single file a developer can
inspect for the full set. `.env` is git-ignored: it may eventually hold
real secrets (e.g. once a public-deployment posture is pursued), and a
config file that mixes committed and secret values invites a leak the
moment one more key is added carelessly. A companion `.env.example` is
committed and kept in lockstep: every key in `.env` has a matching key in
`.env.example`, populated with a sensible default for a non-secret value
or an obvious placeholder for a secret one — never a real secret value. A
lint check enforces the two files have the same key shape (same keys
present, neither missing any the other has), run both pre-commit and in
CI, so a key added to one and forgotten in the other fails loudly instead
of silently drifting.

*Rationale*: config values (server's `PORT`/`CATALOG_ROOT`/
`HOST_REASSIGN_GRACE_MS`/`REQUIRE_SONG_CONSENT`, client's
`VITE_BACKEND_PORT`) are currently set ad hoc via shell env-var prefixes
scattered across `playwright.config.ts`'s `webServer` commands and
`package.json` scripts, with no single file holding the full set. This
already produced a real, silent bug this session: `VITE_BACKEND_PORT=6081`
prefixed only the `build` half of a `build && preview` shell command —
env-var prefixes don't carry across `&&` — so the `preview` process
silently re-read `vite.config.ts` with the var unset, falling back to the
wrong backend port for its `/catalog` proxy, with no error surfaced
anywhere; it only showed up as a test rendering nothing. A single,
inspectable `.env` per app, with a lint-enforced example file, closes
exactly this class of drift going forward — a scattered, inline-default
config surface is a config-specific instance of Principle I's single-
source-of-state requirement.

## Quality Standards

- A `package.json`'s declared `name` and `scripts` must match the actual
  package and files on disk. A stale script entry is treated as a bug, not
  background noise.
- No vendored third-party code carries its own nested `.git` directory. If
  a dependency must be vendored, its provenance is recorded in a README
  note and it is committed as plain files, or it is added as a real git
  submodule — never silently nested.
- Component/handler references that must survive across a reactive
  framework's lifecycle hooks are documented at the point of definition,
  not left as a bare comment warning future readers not to break them.

## Development Workflow

1. New features go through ADD: refine the relevant artifact(s) before
   writing code, run `/ardd-analyze` before planning, plan, then implement.
2. Each feature's task list declares which artifacts it depends on, per
   ADD's task format — keeping context loading scoped per task.

## Governance

This constitution supersedes all other practices documented in the
repository. Amendments require:

1. A written rationale explaining why the current principle is insufficient.
2. An updated Sync Impact Report (prepended as an HTML comment).
3. Version increment per semantic versioning: MAJOR for principle removal or
   redefinition; MINOR for new principle or material expansion; PATCH for
   clarifications or wording fixes.
4. `last_updated` date updated in frontmatter.

**Version**: 1.4.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-07-04
