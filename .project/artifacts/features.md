---
last_updated: 2026-07-06
---


# Features

## Lyrics extraction pipeline
_Added 2026-07-01 · pipeline, datamodel_
Turns a Guitar Pro source file's embedded lyrics into a `.lrc` file with GP-accurate per-line end timestamps, falling back to lrclib.net (for line-break placement, or as a full source) when GP has no embedded lyrics.
Why: GP's own syllable timing is more accurate than lrclib's line-level timestamps, so lrclib is used narrowly rather than as the primary source.

## Session create & join by code
_Added 2026-07-01 · infrastructure, datamodel_
A host creates a session and gets a short join code; other participants join the same session by entering that code.

## Participant part selection
_Added 2026-07-01 · datamodel, ui_
Each participant picks which instrument part to follow, or the tab-less "lyrics" part, independent of the other participants' choices.

## Host-removable participants
_Added 2026-07-01 · infrastructure, ui_
The session host can remove a participant from the session.

## Host playback transport controls
_Added 2026-07-01 · infrastructure, datamodel_
The host starts, pauses, resumes, and seeks playback for the whole session; the server is the authoritative clock.

## Resilient sessions
_Added 2026-07-01 · infrastructure_
A session survives brief participant disconnects (a grace-period timer only destroys a session once it's been empty for a while), rather than ending the moment someone drops.

## Live client-side tab rendering
_Added 2026-07-01 · infrastructure, brand_
Guitar tab notation renders directly in the browser from the source `.gp` file via alphaTab, replacing an offline pre-rendered-SVG approach — the same render pass drives both the staff and the native playback cursor, eliminating a whole class of cursor/staff desync bugs.

## Periodic drift-corrected playback sync
_Added 2026-07-01 · infrastructure, datamodel_
Each participant's own alphaTab instance drives its local playback clock; the server's periodic position broadcasts only correct drift when it exceeds a threshold, rather than continuously driving every client from the server.

## Headless playback for lyrics-only participants
_Added 2026-07-01 · ui, infrastructure_
A participant following the lyrics-only part still gets a fully synced clock and audio (via a non-rendering alphaTab instance) without any visible tab.

## Native metronome & count-in
_Added 2026-07-01 · datamodel, ui_
An optional metronome and pre-playback count-in, toggleable per session, audible identically whether a participant's view is a rendered tab or the headless lyrics view.

## In-tab lyrics overlay
_Added 2026-07-01 · infrastructure, ui_
While following an instrument part, a participant can toggle a karaoke-style highlight of the currently-sung syllable on top of the rendered tab — even when the lyrics live on a different track than the one being viewed.

## Full-screen synced lyrics view
_Added 2026-07-01 · ui, brand_
A participant following the lyrics-only part sees the full lyric text, one line highlighted at a time in sync with playback.

## Dark/light theme toggle
_Added 2026-07-01 · brand, infrastructure_
Tab notation and lyric/cursor colors switch between dark and light palettes at runtime, no page reload.

## Per-participant loading readiness
_Added 2026-07-01 · ui, infrastructure_
Each participant's readiness reflects both the tab parse/render and the SoundFont audio asset load completing — whichever finishes last — for instrument and lyrics-only participants alike.

## Toast-based error notifications
_Added 2026-07-01 · ui_
Errors (bad join code, selecting an unavailable part, a non-host trying a host-only action) surface as brief, auto-dismissing toasts rather than blocking dialogs.

## Lobby cursor
_Added 2026-07-01 · datamodel, ui_
Before playback starts, the host can point at a position in the score. Whether participants' views follow it depends on a host-only "Spotlight mode" toggle: on, every participant's view snaps to match the host's pointer; off, each participant is free to browse their own view independently and the pointer is shown only as an informational readout. Both the pointer and Spotlight mode are automatically cleared/reset the moment playback starts, so neither lingers alongside the live playback cursor.

## Song catalog listing & selection
_Added 2026-07-01 · datamodel, infrastructure, ui_
The host picks a song from the server's loaded catalog in the lobby, which sets the session's available parts and the song every participant's playback view renders — wiring the Lobby→Playback transition end-to-end instead of a hardcoded test fixture.
Why: the catalog was already loaded server-side (`catalog-loader.ts`) but never exposed to clients, and no song-selection message existed; this also required the server's first HTTP static-file surface, since catalog `.gp`/`.lrc` assets previously had no client-fetchable URL.

## Host delegation
_Slug: `host-delegation` · Status: implemented · Logged 2026-07-01 · Plan: plan-host-transfer-2026-07-03.md · Tasks: tasks-host-transfer-55dd.md_
The current host can manually hand off host privileges to another connected participant in the lobby, without needing to disconnect.

## Request to become host
_Slug: `request-to-become-host` · Status: implemented · Logged 2026-07-01 · Plan: plan-host-transfer-2026-07-03.md · Tasks: tasks-host-transfer-55dd.md_
A non-host participant can ask the current host to hand off host privileges to them, rather than only the host being able to initiate a handoff.

## Metronome toggle
_Slug: `metronome-toggle` · Status: implemented · Logged 2026-07-02 · Plan: plan-metronome-count-in-toggle-2026-07-03.md · Tasks: tasks-metronome-count-in-toggle-eb7d.md_
The host can turn the session's metronome on or off (`Session.metronomeEnabled`, already wired to alphaTab's `metronomeVolume` in `playback-sync.ts`, but nothing currently lets the host set the flag — no message type or server handler exists for it).
Why: before designing a custom toggle, research whether `@coderline/alphatab` already provides its own metronome-enablement UI/mechanism worth deferring to instead (constitution Principle V) — ejected from `plan-song-catalog-selection-2026-07-02.md` for this reason, rather than designed inline.

