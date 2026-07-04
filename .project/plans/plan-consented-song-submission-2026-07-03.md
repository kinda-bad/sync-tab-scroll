---
status: approved
branch: consented-song-submission
created: 2026-07-03
features: [consented-song-submission]
---

# Plan: Consented public song submission

## Goal

Let an operator opt a deployment into requiring recorded per-song consent
before a submitted `.gp` file is served to anyone, while leaving today's
default (local/personal, no-auth, no-consent) behavior completely
unchanged.

## Scope

**In scope:**
- A server-side, opt-in consent gate (`ServerConfig.requireSongConsent`,
  env `REQUIRE_SONG_CONSENT`, default `false`) that `catalog-loader.ts`
  checks at startup.
- An on-disk per-song `ConsentRecord` (datamodel.md) written as a
  companion file in a song's existing `catalog/<slug>/` directory.
- A small CLI companion script (packages/pipeline) an operator runs to
  record consent for a song before flipping the gate on for a public
  deployment.
- Skipping (with a startup log, not silent) any song directory lacking a
  consent record once the gate is enabled.

**Out of scope (see Open Questions for why):**
- Any web upload form / HTTP submission endpoint.
- Any submitter identity, authentication, or session concept.
- Real ToS legal text — a placeholder/dev string is used; an operator
  supplies real text before an actual public launch.
- Per-submitter consent tracking across multiple songs (this plan is
  per-song).
- Any client-visible or `ui.md` change — the entire mechanism is
  operator/pipeline-side; no session participant or app UI ever sees a
  `ConsentRecord`.

## Technical Approach

Three artifacts were revised as part of this planning pass (already
applied to `.project/artifacts/`, not deferred to implementation):

