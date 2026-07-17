# sync-tab-scroll — Project Status

_Updated: 2026-07-17-night (**New feedback filed:
`feedback-bottom-bar-icons-3a15.md` (6 items, all `[artifacts: ui]`,
1 bug + 5 UX) from live inspection of the bottom bar.** Bug: toggling
lyrics off currently hides only the lyric words, not the background
strip behind them. UX: move 'toggle lyrics' into the bottom bar; swap
play/pause and stop text labels for tape-recorder-style icons; swap
settings' text for a cog icon; swap leave-session's text for an
exit-door icon; adopt an icon library (e.g. lucide) to support all of
the above. Open feedback count is now 1 (all 32 other feedback files
are `planned`). Everything else below is prior context — unchanged
this run: diagrams all `diagram_status: current`, no defects since
2026-07-12, feature register 4 backlogged / 16 implemented, no
in-flight worktrees, ArDD update available (installed
`bdd553e`, latest release `v0.10.1-beta.11`, beta channel) — run
`/ardd-update` if desired. Recommended next step: `/ardd-plan` to pick
up the new feedback file. Prior context below.)_

_Updated: 2026-07-17-evening (**Two new open bugs filed
(`feedback-lyrics-timing-tiro-c741.md`); diagram regen + local-dev-port
fix done but UNCOMMITTED.** From live local-instance testing (user session,
not an `/ardd-implement` run):
- **F001** — the in-tab lyrics ticker on "Time Is Running Out" highlights a
  syllable ~2 syllables (960 ticks) ahead of actual playback ("be"
  highlighted when "You" should be, first "You will be the death of me").
  Same symptom class the `lyrics-ticker` plan's T004 already fixed once
  (switching to `beat.absolutePlaybackStart`) — either a residual case or a
  file-specific quirk (an unlabeled, un-lyriced beat sits immediately
  before the "You" beat). Static `.gp` parse ruled out repeats, ties,
  grace notes, and mid-song tempo automation as causes; needs live-audio
  comparison to actually pin the fix.
- **F002** — the full lyric sheet (Lyrics-part view, `.lrc`-driven)
  progressively drifts further ahead of audio as the song plays
  ("about a line ahead" later on) — a *growing* drift, mechanically
  distinct from F001. Root-cause hypothesis with code evidence:
  `lrc-writer.ts`'s `buildLrc()` slices the GP-derived syllable stream into
  per-line windows purely by `lyricLineBreaks[i]` counts, while a line's
  *displayed text* can come from lrclib.net instead (confirmed for this
  song: GP lyrics read "You will be the death of me", `.lrc` shows "And
  you will be..."). If an early line's assigned count doesn't match the
  true GP count, the slice desyncs and the error compounds each
  subsequent line. Total counts balance overall (333=333), so it isn't a
  gross miscount if real — a subtler `line-breaks.ts` boundary-placement
  bug. Needs live-audio verification before `/ardd-plan` picks it up.

**Separately, uncommitted in the working tree** (from the same local-testing
session, not yet committed pending the user's active use of the instance):
diagram regeneration for all three stale artifacts (`datamodel.md`,
`infrastructure.md`, `ui.md` → `diagram_status: current`, `README.md`'s
Datamodel/Infrastructure/UI sections rewritten) and a local-dev port fix
(client Vite dev port `6000` → `6100` — Chrome refuses to navigate to 6000
at all, it's on Chromium's hardcoded unsafe-ports list — touching
`client/vite.config.ts`, `server/src/config.ts`'s `publicBaseUrl` default,
`server/.env.example`, and the three tests that pinned the old port
literal). Both changes are verified working (tests pass, local instance
confirmed reachable at `:6100`) but not yet committed — commit once the
user is done testing. Prior context below.)_

_Updated: 2026-07-17-later (**tasks-lyrics-pre-singing-e09e T008 verified
live, file COMPLETED.** The one remaining open task across both lyrics-
ticker tasks files. Same live-browser methodology as the note below:
second Vite instance on port 6002 (Chrome refuses port 6000), real
session, `Kinda Bad` catalogue unlocked, Radiohead "Creep", "Lead Guitar"
instrument part. Confirmed pre-play: the "…" placeholder carries
`at-highlight` and is centered (~7.5px diff, not left-aligned, no snap
since playback hadn't started). After clicking Start: the transform read
via `getComputedStyle` showed no discontinuous jump — the placeholder's
centered transform carried straight through to the first real syllable
("an-") activating already centered (~1.8px diff), with the placeholder
then `display: none` (one-way, matching T006's guard). Committed
`33bf4a3`, signed. **Both `tasks-lyrics-ticker-75dd.md` and
`tasks-lyrics-pre-singing-e09e.md` are now `completed`** — the
2026-07-04 live-verification failure chain (original ticker → pre-singing
placeholder fix) is fully closed out. Prior context below.)_

_Updated: 2026-07-17 (**tasks-lyrics-ticker-75dd T004 re-verified live, file
COMPLETED.** This tasks file had sat at a non-standard `reopened` status
since 2026-07-04, when the user's live-browser check failed T004 (ticker
left-aligned, snapped to center on first syllable). That failure was
diagnosed and actually fixed later, in a separate plan/tasks file
(`tasks-lyrics-pre-singing-e09e.md`, `in-progress` 8/9 — its T004 rewrote
`centerActiveSyllable()` to use `getBoundingClientRect()` + a live
`getComputedStyle(track).transform` readback instead of the original
`offsetLeft`/`clientWidth` formula). This run re-drove T004 live: started
both dev servers (a second Vite instance on port 6002 was needed — Chrome
refuses port 6000 as an unsafe port), created a real session via
`claude-in-chrome`, unlocked the `Kinda Bad` catalogue (activation key
pulled from 1Password on request), loaded Radiohead "Creep"
(`lyricsTrackIndex: 0`), and viewed the "Lead Guitar" instrument part (a
different track than the lyrics track, per the task's own wording).
Instrumented `getBoundingClientRect`/`getComputedStyle` directly during
live playback: no line wrapping (`white-space: nowrap` + `overflow:
hidden` confirmed), the active syllable's bounding-box center tracked the
overlay's center to sub-pixel precision across 8 consecutive syllables,
and a `resize` dispatched mid-playback (1200px → 700px) re-centered
correctly. T004 marked `[x]`, file frontmatter flipped `reopened →
completed` by hand (the state-machine script doesn't recognize the
free-text `reopened` status as a valid `from` state). Committed `006c5c5`,
signed. **tasks-lyrics-pre-singing-e09e.md's own T008 (the equivalent
live check for its pre-singing-placeholder behavior) remains open** — this
run only re-verified the ticker-centering fix's *carry-over* correctness
via the same code path, not lyrics-pre-singing's placeholder/UX additions
specifically; a human (or a future pass with the Chrome tools) should
still drive that file's T008 separately. Prior context below.)_

_Updated: 2026-07-16 (**phase-2-in-app-authoring IMPLEMENTED — merged, pushed.**
All 18 tasks in `tasks-phase-2-in-app-authoring-48d5.md` complete (`completed`),
implemented in a delegated worktree (`phase-2-in-app-authoring-impl`,
test-first throughout — 13 new/changed server tests + 6 new CT tests, 225
server + 88 client + 10 CT tests green, typecheck clean across all 4
workspace packages), fast-forward-merged into `main` at `fd26a4d`, worktree
reaped, and pushed. Delivered: `CatalogueOwnership` Postgres table +
`set-catalogue-owner` CLI; mutable/dynamic in-memory catalog with
per-user visibility (an owner sees their own unpublished catalogue);
`Participant.userId` on the wire; an authenticated upload trust surface
(`POST /catalogues/:id/songs` — 401/403 auth gate, size-limited staged
upload, parse-timeout-bounded pipeline execution, nothing reaches the
live catalog until validated); a runtime `SONG_UPLOAD_ENABLED` flag
(default on) gating the route and surfaced on `/me` so the client renders
"Add song" absent, not disabled, when off; upload now writes a Consent
Record via the same `recordConsent()` the CLI's `record-consent` uses;
a new `AuthoringModal.svelte` (My catalogues, Create catalogue,
XHR-driven Add-song form distinguishing uploading/processing via the
upload's own progress/load events, Co-owners roster + Generate-invite-link);
`POST /catalogues` (create), `POST /catalogues/:id/invite` (generate),
`POST /invites/redeem` (redeem — grants ownership + membership in one
action), `GET /catalogues/:id/owners` (roster). Feature register:
`phase-2-in-app-authoring` → `implemented` (16 implemented total).
**Note (unresolved):** the standalone backlog entry
`catalogue-co-owner-invite-flow` (filed 2026-07-15) is now redundant —
its scope shipped as this plan's Phase 6 (T016–T018) — but `/ardd-status`
can't retire it itself (register writes aren't its job, and
`feature-flip` refuses a non-adjacent `backlogged→retired` jump). Retire
it by hand (or via `/ardd-refine`) when convenient. **Not yet done:**
the three stale diagrams (datamodel/infrastructure/ui — Phase 2 touched
all three) still need `/ardd-diagram`; `DEFECTS.md` (last checked
2026-07-12) predates this whole feature. Prior context below.)_

_Updated: 2026-07-16-earlier (**phase-2-in-app-authoring PLANNED → TASKED.** Used
the existing draft plan `plan-phase-2-in-app-authoring-2026-07-14-8537.md`
(already matched the amended artifacts — approved via `--from`, not
re-drafted) and generated its tasks file,
`tasks-phase-2-in-app-authoring-48d5.md` (`ready`, 18 tasks across 6
phases: ownership data model, dynamic catalog + per-user visibility,
upload trust surface, authoring UI, consent gating, ownership/invites).
Feature register: `phase-2-in-app-authoring` → `tasked`. Committed/pushed
`53b3733`. **Note:** Phase 6 (T016–T018) implements invite-by-link +
co-owner grants — this now overlaps the standalone backlog entry
`catalogue-co-owner-invite-flow` filed a day earlier in the artifacts
sweep below; that entry should probably be retired or merged once Phase 6
lands, rather than planned separately. Not yet implemented — this run
only planned and tasked it. Prior context below.)_

_Updated: 2026-07-15 (**ArDD updated to beta `bdd553e`; constitution bumped
to v1.6.0 (Phase 2 in-app authoring sanctioned); artifacts-sweep backlog
pass added 3 entries.** Committed/pushed `6e3ea49`: constitution.md/
datamodel.md/infrastructure.md/pipeline.md/ui.md amended for Phase 2
in-app authoring (owner-created catalogues/songs from the web UI,
additive to the CLI), plus the two plans that drove it
(`plan-phase-2-in-app-authoring-2026-07-14-8537.md`,
`research-backlog-defrag-slate-analysis-2026-07-15-627c.md`). A
`/ardd-backlog --from-artifacts`-style sweep of all 6 stable artifacts
found 3 documented-but-untracked capabilities, all approved and filed:
`catalogue-co-owner-invite-flow` (ui.md's Ownership/invites section +
datamodel's `grantedVia:'invite'` enum value — schema/migration exist,
no invite generation/redemption code), `host-mandated-bars-per-row-layout`
(infrastructure.md's Tab Rendering section, named explicitly as deferred),
and `latency-compensated-position-extrapolation` (infrastructure.md's
Session & Real-Time Sync section, named explicitly as a deferred
refinement). Feature register now 4 backlogged / 15 implemented. All
three artifact diagrams (`datamodel`, `infrastructure`, `ui`) are stale —
the Phase 2 amendments touched entities/mechanics/UI in all three and none
have been regenerated since. Prior context below.)_

_Updated: 2026-07-14 (**part-mute-toggle SHIPPED, pushed, deployed.**
`tasks-part-mute-toggle-f0d4.md` (`completed`, 6/6), implemented in a
delegated worktree (RED→GREEN per task, all test-first per Principle VII),
fast-forward-merged into `main` at `919a4da`, and pushed — Railway rebuilt
(`index-Crk4cCoz.js` now live). Vetted via `/ardd-research` first
(`research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md`): every
participant's alphaTab instance already played the **full multi-track mix**
before this feature — alphaTab's `trackIndexes` load parameter scopes
rendering only, not playback — so the feature needed zero server/datamodel/
load-architecture changes. New `client/src/track-mute-preference.ts`
(mirrors `metronome-preference.ts`, keyed per song+track), new
`setEngineTrackMute()` in `playback-engine.ts` wired to alphaTab's own
`api.changeTrackMute()` and applied automatically on `scoreLoaded` (mutes
persist across reload/rejoin), and a new "Mute parts" section in
`SettingsModal.svelte`'s Preferences tab. Self-mute confirmed allowed
(T006), no restriction. Client 87 unit + 113 CT green. Feature register:
`part-mute-toggle` → `implemented` (15 implemented total). `ui.md`'s diagram
is stale (Playback View + Preferences tab additions) — the one open item
this pass. `main` is 0 ahead / 0 behind `origin`. **Live prod behavioral
check (does muting actually silence audio) still pending** — bundle
confirmed deployed, functional click-through not yet done. Prior context
below.)_

> **ARDD update available:** installed `bdd553e` (beta channel), source at
> `v0.10.1-beta.11` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.6.0) | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

None at the artifact level.

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. `part-mute-toggle`'s design is squarely inside Principle V
(uses alphaTab's own `changeTrackMute` API rather than a custom mixing
mechanism) and its 6 tasks are all test-first (Principle VII). The
lyrics-overlay and sign-out fixes (below) were also test-first, no
violations there either.

## Diagrams

- `datamodel.md` — **current ✅** (regenerated 2026-07-17, uncommitted —
  see the dated note above).
- `infrastructure.md` — **current ✅** (regenerated 2026-07-17,
  uncommitted).
- `ui.md` — **current ✅** (regenerated 2026-07-17, uncommitted).

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12** (Accounts Phase 1
layer). Run `/ardd-defects` to refresh against the newer client fixes
(lyrics-overlay, sign-out, part-mute-toggle) if desired.

## Feedback

3 open feedback files. `feedback-lyrics-timing-tiro-c741.md` was
re-investigated by a Fable research agent (2026-07-17) with live
instrumented playback (real audio tapped via `AnalyserNode`) — findings
rewritten in place, IDs kept stable:
  - **F002 root cause confirmed**: this song's GP lyrics have no author
    line breaks, so the pipeline's lrclib-fallback path built
    `lyricLineBreaks` via word-count-proportional rounding
    (`distributeByWordCount`) instead of real per-line syllable counts —
    wrong from the first line boundary, compounding into the reported
    "line ahead" drift. Fix direction: align the GP syllable stream to
    lrclib line text (normalized word matching or timestamp proximity),
    not proportional distribution.
  - **F001 could not be reproduced as a code bug** — ticker/engine/audible
    audio all agree to within ~25-40ms on the dev machine; the prior
    T004 fix is a no-op for this file (not a residual of that bug).
    Leading hypothesis: uncompensated `AudioContext.outputLatency` (a
    Bluetooth device's 300-500ms latency ≈ the reported 2-syllable lead).
    **Needs one fact from the user: what audio output device were you on,
    and does the offset shrink/vanish on built-in speakers?**
  - **F003 (new, found during this pass)**: the client's same-text
    melisma-dedup heuristic in `lyrics-beat-walk.ts` (validated on Creep)
    is unsound — on this song it wrongly collapses 23 genuinely distinct
    repeated "yeah,"/"ooh," syllables, desyncing the client stream (310)
    from `lyricLineBreaks` (333). Also, `gp-parser.ts` and the client walk
    use divergent tick-extraction logic — should share one implementation.
  - `/ardd-plan` was **not** run against this file (the agent had no
    `AskUserQuestion` tool for the approval checkpoint) — still needs a
    human/interactive pass to turn F002/F003 into tasks (F001 blocked on
    the device question above).

`feedback-mute-parts-own-tab-cf6d.md` (F001: move the "Mute parts" control
out of the Preferences tab into its own dedicated Settings tab, one row
per part) and `feedback-playback-start-stutter-2052.md` (F001: playback is
often glitchy/stuttering right at start — needs investigation into
alphaTab audio-engine warm-up/pre-buffering) are both untouched, ready for
`/ardd-plan`.

## Feature Backlog

**4 backlogged** · 0 planned · 0 tasked · **16 implemented** — see
`.project/features/`. Backlogged: `catalogue-co-owner-invite-flow`
(**superseded — its scope shipped as phase-2-in-app-authoring's Phase 6;
retire by hand**), `host-mandated-bars-per-row-layout`,
`latency-compensated-position-extrapolation`, `solo-mute-button-per-part`
(new, filed 2026-07-17 — per-part "mute all but this" button).

## Plans & Tasks

- **Lyrics ticker (centering fix)** — `tasks-lyrics-ticker-75dd.md`
  (`completed`, 9/9). T004's 2026-07-04 live-verification failure is now
  re-verified passing (see the dated note above) — the actual fix landed
  separately in `tasks-lyrics-pre-singing-e09e.md` T004; this file just
  confirms the carry-over behavior is correct.
- **Lyrics pre-singing placeholder** — `tasks-lyrics-pre-singing-e09e.md`
  (`completed`, 9/9). T008 (live-browser check of the pre-singing "…"
  placeholder centering/transition) verified passing 2026-07-17.
- **Per-participant part mute toggle** — `tasks-part-mute-toggle-f0d4.md`
  (`completed`, 6/6). **Merged to `main` at `919a4da`, pushed, deployed**
  (`index-Crk4cCoz.js`). New `track-mute-preference.ts` (mirrors
  `metronome-preference.ts`), new `setEngineTrackMute()` wired to
  alphaTab's `changeTrackMute()` and applied on `scoreLoaded` (persists
  across reload), new "Mute parts" section in `SettingsModal.svelte`'s
  Preferences tab. Self-mute allowed. Zero server/datamodel changes.
  Client 87 unit + 113 CT green. **Bundle confirmed live; functional
  click-through (does muting actually silence a track) not yet verified.**
- **Lyrics overlay timing + display fixes** — `tasks-7f0f-4f2d.md`
  (`completed`, 5/5). **Merged to `main` at `ecca7ee`, pushed, deployed,
  live-verified in a real session** (F006 inline count-in dots, F003/F004
  gap-indicator clearing, F005 no pre-highlight, F002 single scroll region
  all confirmed visually; F001 timing offset covered by the automated test
  suite). Client 82 unit + 105 CT green.
- **Sign-out event-binding + false-banner fix (REAL sign-out cause)** — shipped
  `9478c55`, deployed, **verified live** end-to-end by the user. `AccountMenu`
  `onclick={() => onSignOut()}`; `ConnectionBanner` gated on `wsClient`.
  Client 81 unit + 102 CT green.
- **Stale-session typed `session-not-found` (F001, d509)** —
  `tasks-signout-stale-session-terminal-d509.md` (`completed`, 5/5). Merged
  `55ba3dc`. Kept as defensive hardening — was NOT the sign-out blocker.
- **Stale-session WS reconnect storm + `/me` hardening (F002, F003)** —
  `tasks-signout-ws-reconnect-storm-c60d.md` (`completed`, 6/6). Merged `5857634`.
- **Sign-out verify-via-`/me` (F001)** — `tasks-signout-verify-via-me-7739.md`
  (`completed`, 3/3). Merged `0f8a3db`, deployed `d5f8c8f3`.
- **Sign-out reload race** — `tasks-signout-reload-race-e126.md` (`completed`).
  Merged `a683a97`, deployed `3305a830`.
- **Reachable account controls** — `tasks-reachable-account-controls-1787.md`
  (`completed`). Merged `318b7d2`.
- **Hide locked catalogues** — `tasks-hide-locked-catalogues-6009.md`
  (`completed`). Merged `a1e8446`.
- **Accounts Phase 1** — `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20).
  Merged `e2747b2`.

## Deploy status (production)

Canonical public domain: **https://sts.ty-pe.com** (custom domain; the
Railway-assigned `sync-tab-scroll.up.railway.app` also resolves).

- **OAuth sign-in — WORKING (verified 2026-07-14).** Both providers 302 to their
  auth endpoints with the correct prod `redirect_uri`
  (`https://sts.ty-pe.com/auth/{github,google}/callback`), PKCE + state present;
  GitHub sign-in confirmed end-to-end by the user. **Discrepancy to confirm:**
  the *deployed* Google client_id is `29801536638-b983…`, but earlier deploy
  notes referenced `607753971873-…` — make sure the callback URI is
  registered on the `29801536638` client.
- **Postgres / DATABASE_URL — done.** `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}`; `prevent_destroy` active; `/me`
  returns `{"accountsEnabled":true,...}`.
- **Sealed vars — pushed** (`*_OAUTH_CLIENT_ID/SECRET`, `SESSION_COOKIE_SECRET`,
  `PUBLIC_BASE_URL`). Optional cleanup: the inert legacy `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars can be deleted.
- **Lyrics-overlay + sign-out + part-mute-toggle — all deployed**
  (`index-Crk4cCoz.js` is the current live bundle, superseding both prior
  builds referenced above).

## Recommended next step

0. **Commit the uncommitted work** (diagram regen + local-dev-port fix,
   above) once the user is done testing locally — both are verified
   working, just held back mid-session.
1. **Live-audio-verify `feedback-lyrics-timing-tiro-c741.md`'s F001/F002**
   (in-tab ticker offset + full-lyric-sheet drift on "Time Is Running
   Out") — the static `.gp` parse this run did narrows the likely cause
   but can't itself confirm the fix; needs an actual playback session with
   audio to pin exact ticks/timestamps. Then `/ardd-plan` to turn it into
   tasks. ~~Diagrams regenerated this run~~ — done, see above.
2. **Retire `catalogue-co-owner-invite-flow`** by hand — its scope shipped
   as phase-2-in-app-authoring's Phase 6.
3. **Live check of Phase 2 in-app authoring** — no manual/live verification
   has happened yet, only the automated suite. Create a catalogue, add a
   song (real `.gp` file, real pipeline extraction), generate + redeem an
   invite link, confirm co-owner visibility, in a real running session.
4. **`/ardd-defects`** — refresh against everything since 2026-07-12
   (part-mute-toggle, phase-2-in-app-authoring).
5. **Live prod check of part-mute-toggle** — open the Preferences tab in a
   real session, confirm "Mute parts" lists every available part and
   actually silences the muted track's audio.
6. **Optional:** confirm the Google `29801536638` client's redirect URI is
   registered; `/ardd-update` to move off the beta channel gap.