## Count-in toggle
_Slug: `count-in-toggle` · Status: implemented · Logged 2026-07-02 · Plan: plan-metronome-count-in-toggle-2026-07-03.md · Tasks: tasks-metronome-count-in-toggle-eb7d.md_
The host can turn the pre-playback count-in on or off (`Session.countInEnabled`, already wired to alphaTab's `countInVolume` in `playback-sync.ts`, but nothing currently lets the host set the flag — no message type or server handler exists for it).
Why: same research question as metronome-toggle — check alphaTab's own count-in UI/mechanism before building a custom one (constitution Principle V). Likely resolved together with `metronome-toggle` in the same `/ardd-plan` pass, since both need the same session-settings message/handler shape.

## Test coverage backfill
_Slug: `test-coverage-backfill` · Status: implemented · Logged 2026-07-02 · Plan: plan-test-coverage-2026-07-02.md · Tasks: tasks-test-coverage-bfe8.md_
Bring the codebase into compliance with constitution Principle VII (Test-First Development): `client` and `packages/shared` have no test runner configured and zero tests; `server` has coverage for only one handler (`spotlight-mode-set`) out of eight.
Why: logged via `/ardd-verify` (see `DEFECTS.md`'s constitution.md entry) — Principle VII was added mid-implementation of `plan-lobby-cursor-modes-2026-07-03.md` specifically because a task needed a test with no runner/harness to write it against. This entry tracks closing the resulting gap deliberately, rather than backfilling it ad hoc.

## Playwright client coverage
_Slug: `playwright-client-coverage` · Status: implemented · Logged 2026-07-02 · Plan: plan-playwright-coverage-2026-07-02.md · Tasks: tasks-playwright-coverage-c1d3.md_
Covers `client`'s DOM/alphaTab/WebSocket-coupled modules (`tab-renderer`, `headless-player`, `lyrics-overlay`, `playback-engine`, `ws-client`, `store`, `main`) with Playwright, completing the Principle VII backfill that `test-coverage-backfill` explicitly left out.
Why: `jsdom` can't render alphaTab's canvas/SVG output or play audio, and heavy mocking risks testing the mock instead of the real behavior — `plan-test-coverage-2026-07-02.md`'s Open Questions flagged this as needing its own deliberately-scoped plan rather than folding it into the vitest pass.

## Consented public song submission
_Slug: `consented-song-submission` · Status: implemented · Logged 2026-07-03 · Plan: plan-consented-song-submission-2026-07-03.md · Tasks: tasks-consented-song-submission-0f36.md_
A submitter can add a `.gp` file to the catalog and explicitly accept a ToS clause granting the operator a license to distribute it publicly; a song is only ever served to clients other than its own submitter once that consent is recorded — local/personal catalog entries (already outside the repo via the gitignored `catalog/` dir) need no such consent and keep working exactly as they do today.
Why: distinguishes "I dropped my own `.gp` files in locally for my band" (already fully supported, no legal exposure) from "this song ships with a public deployment" (requires an affirmative rights claim from whoever submitted it). Open design questions for `/ardd-plan`: whether submission is a web upload form or a CLI drop-in plus a companion consent file, whether consent is recorded per-song or per-submitter, and how this interacts with `pipeline.md`'s current assumption that every catalog song is a pipeline input.

## Participant list part indicator
_Slug: `participant-selected-part` · Status: backlogged · Logged 2026-07-04_
The participant list shows which part (an instrument, or the tab-less "lyrics" part) each session member currently has selected, not just their name and readiness.

## Alternate theme options (grunge + cyberpunk)
_Slug: `grunge-cyberpunk-themes` · Status: backlogged · Logged 2026-07-06_
Offer two additional selectable themes, each a fully distinct dark/light pair, alongside the current default: (1) a louder, wilder variant of the current theme drawing visual inspiration from Yeah Yeah Yeahs and Nirvana album cover art (see `~/Documents/art/`); (2) a cyberpunk theme, drawing color palette and design ideas from the predecessor project `sync-scroll` (`~/dev/sync-scroll/`).
Why: `brand.md` already anticipated this extensibility path — themes are selected via a `[data-theme='...']` attribute against semantic role names (not theme-specific tokens), specifically so a new theme is an additive `tokens.css` block plus a toolbar entry with no component touching theme-specific logic. `/ardd-plan` will need to review the referenced album art and the `sync-scroll` codebase directly (both outside this repo, so not derivable from artifacts alone) to derive concrete palettes before designing the `brand.md`/`tokens.css` changes.
