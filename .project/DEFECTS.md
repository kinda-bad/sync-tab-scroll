# Defects

_Last verified: 2026-07-03_

No defects found — artifacts match the codebase as of this run.

## Resolved since last verification (2026-07-03, post-merge)

The 3 `ui.md` defects from the prior pass (a dropped "connected"
precondition on "Make host", and two paragraph-order/phrasing mismatches
against `SettingsModal.svelte`'s actual merged markup — all introduced by
manual resolution of the `host-transfer` ↔ `metronome-count-in-toggle`
merge conflict) are fixed: the Participants tab bullet was rewritten to
match the real render order (participant rows with Host Transfer controls
first, then the lobby-cursor/Spotlight/Metronome/Count-in control row) and
to drop the incorrect "connected" qualifier. Re-verified directly against
`client/src/components/SettingsModal.svelte` — no remaining mismatch.

The single defect from the pass before that — `client/src/brand-colors.ts`'s
unused `lyricCssColors` export (constitution Principle II) — also does
not reproduce; it was deleted on `fix-lyric-css-colors-dead-code`, since
merged to `main`.