- **infrastructure.md** — new "Song Consent Gate (Public Deployment
  Only)" section: the gate is a load-time filter in `catalog-loader.ts`,
  not a per-request/per-client check, because this app has no mechanism
  to identify "the submitter's own client" (no auth exists anywhere in
  the system). A song lacking consent is excluded from the published
  catalog for every client uniformly — including its own submitter —
  rather than selectively visible to them. This is the resolved reading
  of the feature's "not served to clients other than its own submitter"
  language; a submitter previews their own song via their own local/
  personal deployment (today's fully-supported, gate-off path), not by
  connecting to the public one pre-consent.
- **datamodel.md** — new "Consent Record" section: a per-song (not
  per-submitter) on-disk record (`submitterName`, `tosVersion`,
  `acceptedAt`), never part of the `CatalogSong` type and never sent to a
  client — it's read once by `catalog-loader.ts` at startup, the same way
  `meta.json`'s `lyricsTrackIndex`/etc. already are.
- **pipeline.md** — new "Consent Recording (Public Deployment Only)"
  section: an additive, optional step in the existing one-directory-per-
  song model. The extraction/fallback/publish pipeline stages themselves
  are completely unchanged; consent-recording is a separate companion CLI
  invocation writing one more file into a song's directory.

Implementation-side, this is a small, additive change: one new
`ServerConfig` field following the existing `hostReassignGraceMs` pattern,
one new server-side consent-check function `catalog-loader.ts` calls per
song directory, and one new small script in `packages/pipeline`. No
existing type, message, or client code changes at all.

## Phase Breakdown

### Phase 1 — Consent-gated catalog loading (server)
1. `[feature: consented-song-submission]` Write a failing test for
   `loadConfig()` picking up `REQUIRE_SONG_CONSENT` into
   `ServerConfig.requireSongConsent`, defaulting to `false` when unset
   (constitution Principle VII: test precedes implementation).
2. `[feature: consented-song-submission]` Add `requireSongConsent` to
   `ServerConfig` and `loadConfig()` (`server/src/config.ts`), matching
   the existing `hostReassignGraceMs`/`HOST_REASSIGN_GRACE_MS` pattern.
   Confirm T1's test now passes.
3. `[feature: consented-song-submission]` Write a failing test for a new
   `hasConsent(songDir): boolean` (or equivalent) helper: reads a song
   directory's consent-record file, returns `false` if absent or
   malformed, `true` if present and well-formed.
4. `[feature: consented-song-submission]` Implement the consent-check
   helper (new small module, e.g. `server/src/consent.ts`) and the
   `ConsentRecord` shape from datamodel.md. Confirm T3's test passes.
5. `[feature: consented-song-submission]` Write a failing test for
   `catalog-loader.ts`: when `requireSongConsent` is `true`, a song
   directory without a consent record is excluded from the returned
   `CatalogSong[]`; when `false` (default), every song directory loads
   exactly as today regardless of consent-record presence.
6. `[feature: consented-song-submission]` Wire the consent check into
   `catalog-loader.ts`, gated on `ServerConfig.requireSongConsent`, with a
   startup log line naming any skipped song directories and why. Confirm
   T5's test passes, and confirm the full existing server test suite
   still passes (no regression to the ungated default path).

### Phase 2 — Consent-recording CLI companion (pipeline)
7. `[feature: consented-song-submission]` Write a failing test for a new
   `record-consent` pipeline script (packages/pipeline): given a
   song-slug, submitter name, and ToS version, it writes a well-formed
   consent-record file into that song's `catalog/<slug>/` directory
   (creating the file, not mutating existing pipeline outputs).
8. `[feature: consented-song-submission]` Implement the script and wire
   it as a `package.json` bin/script entry in `packages/pipeline`,
   following the existing single-consolidated-script convention
   (pipeline.md). Confirm T7's test passes.

### Phase 3 — Documentation & production annotation
9. Add a production annotation (per constitution's Development Workflow
   convention) at the point the placeholder ToS version/text lives,
   flagging that real ToS legal text must replace it before an actual
   public deployment.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New opt-in server config flag + branch in `catalog-loader.ts` (two load-time behaviors instead of one) | Directly required by the feature: the constitution's Production Posture explicitly scopes this app as self-hosted/small-group by default, so the consent gate must be strictly additive and off-by-default rather than changing default behavior for every existing deployment. |

## Open Questions

- **[OPEN] Per-song vs. per-submitter consent** — this plan records
  consent per song (simpler, no new submitter-identity entity). If the
  same person submits many songs, they re-record consent each time.
  Rejected per-submitter registry as unnecessary complexity with no
  current evidence of need; revisit if this becomes real friction.
- **[OPEN] CLI drop-in vs. web upload form** — this plan uses a CLI
  companion script, matching the pipeline's existing operator-driven,
  offline model. A web upload endpoint was considered and rejected: it
  would introduce a public-facing HTTP surface accepting arbitrary file
  uploads (a materially different threat model than this app's stated
  posture), submitter identity/session handling that doesn't otherwise
  exist, and file-validation/staging concerns with no current evidence of
  need. Revisit only if an operator reports the CLI step is a genuine
  adoption blocker.
- **[OPEN] Real ToS text** — this is a legal decision, not a design one.
  Not resolved by this plan; a placeholder/dev `tosVersion` string is
  used until an operator supplies real ToS text (see Production
  Annotation Summary).
- **[OPEN] "Not served to clients other than its own submitter," taken
  literally** — the feature's own wording implies per-submitter
  visibility (the submitter can see their own unconsented song; others
  can't). This plan resolves it as global exclusion instead (no one sees
  it, submitter included, until consent is recorded) because this app has
  no auth and therefore no way to distinguish "the submitter's client"
  from any other connecting client. True per-submitter visibility would
  require introducing real authentication — a much larger, currently
  out-of-scope change to this app's constitution-level Production
  Posture. Flagging explicitly rather than silently picking the reading
  that happens to require no new infrastructure.

## Production Annotation Summary

- Placeholder `tosVersion` value/text used until an operator supplies
  real ToS legal language — annotate at the point this is implemented
  (Phase 2, T7/T8) per constitution's Development Workflow convention.
