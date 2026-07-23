# Defects

_Last verified: 2026-07-23_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

## infrastructure.md
- **Claim:** `settings.core.scriptFile = new URL('/alphaTab.worker.js', location.origin).href` is
  cited at `client/src/tab-renderer.ts:51`.
  **Actual:** The corrected explanation this citation supports (the
  fallback-only, synchronous-catch-only nature of `core.scriptFile`) now
  matches the code's own comment verbatim — that part of this defect,
  present in the prior report, is fixed. The bare line-number citation
  itself has drifted again from further edits: the assignment now sits at
  line 84, not 51.
  **Location:** `client/src/tab-renderer.ts:84` (`createTabRenderer`)
  **Severity:** cosmetic

- **Claim:** `bars-per-row-set { value: number | null }` and
  `early-stop-set { tick: number | null }` are the wire message shapes for
  `host-mandated-bars-per-row-layout`/`host-set-early-stop-point-for`.
  **Actual:** The actual `ClientMessage` union members
  (`packages/shared/src/messages.ts`) and both handlers use different
  field names: `{ type: 'bars-per-row-set'; barsPerRow: number | null }`
  and `{ type: 'early-stop-set'; tickPosition: number | null }`. The
  behavior described is otherwise implemented correctly (host-only,
  broadcasts `session-state`, resets on song change) — only the
  documented field names are wrong.
  **Location:** `packages/shared/src/messages.ts:18-19`;
  `server/src/handlers/bars-per-row-set.ts`,
  `server/src/handlers/early-stop-set.ts`
  **Severity:** cosmetic

- **Claim:** An input failing the new shared validation function
  (`displayName`/activation key) "is rejected as an `error` message... not
  silently truncated/mutated server-side without telling the client what
  was sent back."
  **Actual:** `server/src/input-validation.ts`'s `sanitize()` — used by
  both `validateDisplayName` and `validateActivationKey` — never rejects
  anything. It silently strips control characters and HTML special
  characters and truncates to a max length, and that sanitized value is
  used directly (`session-create.ts`, `session-join.ts`,
  `catalogue-unlock.ts` all call it inline, none send an `error` on a
  changed/invalid input). The code's own header comment even states this
  explicitly: "this is sanitization, not a rejection-only validator" —
  directly contradicting the artifact's reject-and-notify claim.
  **Location:** `server/src/input-validation.ts` (`sanitize`,
  `validateDisplayName`, `validateActivationKey`)
  **Severity:** broken-contract

## ui.md
No defects found this run — the previously-recorded `mute-all-parts-button`
identifier gap is now fixed: `client/src/components/SettingsModal.svelte:477`
carries `testId="mute-all-parts-button"` as a real, queryable identifier,
not just a comment tag.

Full pass covered all six artifacts (datamodel, infrastructure, ui,
pipeline, constitution, brand), with priority depth on everything that
landed in this session's two merged bundles (`e9deab3..HEAD` on `main`):
`Session.hostBarsPerRow`/`earlyStopTick` (shared types, handlers, renderer
pin/fallback, song-change reset), the Help/Info/About nav panel and its
About-tab links, join-code click-to-copy, remembered display-name pre-fill
(and its no-overwrite-of-a-local-value guard), the new
`server/src/input-validation.ts` module and its three call sites, the
recording-mode Metronome-toggle unlock (`SettingsModal.svelte`,
`App.svelte`'s beat widget), and `ready-set.ts`'s Start Negotiation
auto-resolve-on-zero fix (matches infrastructure.md's Start Negotiation
section verbatim). Also re-verified both previously-known defects
directly rather than trusting the prior report or task completion claims:
the `mute-all-parts-button` gap is genuinely closed; the `scriptFile`
line-citation issue is only partially closed (content now correct, line
number drifted again) — both outcomes recorded above from direct
inspection, not carried forward blindly.

No documented-but-never-built capabilities were found during this pass —
everything checked traces to real, working code.
