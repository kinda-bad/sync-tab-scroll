# Defects

_Last verified: 2026-07-10_

Full pass re-surveying the codebase against every artifact, prompted by the
volume of new code merged since the 2026-07-07 pass: `railway-terraform-deployment`
(Dockerfile, `infra/` Terraform, same-origin WS production mode) and
`catalog-activation-key-access` (catalogue loading, `create-catalogue`,
per-session catalog filtering, the `catalogue-unlock` handler, and the
catalogue-grouped picker).

## infrastructure.md

- **Claim:** "Selecting a song from a catalogue the session hasn't unlocked
  is rejected as an error (mirroring an invalid `CatalogSong.id`) — this can
  only happen from a stale/tampered client" (Song Catalog Delivery section).
  **Actual:** `handleSongSelect` looks the song up in the *full*
  server-global `ctx.catalog.songs` list and accepts any valid id, with no
  check that the song's `catalogueId` is public or in
  `session.unlockedCatalogueIds`. A stale/tampered client can therefore
  select a locked private catalogue's song, and it is broadcast as the
  session's `selectedSong` — the documented rejection is not implemented.
  **Location:** `server/src/handlers/song-select.ts:16-30` (no
  `unlockedCatalogueIds`/`catalogueId` guard); contradicted claim at
  `.project/artifacts/infrastructure.md:282-286`.
  **Severity:** broken-contract. Note: this was a deliberate choice in the
  implementing task (`tasks-catalog-activation-key-access-436e.md` T006's
  note — "searching the *full* server-global list is correct there, since
  song-select itself doesn't need to re-derive visibility, only look up by
  id"), but `infrastructure.md` was not reconciled to match. Resolve by
  either adding the visibility guard to `song-select.ts` (via
  `/ardd-feedback` → next plan) or refining the artifact's claim to match
  the implemented behavior (via `/ardd-refine infrastructure`). Practical
  blast radius is limited: a normal client only ever receives the filtered
  (unlocked) song list, so only a tampered/stale client can reach this, and
  the catalogue's static `.gp` assets are already served uncontrolled under
  `/catalog/...` regardless — the unlock gate is a catalog-listing gate, not
  an asset-access gate.

## datamodel.md

No defects found. The `Session`, `Participant`, `CatalogSong`, `Catalogue`,
`CatalogPart`, and `PlaybackState` shapes match
`packages/shared/src/index.ts`; `CatalogSong.catalogueId` and
`Session.unlockedCatalogueIds` are present as documented. The Consent Record
matches `server/src/consent.ts`; the Catalogue Activation Key's on-disk
`{ salt, hash }` shape (`scrypt(key, salt, 64)` hex) matches
`packages/pipeline/src/create-catalogue.ts` and the server-side
`LoadedCatalogue` in `server/src/catalog-loader.ts`, which correctly keeps
`salt`/`hash` off the client-facing `Catalogue`.

## pipeline.md

No defects found. `create-catalogue` exists with the documented signature
(`<catalogRoot> <slug> <name> <public|private> [key]`), writes
`catalogue.json` only for private catalogues, and never persists the raw
key. `packages/pipeline/package.json`'s `name`/`scripts` match what's on
disk (`extract-lyrics`, `record-consent`, `create-catalogue`), satisfying
the Constitution Compliance claim. The extraction/publish logic is unaware
of catalogue nesting, as documented.

## infrastructure.md (Deployment) — verified clean

The Railway + Terraform section matches the code: a top-level `Dockerfile`
builds the workspace and runs the one-process server; `infra/` holds
`main.tf`/`variables.tf`/`versions.tf`/`outputs.tf`/`README.md` using the
`terraform-community-providers/railway` provider (flagged as community-
maintained), local `terraform.tfstate` (gitignored, no remote backend), a
Railway volume whose mount path drives `CATALOG_ROOT`, and
`REQUIRE_SONG_CONSENT = "true"` on the deployed service. The same-origin
`wss://` production WS mode is implemented (`client/src/ws-client.ts`'s
`buildWsUrl`, covered by `ws-client.test.ts`).

## ui.md

No defects found in the surveyed area. The catalogue-grouped picker
(`client/src/components/SongPartModal.svelte`) matches the described
behavior: songs grouped by catalogue when more than one exists, a locked
private catalogue shows a locked indicator instead of a song list, and a
host-only "Enter activation key" control sends `catalogue-unlock` with a
wrong-key failure surfacing as a toast (shared error path in
`ws-client.ts`).

## constitution.md, brand.md

No defects found on spot-check. Principle IV (one handler per message type)
holds — `catalogue-unlock` is its own handler wired through `dispatch.ts`.
Principle V (no new dependency) holds — key hashing uses Node's built-in
`crypto`. Principle VIII's `.env`/`.env.example` parity is intact for
`server`/`client`, and its scope-split from Terraform-managed deployed
config is honored. `brand.md` (themes) was unchanged by recent work and
matched at the prior full pass.

## Not exhaustively re-surveyed this pass

`brand.md`'s full theme/token inventory and the older
lyrics/playback/host-succession surfaces were spot-checked against the prior
clean pass rather than re-read line-by-line; this pass concentrated on the
code that changed since 2026-07-07. A defect there would not have been
caught here.
