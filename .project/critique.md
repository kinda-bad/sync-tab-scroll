# Critique
_Updated: 2026-07-01_

## infrastructure.md

- [x] **[S]** "Silent rejoin" (ui.md Landing View: persist code + display name so a refresh can rejoin) doesn't actually resume identity. `session-join.ts` always mints a fresh `participantId` and pushes a brand-new `Participant`, with no check against an existing disconnected participant. A page refresh therefore creates a duplicate participant instead of reclaiming the old slot — and if the refreshing user was host, `Session.hostId` keeps pointing at the now-permanently-disconnected old participant, so no one can ever perform a host action (song-select, playback-control, remove-participant) again for that session. This is the standard WS-reconnect footgun (no persistent participant token), and it's severe because it silently breaks a feature the artifacts explicitly promise.
  > `/ardd-feature reconnect-by-identity: session-join accepts/verifies a persisted participant token (not just displayName) and, when it matches an existing disconnected participant, reclaims that participant (including reassigning Session.hostId if the reconnecting participant was host) instead of always creating a new one`
  Resolved directly (not via /ardd-feature): added optional `participantId` to the `session-join` message; `session-join.ts` reclaims the matching participant (updates displayName/connectionStatus/readiness, keeps id/role — so `hostId` still matches) instead of always minting a new one. Client persists `{code, displayName, participantId}` via a new `session-persistence.ts` module (single writer, fires whenever a session exists) instead of Landing.svelte's ad hoc localStorage writes; `Landing.svelte`'s `onMount` now reconnects with the saved `participantId`. Verified live: host creates a session, socket closes ("refresh"), reconnects with the same code+participantId — one participant, same id, `hostId` unchanged.

- [ ] **[Q]** Related to the above but a separate decision: if the host disconnects and the grace-period timer expires without them reconnecting, should another connected participant be promoted to host, or does the session become permanently un-hostable until it's destroyed? No policy exists today. The answer changes whether "one person's connection blip kills the whole session's controls" is acceptable for a self-hosted/small-group tool (constitution.md Production Posture) or needs a succession rule.

- [ ] **[S]** `catalog-loader.ts`'s `loadCatalog` throws (`No .gp file found in catalog directory: ...`) on the *first* malformed song directory it encounters, which crashes server startup entirely — one bad catalog entry takes down the whole catalog, not just that song. infrastructure.md's "Song Catalog Delivery" section doesn't state a partial-load policy.
  > `/ardd-refine infrastructure catalog loading should catch and log a per-song error and skip that song rather than letting one malformed catalog directory crash the entire server startup`

## ui.md

- [ ] **[S]** The Lobby View's re-selection rule ("re-selecting a different song... resets those choices") is stated as if scoped to an actual change, but the underlying handler resets every participant's part/readiness unconditionally, even when the host re-selects the *already-selected* song (e.g. clicking "Change song" then picking the same entry again, or a double-click). That's a real, easy-to-trigger UX footgun, not just a theoretical edge case.
  > `/ardd-refine ui song selection should no-op (no reset, no re-broadcast beyond the ack) when the host selects the song that is already Session.selectedSong`

- [ ] **[S]** The persistent renderer-lifecycle decision — the alphaTab/headless instance is created the moment a participant's part is selected in the Lobby (not on entering the Playback view), and the instance/containers persist across the Lobby→Playback transition instead of being torn down and recreated — is a real, already-implemented architectural decision with no record in any artifact. ui.md's Loading state section describes *what* loading means but not *when* it's triggered relative to view, which is exactly the ambiguity this decision resolves.
  > `/ardd-refine ui document that renderer/headless-player creation is triggered once a participant's part is selected in the Lobby (not on entering Playback), and that the instance persists across the Lobby to Playback transition rather than being recreated`

## datamodel.md

- [ ] **[Q]** `CatalogPart.id` is, in the one place that produces it (`packages/pipeline`), always `String(track.index)` — i.e. it duplicates `CatalogPart.trackIndex` under a different type, with the convention living only in pipeline code, not stated as a contract in datamodel.md. Should `id` be dropped in favor of using `trackIndex` itself as the stable reference (simpler, one less field to keep in sync), or is the opaque string `id` intentionally reserved for a future where parts aren't 1:1 with GP tracks? Whichever way, the current silent duplication should stop being accidental.

- [ ] **[Q]** `Participant.selectedPart: string | 'lyrics' | null` reads as if `'lyrics'` were a distinguished case, but as a TypeScript union `'lyrics'` is already a member of `string` — the type gives zero compile-time separation between an instrument-part id and the literal `'lyrics'` sentinel; it's enforced only by convention and runtime checks. Worth a discriminated shape (e.g. `{ kind: 'instrument'; partId: string } | { kind: 'lyrics' } | null`), or is the current shape intentionally kept simple since it mirrors the wire message (`part-select`'s `part: string | 'lyrics' | null`) and a mismatch would be caught by the one place that reads it?

## constitution.md

- [ ] **[Q]** Principle I ("no shared mutable context objects... substitute for the store") — does it apply to non-serializable runtime handles like the `AlphaTabApi` instance, which now lives as module-level singleton state in `client/src/playback-engine.ts`, entirely outside `clientStore`? `Playback.svelte` reads it via a bare `getEngine()` export rather than a store subscription. Either this is an accepted, common exception for framework object handles that shouldn't be forced into reactive store values (and should be written into the constitution so it isn't flagged as a violation again later), or it should be refactored to expose at least a readiness/handle indicator through `clientStore`.

## Summary
4 suggestions · 4 questions · 0 risks across 4 artifacts.
