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
-->

---
name: constitution
status: stable
last_updated: 2026-07-01
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

**Version**: 1.2.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-07-01
