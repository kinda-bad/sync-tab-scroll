---
status: approved
branch: readme-local-setup-and-gp-ingestion
created: 2026-07-06
features: [readme-local-setup-and-gp-ingestion]
surfaced-defects: []
---

# Plan: README local setup and .gp ingestion docs

## Goal

The README has a clear, accurate, copy-pasteable section for getting the
app running locally and for adding a `.gp` file to the catalog — verified
by actually running every documented command, not just described from
memory.

## Scope

**In scope:**
- A new "Getting Started" section covering: prerequisites, install,
  `.env` setup (`server/.env`/`client/.env` from their `.env.example`
  files, constitution Principle VIII), running the dev servers, and
  accessing the app — including the real Chrome port-6000 gotcha
  discovered this session (`client/vite.config.ts`'s dev server is
  hardcoded to port 6000, which Chrome refuses to navigate to as an
  unsafe port; Firefox/Safari work, or override with `vite --port
  <other>`).
- A new "Adding a song" section covering the `.gp` ingestion CLI
  (`extract-lyrics <source.gp> <catalogRoot>`), what it produces, and a
  brief pointer to the consent step (`record-consent`) for public
  deployments only — not duplicating pipeline.md's/datamodel.md's detail,
  just enough for a contributor to get a song into their local catalog.
- A short "Running tests" section (server/client vitest, CT, e2e
  commands) so a new contributor can verify their setup actually works.

**Out of scope:**
- The existing auto-generated Mermaid diagram sections (Datamodel,
  Infrastructure, UI) — untouched, still owned by `/ardd-render`.
- Any change to `.project/artifacts/*.md` — this is a pure documentation
  task with nothing for those artifacts to newly describe (constitution
  Principle VII's documentation-only exception to test-first applies;
  verification here is running each command for real, not writing tests).
- Public-deployment-specific setup (real ToS text, CI, etc.) — out of
  scope per datamodel.md's own open questions on that topic.

## Technical Approach

Every command in the new README sections gets verified by actually
running it in this repo (not transcribed from memory) before being
written down — install, `.env` copy, `pnpm dev`, hitting the client URL,
running `extract-lyrics` against a real `.gp` file, and each test-suite
command. This mirrors how the port-6000/Chrome issue and the
`CATALOG_ROOT`-must-be-absolute-or-correctly-relative gotcha were
actually discovered this session — by running things, not assuming.

Placement: a new "## Getting Started" section (with "Adding a song" and
"Running tests" as subsections) inserted right after the existing intro
paragraph, before the "## Datamodel" diagram section — the first thing a
new contributor needs, ahead of the architecture diagrams.

## Phase Breakdown

### Phase 1 — Local dev setup
- [ ] Write and verify the prerequisites/install steps (Node/pnpm
  versions actually required — check `package.json`'s `engines` field if
  present, or state what was actually tested with).
- [ ] Write and verify the `.env` setup steps: copy
  `server/.env.example` → `server/.env` and `client/.env.example` →
  `client/.env`, confirm `PORT`/`VITE_BACKEND_PORT` must match
  (constitution Principle VIII's existing comment already states this).
- [ ] Write and verify `pnpm dev` actually starts both servers and the
  app is reachable — document the real default port(s) and the Chrome
  port-6000 restriction with a workaround.

### Phase 2 — .gp ingestion
- [ ] Write and verify the `extract-lyrics <source.gp> <catalogRoot>`
  command end-to-end against a real `.gp` file, confirming what files it
  actually produces in the catalog directory.
- [ ] Write a brief pointer to `record-consent` for public-deployment
  submissions (per `REQUIRE_SONG_CONSENT`), linking to datamodel.md
  rather than duplicating its detail.

### Phase 3 — Running tests
- [ ] Write and verify the test-suite commands (server vitest, client
  vitest, CT, e2e) actually run clean from a fresh state.
- [ ] Full read-through of the new README sections against a genuinely
  fresh perspective (or as close as achievable) — confirm no step assumes
  undocumented prior knowledge.

## Complexity Tracking

None — documentation-only change, no code/architecture.

## Open Questions

None blocking.

## Production Annotation Summary

None — no production shortcuts introduced.
