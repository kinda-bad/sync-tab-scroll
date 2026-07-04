# Defects

_Last verified: 2026-07-03_

No defects found — artifacts match the codebase as of this run.

The one prior defect (constitution.md Principle II: unused `lyricCssColors`
export in `client/src/brand-colors.ts`, drifted from the live `--riot`
token) is confirmed resolved — the export and its comment block were
deleted (`fix-lyric-css-colors-dead-code` branch, T001), a grep across the
full codebase confirms zero remaining references, and the client's full
test suite (25 unit + 22 component tests) passes with no regression.

This entry closes out the same-day full re-survey recorded in this file's
prior revision, which checked every artifact (`constitution`, `datamodel`,
`pipeline`, `infrastructure`, `ui`, `brand`) against current code and found
only this one defect.
