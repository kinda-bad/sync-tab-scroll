---
plan: plan-catalog-activation-key-access-2026-07-09.md
generated: 2026-07-09
status: in-progress
---

# Tasks

## Phase 1: Catalogue loading

- [x] T001 [artifacts: datamodel] Write a failing test (constitution
      Principle VII: test-first) for `server/src/catalog-loader.ts`'s new
      catalogue-discovery logic. Add `Catalogue` and `catalogueId` to
      `packages/shared/src/`'s types first (a new `Catalogue { id: string;
      name: string; public: boolean }` interface, and add `catalogueId:
      string` to `CatalogSong`) so the test can reference them. Cover, using
      `fs.mkdtempSync` fixtures like `catalog-loader.test.ts` already does:
      (a) a song directory directly under `catalogRoot` (today's flat
      layout) gets `catalogueId: "default"` and there's a `Catalogue { id:
      "default", name: "default", public: true }` in the returned list; (b)
      a subdirectory containing a `catalogue.json` (no content needed yet,
      just presence) is treated as a private `Catalogue`, and song
      directories nested one level inside it get that catalogue's id; (c) a
      subdirectory with no `catalogue.json` but containing further song
      subdirectories (rather than its own `meta.json`) is a public
      catalogue. Confirm the new cases fail before implementing (today's
      `loadCatalog` treats every top-level directory as a song directory).
- [ ] T002 [artifacts: datamodel] Implement the catalogue-discovery pass in
      `server/src/catalog-loader.ts`: for each top-level entry under
      `catalogRoot`, decide song-directory (has `meta.json`) vs.
      catalogue-directory (has `catalogue.json`, or has subdirectories with
      `meta.json` but no `meta.json` of its own) by checking for those
      marker files, not by name. `loadCatalog`'s return type changes from
      `CatalogSong[]` to `{ catalogues: Catalogue[]; songs: CatalogSong[] }`
      — update its one caller, `server/src/server.ts`'s
      `loadCatalog(config.catalogRoot, config.requireSongConsent)` call
      building `ctx.catalog`, and `server/src/handlers/context.ts`'s
      `HandlerContext.catalog` field type, accordingly (every existing
      `ctx.catalog.find(...)`/`ctx.catalog` reference in
      `song-select.ts`/`session-create.ts`/`session-join.ts` now reads
      `ctx.catalog.songs`, not `ctx.catalog` directly — Phase 3 handles the
      per-session filtering these call sites need; this task only fixes
      the type-level break). Make T001's tests pass; run the full server
      vitest suite to confirm no regressions to existing (non-catalogued)
      catalog loading.

Demonstrable: `loadCatalog()` returns both a `Catalogue[]` and
catalogue-tagged `CatalogSong[]` for a fixture catalog root mixing flat
songs and catalogue directories.

## Phase 2: `create-catalogue` pipeline CLI

- [ ] T003 [artifacts: datamodel] [parallel] Write a failing test
      (constitution Principle VII), in a new
      `packages/pipeline/src/create-catalogue.test.ts` mirroring
      `record-consent.test.ts`'s shape, for a new `createCatalogue`
      function: given `(catalogRoot, slug, name, visibility, key?)`, for
      `visibility: 'private'` it writes `<catalogRoot>/<slug>/catalogue.json`
      containing `{ name, salt, hash }` where `hash` equals
      `crypto.scrypt(key, salt, 64)` (hex) computed with that same `salt`;
      for `visibility: 'public'` it creates the directory but writes no
      `catalogue.json`. Confirm it fails before implementing (the function
      doesn't exist yet).
- [ ] T004 [artifacts: datamodel] Implement `createCatalogue` in a new
      `packages/pipeline/src/create-catalogue.ts`, mirroring
      `record-consent.ts`'s exact shape (an exported function plus a CLI
      `main()` guarded by the same `isMain` check, usage: `create-catalogue
      <catalogRoot> <slug> <name> <public|private> [key]`, erroring if
      `private` is given with no `key`). Use `node:crypto`'s
      `randomBytes(16).toString('hex')` for the salt and
      `scryptSync(key, salt, 64).toString('hex')` for the hash (sync is
      fine — this runs once, interactively, in a short-lived CLI process,
      not in the server's request path). Make T003's tests pass.

Demonstrable: running `create-catalogue <root> premium-pack "Premium
Pack" private s3cr3t` produces a `catalog/premium-pack/catalogue.json`
that Phase 1's loader (T002) correctly reads as private.

## Phase 3: Session-aware catalog delivery

- [ ] T005 [artifacts: infrastructure] Write a failing test (constitution
      Principle VII) for a new pure function (e.g.
      `server/src/catalog-loader.ts`'s `visibleCatalog(catalog, session)`
      or similar — co-locate near `loadCatalog`, same file, since it
      operates on the same `{ catalogues, songs }` shape) that takes the
      full `{ catalogues: Catalogue[]; songs: CatalogSong[] }` plus a
      `Session` (specifically its `unlockedCatalogueIds`) and returns the
      filtered `{ catalogues, songs }` to actually send: all `Catalogue`
      metadata always included; a `CatalogSong` is included only if its
      `catalogueId`'s catalogue is public OR `catalogueId` is in
      `unlockedCatalogueIds`. Cover: a session with `unlockedCatalogueIds:
      []` excludes a private catalogue's songs but keeps its metadata; a
      session that has already unlocked it includes those songs too.
