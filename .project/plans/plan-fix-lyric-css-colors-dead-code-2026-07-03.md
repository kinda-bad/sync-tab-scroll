---
status: approved
branch: fix-lyric-css-colors-dead-code
created: 2026-07-03
features: []
---

# Plan: Remove unused `lyricCssColors` export

## Goal

Delete `client/src/brand-colors.ts`'s unused `lyricCssColors` export,
closing the sole open item in `DEFECTS.md` (a constitution Principle II
"No Dead Architecture" violation) and removing its drifted-from-source-of-
truth hex values in the same change.

## Scope

**In scope:**
- Remove the `lyricCssColors` export and its block comment from
  `client/src/brand-colors.ts`.
- Confirm no import of `lyricCssColors` exists anywhere in the codebase
  (already verified during `/ardd-verify`: zero references outside its own
  definition).
- Re-run `/ardd-verify` after the change to confirm `DEFECTS.md` returns to
  an all-clear state.

**Out of scope:**
- Any change to the *real* lyric-active color mechanism — `--lyric-active`
  (defined in `client/src/styles/tokens.css`, aliased to `--riot`) is the
  live, correctly-wired implementation and needs no change. This plan
  removes a parallel, unused, value-drifted definition of the same concept,
  not the concept itself.
- No artifact text changes — `constitution.md`, `brand.md`, and `ui.md`
  never referenced `lyricCssColors` by name, so nothing in `.project/
  artifacts/` needs editing. This is a pure code cleanup targeting a
  `DEFECTS.md` entry, not an artifact-vs-code drift requiring doc
  correction.

## Technical Approach

`lyricCssColors` (`client/src/brand-colors.ts:26-31`) was written as plain
CSS-string color constants for lyric/cursor DOM overlays, separate from the
`at.model.Color` instances (`darkTabColors`/`lightTabColors`) used for
alphaTab's `display.resources`. It predates the current implementation,
which instead drives the same "active lyric/cursor" role entirely through
CSS custom properties: `tokens.css` defines `--riot` (dark: `#ff2178`,
light: `#c40855`) and aliases `--lyric-active: var(--riot)`;
`client/src/lyrics.css` consumes `--lyric-active` directly. `grep` across
`client/src` confirms zero imports of `lyricCssColors` anywhere — it was
never wired into the CSS token system, and its own values have since
drifted from the token that actually governs this role (`#ff2d78` vs. the
live `#ff2178`).

The fix is a straight deletion: remove the export and its comment block.
No replacement is needed since the token-based mechanism already fully
covers the documented behavior (brand.md's dark/light active-lyric-color
tables).

## Phase Breakdown

### Phase 1 — Remove dead export
1. Delete `lyricCssColors` (lines 26-31) and its preceding block comment
   (lines 19-25) from `client/src/brand-colors.ts`.
2. Run the client typecheck/build to confirm nothing referenced the export
   (expected: no errors, since `/ardd-verify` already confirmed zero
   importers).
3. Run the existing client test suite to confirm no regression.

This is a single-phase, single-file change — no further phases needed.

## Complexity Tracking

None. This plan removes complexity (an unused, drifted duplicate) rather
than adding any; no deviation from the simplicity principle is introduced.

## Open Questions

None.

## Production Annotation Summary

None — this is a dead-code removal, not a production shortcut.
