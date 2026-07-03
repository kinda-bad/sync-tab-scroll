# Defects

_Last verified: 2026-07-03_

## brand.md

- **Claim:** The "Signature element: the persistent Bar" section describes the hazard-tape stripe as part of the Bar itself — "Its readiness/progress fill is a diagonal hazard-tape stripe... The combined effect reads as a torn strip of caution tape stuck across the screen edge — the single most recognizable, unmistakable element of the redesign."
  **Actual:** `client/src/components/Bar.svelte` now renders `HazardBar` in a fully independent `.hazard-wrap` pinned to `top: 0`, completely decoupled from the bottom-pinned `.bar-wrap` (`bottom: 0`) — the `settings-modal-redesign` plan's own stated goal (move the hazard strip to the top of the viewport, out from between the nav bar and the main content). `ui.md` defers all color/motion/positioning decisions to `brand.md`, so nothing currently documents where the hazard strip actually lives.
  **Location:** `brand.md:79-96`; `client/src/components/Bar.svelte:15-17,32-38`
  **Severity:** broken-contract

## ui.md

- **Claim:** The Participants tab holds "the live participant list with readiness state (host can remove participants)."
  **Actual:** No remove-participant UI control exists anywhere in the client (`SettingsModal.svelte` has no "remove" reference at all). Only the server-side handler (`server/src/handlers/host-remove-participant.ts`) exists, exercised solely by e2e tests driving a raw WS message directly — this is pre-existing drift, not introduced this session, but never corrected.
  **Location:** `ui.md:73-74`; no client caller of `host-remove-participant`
  **Severity:** drift

- **Claim:** The settings-cog control is described only under "## Lobby View," positioned "alongside 'Song & part'" — implying the same Lobby-only scope.
  **Actual:** `client/src/App.svelte:139` gates the cog to `view === 'lobby' || view === 'playback'` (widened during implementation to resolve a real gap — see `plan-settings-modal-redesign-2026-07-03.md`'s Technical Approach); "Song & part" (`App.svelte:136`) remains Lobby-only. Neither the Lobby nor Playback section of `ui.md` documents the cog's actual dual-view reachability.
  **Location:** `ui.md:67-68`; `client/src/App.svelte:136,139`
  **Severity:** drift

- **Claim:** The Lobby-body hint is "checked in this order: 1... 4."
  **Actual:** `client/src/views/Lobby.svelte:19-20` has a 5th, undocumented leading case — `!session ? 'Connecting…'` — preserved unchanged from before the settings-modal-redesign work, but never folded into `ui.md`'s enumerated list.
  **Location:** `ui.md:93-103`; `Lobby.svelte:19-20`
  **Severity:** cosmetic

## datamodel.md

- **Claim:** `lyricLineBreaks`'s Notes column frames its purpose as letting "the client regroup the flat per-beat syllable stream... into lines matching `.lrc`" for the in-tab overlay.
  **Actual:** `client/src/playback-engine.ts:58-66` does call `groupIntoLines(syllables, lyricLineBreaks)`, but the result is immediately flattened by `createLyricsOverlay` (`client/src/lyrics-overlay.ts`, `lines.flat()`) — the lyrics-ticker redesign never uses line boundaries for layout. The field is consumed, not dead, but its documented effect (visible line grouping in the overlay) doesn't exist in the current UI. `plan-lyrics-ticker-2026-07-03.md` explicitly flagged this as "a separate question for a future `/ardd-verify` pass" — this is that pass.
  **Location:** `datamodel.md:80`; `playback-engine.ts:58-66`; `lyrics-overlay.ts` (`.flat()` call)
  **Severity:** cosmetic

## constitution.md

No defects found this pass. Principle I (single client store): no duplicate mutable app state found outside local transient UI state (e.g. `Landing.svelte`'s `mode`, which is presentation-only). Principle IV (handler routing): `server/src/dispatch.ts` routes every one of the 10 `ClientMessage` variants to its own named handler file, no inline logic. Principle VI (production annotations): no unannotated TODO/FIXME/HACK found across `client/src`, `server/src`, or `packages`.

## infrastructure.md

No defects found this pass. The host-authoritative `tickPosition` mechanism was verified exactly as documented: `server/src/handlers/playback-tick-report.ts` stores and refreshes `serverTimestamp` on the host's self-report, never recomputes independently; `server/src/server.ts:69-82`'s periodic broadcast is unchanged, matching the revised `infrastructure.md` text from `plan-playback-sync-fixes-2026-07-03.md`.

## pipeline.md

Not surveyed in depth this pass (lighter spot-check only, per scope) — no cross-reference issue from the checks above implicates it.

## Resolved since last verification (2026-07-02)

The following defect from the prior pass no longer reproduces against current code and is dropped from this report:

- **constitution.md** Principle VII (Test-First Development) — previously found zero coverage across `server/src/handlers/*.ts` (all but one), `client/src`, and `packages/shared`. Now: 10 of 11 server handler files have a matching `.test.ts` (the 11th, `context.ts`, is a pure type-definitions file with no logic to test); `client/src` has 14 unit/CT spec files plus 4 e2e spec files (`test-coverage-backfill`, `playwright-client-coverage`); `packages/shared/src/{index,messages}.ts` is pure interface/type-union declarations re-exported with no runtime logic — nothing there is meaningfully testable. The principle is now upheld everywhere there's actual behavior to test.