- [ ] T006 [artifacts: infrastructure] Implement `visibleCatalog` (make
      T005 pass), then use it everywhere a `catalog` message is currently
      sent: `server/src/handlers/session-create.ts` and
      `server/src/handlers/session-join.ts`'s
      `ctx.connections.send(socket, { type: 'catalog', songs: ctx.catalog
      })` calls become `ctx.connections.send(socket, { type: 'catalog',
      ...visibleCatalog(ctx.catalog, session) })` (both already have
      `session` in scope). Update `ServerMessage`'s `catalog` variant in
      `packages/shared/src/messages.ts` to also carry `catalogues:
      Catalogue[]` alongside `songs: CatalogSong[]`. Update
      `song-select.ts`'s `ctx.catalog.find(...)` to search
      `ctx.catalog.songs` (per T002's note) — searching the *full*
      server-global list is correct there, since song-select itself
      doesn't need to re-derive visibility, only look up by id. Run the
      full server vitest suite to confirm no regressions.

Demonstrable: two sessions, one with a catalogue unlocked and one
without, receive different `catalog` payloads from the same server-global
catalogue set.

## Phase 4: `catalogue-unlock` message

- [ ] T007 [artifacts: datamodel, infrastructure] Write a failing test
      (constitution Principle VII) for a new
      `server/src/handlers/catalogue-unlock.ts` handler, mirroring
      `song-select.ts`'s test shape (`song-select.test.ts`). Add
      `catalogue-unlock: { type: 'catalogue-unlock'; catalogueId: string;
      key: string }` to `ClientMessage` in
      `packages/shared/src/messages.ts` first. Cover: correct key appends
      `catalogueId` to `session.unlockedCatalogueIds` and the handler
      calls `ctx.connections.broadcast` twice (once for `session-state`,
      once for `catalog` built via T006's `visibleCatalog`); wrong key
      sends an `error` to the requester only, no broadcast, no state
      change; non-host sender gets the same `error` as `song-select.ts`'s
      "Only the host can..." pattern; unknown `catalogueId` or a
      `catalogueId` with no `catalogue.json` (i.e. actually public, or
      already in `unlockedCatalogueIds`) is also an `error`, distinct
      message text but same shape.
- [ ] T008 [artifacts: datamodel, infrastructure] Implement the
      `catalogue-unlock` handler: look up the catalogue's stored
      `{ salt, hash }` (needs `ctx.catalog.catalogues` to carry the raw
      salt/hash for private catalogues server-side — extend the
      in-memory `Catalogue` shape server-side only, e.g. a
      `server/src/handlers/context.ts`-local type or a second field on
      `HandlerContext`, since `packages/shared`'s `Catalogue` — sent to
      clients — must never carry `salt`/`hash`), compute
      `crypto.scryptSync(message.key, storedSalt, 64)`, and compare with
      `crypto.timingSafeEqual` against the stored hash buffer (not `===`
      on the hex strings — decode both to buffers first).
      Wire the handler into `server/src/dispatch.ts`'s switch, matching
      every other case's one-line `return handleX(ctx, socket, message);`
      shape. Make T007's tests pass; run the full server vitest suite.

Demonstrable: a scripted WS client can unlock a private catalogue
mid-session and see its songs appear in a subsequent `catalog` message.

## Phase 5: UI

- [ ] T009 [artifacts: ui] Implement catalogue grouping in the client's
      song/part modal catalog picker (find the existing flat list-picker
      component under `client/src/` — likely within the song-selection
      part of the settings/song-part modal component tree). Group
      `clientStore`'s `catalog.songs` by `catalogueId`, keyed against
      `catalog.catalogues` for display name/public flag. A public
      catalogue (including `"default"`) renders its songs directly under
      its name, same as today's flat list. A catalogue whose songs aren't
      present in the current `catalog.songs` payload (i.e. not yet
      unlocked — distinguishable from "has zero songs" by checking
      `catalog.catalogues` for its existence with no matching songs, which
      is the locked case since a real empty public catalogue is an edge
      case this task doesn't need to special-case further) renders a
      locked indicator instead of a song list. Host-only: an "Enter
      activation key" control on a locked catalogue's group header that
      sends `catalogue-unlock { catalogueId, key }` via the existing
      `wsClient.send`. No test required for this task — covered by T010.
- [ ] T010 [parallel] Write a Playwright CT test (`*.ct.spec.ts`,
      following an existing modal-related CT spec's shape, e.g.
      `SettingsModalHarness`'s pattern) covering: a public catalogue's
      songs render directly in the picker; a locked private catalogue
      shows the locked indicator instead of a song list; the host-only
      "Enter activation key" control is present for a host-role harness
      state and absent for a non-host one. This is test-after for a UI
      task per the constitution's paradigm rules (T009 has no paired
      pre-test the way the test-first server tasks above do, since it's a
      UI implementation task, not a test task in the Phase Breakdown's own
      terms) — write it against the real T009 implementation, confirm it
      passes.
- [ ] T011 Manual verify: start the server with one public and one
      private catalogue in its `CATALOG_ROOT` (use `create-catalogue`,
      T004, to set up the private one), open two browser sessions (one
      host, one participant) via `pnpm dev`. Confirm: the participant
      never sees an unlock control; the host sees it on the locked
      catalogue and can unlock it with the correct key; a wrong key
      produces a toast and no state change; after a correct unlock, both
      the host's and the participant's song/part modal show the
      previously-locked catalogue's songs without either of them
      refreshing.
