# Defects

_Last verified: 2026-07-03_

## ui.md

- **Claim:** "The host sees a 'Make host' control on every other **connected**
  participant's row (never their own)."
  **Actual:** `SettingsModal.svelte:80-82` gates "Make host" on `{#if
  isHost && !isSelf}` only — there is no `connectionStatus === 'connected'`
  check, so the button renders on a disconnected participant's row too.
  The document's own States section ("host-delegation/decline targeting a
  participant who's no longer connected... a race between clicking a Host
  Transfer control and that participant's state changing") already
  implicitly acknowledges this can happen, contradicting the "connected"
  qualifier in the Participants bullet.
  **Location:** `ui.md:89`; `client/src/components/SettingsModal.svelte:80-82`
  **Severity:** drift

- **Claim:** (implicit ordering) The Participants tab bullet describes
  Spotlight mode's paragraph first, then "Also holds Host Transfer
  controls" as a separate addendum, then the Metronome/Count-in paragraph.
  **Actual:** The real DOM order in `SettingsModal.svelte` is: participant
  rows (carrying the Host Transfer controls) render first (lines 69-88),
  *then* the "Lobby cursor" section and its `cursor-controls` div
  containing Set/Clear/Spotlight/Metronome/Count-in (lines 90-117) — i.e.,
  Host Transfer controls actually come *before* Spotlight mode/Metronome/
  Count-in in rendering order, not after as the prose's paragraph
  sequence implies.
  **Location:** `ui.md:76-132`; `client/src/components/SettingsModal.svelte:69-117`
  **Severity:** cosmetic

- **Claim:** Metronome/Count-in toggles are described as "Below the
  lobby-cursor controls."
  **Actual:** They're the last two `<Button>` elements inside the same
  `.cursor-controls` flex div as the lobby-cursor input/Set/Clear/
  Spotlight controls (`display: flex`, no `flex-wrap`) — visually
  alongside/after them in one row, not in a distinct block "below."
  **Location:** `ui.md:118`; `client/src/components/SettingsModal.svelte:97-116`,
  `.cursor-controls` style block
  **Severity:** cosmetic

All three defects originate from the same source: my manual resolution
of the `host-transfer` ↔ `metronome-count-in-toggle` merge conflict in
`ui.md`'s Participants tab bullet combined two independently-drafted
descriptions by concatenation rather than re-deriving the paragraph from
the actual merged component. Landing View, the Lobby hint-line ordering,
Playback View, and States are otherwise all re-verified and still hold
exactly as documented.

## datamodel.md

No defects found this pass. Verified: `Session.pendingHostRequest: string
| null` matches `packages/shared/src/index.ts` exactly, including default
`null` (`server/src/session-store.ts`), set by `request-host.ts`, cleared
by `host-request-decline.ts`, `host-delegate.ts` (only when delegating to
the pending requester), and `disconnect.ts` (requester disconnects). The
new `ConsentRecord` type (`submitterName`/`tosVersion`/`acceptedAt`)
matches `server/src/consent.ts` exactly, and `hasConsent()`'s absent/
malformed → `false` behavior matches. Pre-existing `Session`/
`Participant`/`CatalogSong`/`CatalogPart`/`PlaybackState` tables
re-verified — no drift introduced by the three-branch merge.

## pipeline.md

No defects found this pass. The new "Consent Recording" section matches
`packages/pipeline/src/record-consent.ts` exactly: additive-only (never
touches `.gp`/`.lrc`/`meta.json`), writes `consent.json` into the
existing `catalog/<slug>/` directory, CLI invocation shape matches
documented usage, placeholder `tosVersion` carries a production
annotation exactly where datamodel.md's own open note says it should.
Pre-existing extraction pipeline spot-checked and still matches.

## infrastructure.md

No defects found this pass. Verified every specific claim in the new
"Host Transfer" section: `transferHost(session, toParticipantId)` exists
in `server/src/host-succession.ts` with the documented signature and is
the *sole* implementation of the hostId/role swap — confirmed via grep
across `server/src/*.ts` and `server/src/handlers/*.ts` for `role =
'member'`/`role = 'host'`/`.hostId =`, all three assignments found only
inside `transferHost`. `host-delegate.ts`, `request-host.ts`, and
`host-request-decline.ts` each match their documented rejection/success
behavior exactly, including the "granting a request is just
`host-delegate`, not a separate accept message" claim and
`host-request-decline` never calling `transferHost`. `disconnect.ts`
clears `pendingHostRequest` on the requester's disconnect as documented.
The Song Consent Gate section matches `config.ts`/`catalog-loader.ts`
exactly. Pre-existing sections (Host Succession, Reconnect By Identity,
Song Catalog Delivery, Tab Rendering) spot-checked and still hold.

## constitution.md

No defects found this pass. Principle II ("No Dead Architecture"):
confirmed via direct grep that the `host-transfer` merge's core premise
held — genuinely one implementation of the hostId/role swap exists
codebase-wide, not the three independent copies the originally-parallel
`host-delegation`/`request-to-become-host` plans would have produced.
Principle VII (test-first): every new handler (`host-delegate.ts`,
`request-host.ts`, `host-request-decline.ts`, `metronome-set.ts`,
`count-in-set.ts`) plus `consent.ts` and `disconnect.ts` has a
substantial, non-stub corresponding `.test.ts` file.

## brand.md

No defects found this pass (unchanged this session, but re-verified
fully rather than assumed). `tokens.css`'s dark/light chrome tokens,
`brand-colors.ts`'s tab-notation palettes, `tab-renderer.ts`'s flat
`mainGlyphColor`, cursor/highlight colors, and `motifs.css`'s motion
split all match brand.md's tables and claims exactly.

## Resolved since last verification (2026-07-03, pre-merge)

The single defect from the prior pass — `client/src/brand-colors.ts`'s
unused `lyricCssColors` export (constitution Principle II) — no longer
reproduces; it was deleted on `fix-lyric-css-colors-dead-code`, since
merged to `main`, and is dropped from this report.
