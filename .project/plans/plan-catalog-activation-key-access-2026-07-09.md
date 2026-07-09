---
status: approved
branch: catalog-activation-key-access
created: 2026-07-09
features: [catalog-activation-key-access]
surfaced-defects: []
---

# Catalogue Activation Key Access

## Goal

Let an operator gate one or more song catalogues behind a per-catalogue
activation key, so a public deployment can offer private content a host
unlocks per-session, without introducing accounts or auth.

## Scope

**In scope**: the `Catalogue` entity and `CatalogSong.catalogueId`;
`Session.unlockedCatalogueIds`; the `catalogue-unlock` WS message and its
hashed-key verification; catalog-loader.ts's catalogue discovery
(backward-compatible with today's flat `catalog/<song-slug>/` layout);
the `create-catalogue` pipeline CLI; the song/part modal's
catalogue-grouped picker with a host-only unlock control.

**Out of scope**: per-user credentials or accounts of any kind (the key
is a per-catalogue shared secret, matching this app's no-auth posture);
rate limiting or lockout on repeated wrong-key attempts (Production
Posture's existing scope already excludes this); migrating any existing
flat catalog content into catalogues (the implicit `"default"` catalogue
makes that unnecessary).

## Technical Approach

See `datamodel.md`'s `Catalogue`/Catalogue Activation Key sections and
`infrastructure.md`'s Song Catalog Delivery / Catalogue Activation Key
Unlock sections for the full design. Summary: `catalog-loader.ts`
discovers catalogue directories (marked by a `catalogue.json`) versus
plain song directories (today's layout, treated as the implicit
`"default"` public catalogue) when scanning `CATALOG_ROOT`. The `catalog`
message sent to a client is filtered per-session: a private catalogue's
songs are included only if `Session.unlockedCatalogueIds` already
contains it — true both for a session's initial `catalog` delivery
(covers a reconnecting participant rejoining a session where the host
already unlocked something) and for the fresh `catalog` re-broadcast a
successful `catalogue-unlock` triggers. Activation keys are hashed
(`crypto.scrypt` + per-catalogue salt, `crypto.timingSafeEqual` for
comparison) — never stored or transmitted in plaintext.

## Phase Breakdown

### Phase 1 — Catalogue loading (no dependencies)

1. `[artifacts: datamodel]` Test: `catalog-loader.ts` discovers a
   catalogue directory (containing `catalogue.json`) versus a plain song
   directory, building a `Catalogue[]` list and tagging each loaded
   `CatalogSong.catalogueId` accordingly. Cover: a song with no catalogue
   directory gets `catalogueId: "default"`; a catalogue directory with no
   `catalogue.json` is public; one with `catalogue.json` is private.
   Follow the constitution's declared testing paradigm.
2. `[artifacts: datamodel]` Implement the catalogue-discovery pass in
   `catalog-loader.ts`. Make T001's tests pass; run the full server
   vitest suite to confirm no regressions to existing (non-catalogued)
   catalog loading.

Demonstrable: `loadCatalog()` returns both a `Catalogue[]` and
catalogue-tagged `CatalogSong[]` for a fixture catalog root mixing flat
songs and catalogue directories.

### Phase 2 — `create-catalogue` pipeline CLI (depends on Phase 1's
`catalogue.json` shape)

3. `[artifacts: datamodel]` Test: `create-catalogue` writes a
   `catalogue.json` with a random salt and a correct
   `crypto.scrypt(key, salt, 64)` hash for a private catalogue, and
   writes nothing (directory-only) for a public one. Test-first per the
   constitution.
4. `[artifacts: datamodel]` Implement `create-catalogue` in
   `packages/pipeline`, mirroring `record-consent`'s existing CLI shape.
   Make T003's tests pass.

Demonstrable: running `create-catalogue <root> premium-pack "Premium
Pack" private s3cr3t` produces a `catalog/premium-pack/catalogue.json`
that Phase 1's loader correctly reads as private.

### Phase 3 — Session-aware catalog delivery (depends on Phase 1)

5. `[artifacts: infrastructure]` Test: the `catalog` message built for a
   session with `unlockedCatalogueIds: []` excludes a private catalogue's
   songs but includes its `Catalogue` metadata (id/name/public); a
   session that has already unlocked it includes those songs too.
6. `[artifacts: infrastructure]` Implement the per-session filtering in
   whatever currently builds the `catalog` message at
   `session-create`/`session-join` time, threading the session's
   `unlockedCatalogueIds` through. Make T005's tests pass; run the full
   server vitest suite.

Demonstrable: two sessions, one with a catalogue unlocked and one
without, receive different `catalog` payloads from the same server-global
catalogue set.

### Phase 4 — `catalogue-unlock` message (depends on Phases 1-3)

7. `[artifacts: datamodel, infrastructure]` Test: `catalogue-unlock`
   correctly unlocks with the right key (`Session.unlockedCatalogueIds`
   gains the id, `session-state` and `catalog` both broadcast), rejects a
   wrong key as an `error`, rejects a non-host sender as an `error`,
   rejects an already-unlocked or unknown `catalogueId` as an `error`.
8. `[artifacts: datamodel, infrastructure]` Implement the
   `catalogue-unlock` handler (`server/src/handlers/`, following the
   existing handler-per-message-type pattern — constitution Principle
   IV), using `crypto.timingSafeEqual` for the hash comparison. Make
   T007's tests pass; run the full server vitest suite.

Demonstrable: a scripted WS client can unlock a private catalogue
mid-session and see its songs appear in a subsequent `catalog` message.

### Phase 5 — UI (depends on Phase 4)

9. `[artifacts: ui]` Implement catalogue grouping in the song/part
   modal's catalog picker: public catalogues (including `"default"`)
   list their songs directly; a locked private catalogue shows a locked
   indicator and, host-only, an "Enter activation key" control that
   sends `catalogue-unlock` and expands the group on success. A
   non-unlockable/wrong-key attempt surfaces as a toast (existing error
   pattern, `Toasts.svelte`).
10. `[parallel]` Client component test (Playwright CT) covering: a
    public catalogue's songs render directly; a locked private
    catalogue shows the locked indicator; the host-only unlock control
    is absent for a non-host participant.
11. Manual verify: with two participants (one host) against a server
    configured with one public and one private catalogue, confirm the
    non-host never sees an unlock control, the host can unlock, and both
    participants see the catalogue's songs appear after a successful
    unlock.

Demonstrable: the full flow works end-to-end in a real browser (or CT
harness), not just at the message-protocol level Phase 4 already proved.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| `crypto.scrypt` + `timingSafeEqual` for key verification, rather than a plain string comparison (like the existing Consent Record's `submitterName`) | User-requested step up from plaintext, given an activation key is meant to actually gate content — a materially different threat model than a free-text record-keeping field |
| Two separate broadcasts (`session-state` + `catalog`) on a successful unlock, rather than one combined message | Avoids introducing a third message shape that would just duplicate what these two already carry independently |

## Open Questions

None — the design is fully specified. (`infrastructure.md`'s pre-existing
`[OPEN: custom domain]` and `datamodel.md`'s pre-existing consent/ToS/
`lyricLineBreaks` open items are unrelated to this feature and untouched
by it.)

## Production Annotation Summary

- No rate limiting/lockout on repeated wrong-key `catalogue-unlock`
  attempts — annotate at the handler, referencing Production Posture's
  existing no-rate-limiting scope.
