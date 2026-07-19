---
plan: plan-widgets-gp5-songswitch-2026-07-18-8bee.md
generated: 2026-07-18
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Song-switch race (feedback F001)

- [x] T001 Research (no production code): reproduce and diagnose the
  song-switch stale-score race
  (`feedback-song-switch-stale-score-e030.md` F001). Repro recipe from
  live testing: in a running session, host clicks "Change song", picks a
  different song, and hits Start quickly — the old tab view stays
  rendered and playback plays the OLD song's audio until a browser
  refresh. Instrument `client/src/playback-engine.ts` (the
  `ensurePlaybackEngine`/song-change path), `client/src/tab-renderer.ts`,
  and the store's selectedSong flow with console logging in a real
  browser; determine the exact ordering hole (playing before the new
  score's `scoreLoaded`/`isReadyForPlayback`? engine not torn
  down/reloaded on song change? renderer and synth updating
  independently?). Also check whether the server's `selectedSong`
  broadcast vs playback-start ordering contributes. Write the diagnosis
  as a note in this tasks file, naming the seam where a regression test
  can live.
- [x] T002 [artifacts: constitution, infrastructure] Test-first fix for
  the diagnosed race: write the failing regression test at the seam T001
  identified (vitest or Playwright CT per the module's existing
  conventions; `it.fails` marker on the red commit per the
  pre-commit-hook convention), then implement the minimal ordering fix
  (e.g. gate play/seek on the new score's readiness, or tear down and
  rebuild engine state on song change). Remove the marker; full client
  (and server, if touched) suites green.
- [x] T003 Live verification in a real browser: repeat T001's repro
  recipe post-fix — the new song's tab renders and Start plays the new
  song's audio with no refresh needed; also verify a normal
  (non-immediate) song switch and that the lyrics ticker follows the new
  song. Record outcomes in a tasks-file note.

> **T001 diagnosis (2026-07-19).** Reproduced live (dev server 6180 / vite
> 6101, scratch public catalog): host on Creep with a part selected, then
> Change song → Last Nite → re-select part + Start immediately. Result: the
> Bar shows "LAST NITE — The Strokes" and playback runs, but the lyrics
> ticker scrolls Creep's lyrics and the beat cursor advances over Creep's
> (still-loaded) score — exactly F001. Root cause is client-side and needs
> no timing race at all: `client/src/playback-engine.ts`'s module-level
> `EngineState` carries **no song identity** (`isLyricsPart`, `trackIndex`,
> theme… but no `songId`/`gpFilePath`). `App.svelte`'s reactive block does
> re-invoke `ensurePlaybackEngine(...)` with the NEW song after the
> `selectedSong` broadcast, but the function's early-return ladder
> (playback-engine.ts:71-82) matches on `isLyricsPart`/`trackIndex` only,
> so a same-part song switch hits the final `return` and the old api —
> old score, old lyrics overlay, old synth MIDI — survives untouched.
> When the host hits Start, the `clientStore.subscribe` block's
> `correctDrift` sees status `running` and calls `play()` on that stale
> engine. The server side is innocent (selectedSong broadcast arrives
> before playback-start; verified in the repro — the Bar title had
> already updated). Fix seam: add song identity to `EngineState` and make
> `ensurePlaybackEngine` tear down (`api.destroy()`) + rebuild when the
> incoming `song.id` differs — same shape as the existing
> lyrics-part-kind-change teardown. Regression test seam:
> `playback-engine.ct.spec.ts` via `PlaybackEngineHarness` (add a
> `__switchSong` hook mirroring the existing `__switchPart`), asserting a
> second ensurePlaybackEngine call with a different gpFilePath actually
> loads the new file's score instead of early-returning.

> **T003 live verification (2026-07-19, post-fix).** Same rig as T001.
> (1) Immediate switch: Creep (Lead Guitar, READY) → Change song → Last
> Nite → part + Start in one motion — the OLD Creep tab disappears the
> instant the selectedSong broadcast lands (dropEngineIfSongChanged), the
> Last Nite tab renders, the cursor advances over it, and the ticker
> scrolls Last Nite's lyrics ("Last ni- ght, she sa- id…"). No refresh.
> (2) Normal switch: Last Nite → Supermassive Black Hole, part picked at
> leisure — new tab renders and plays. (3) Ticker follows: found during
> this verification that api.destroy() left the OLD song's lyrics-ticker
> overlay DOM scrolling under the new engine (Supermassive has no lyric
> data, so the Last Nite ticker persisted) — destroyEngine() now also
> calls overlay.destroy(); re-verified live: switching Last Nite →
> Supermassive removes the ticker immediately. Engine-audio and renderer
> share one alphaTab api, so the rendered score being correct implies
> the played score is too (and the ticker/cursor tracked the new song's
> timing in real playback).

## Phase 2: GP5 raw lyric line (gp5-raw-lyric-line-extraction)

- [x] T004 [artifacts: pipeline] Test-first: create a GP5 lyrics-block
  reader in `packages/pipeline` (sibling to `readRawLyricsLine` in
  `line-breaks.ts`) that detects the legacy binary header (`FICHIER
  GUITAR PRO…`, no zip) and parses the GP5 lyrics block: version string,
  then (for GP4/GP5) the lyric track number int32 followed by five
  `{start-measure int32, length-prefixed string}` lyric lines; return
  line 1's text + start measure. Unit-test against a small synthetic
  GP5 byte fixture plus the real catalog file
  `catalog/muse-supermassive-black-hole/Muse-Supermassive Black Hole-07-11-2026.gp`
  (skipIf the gitignored catalog is absent — same guard as the shared
  suite's real-file tests). Per plan Open Question 3: if the real file's
  layout deviates from the documented GP5 structure, return null (field
  omitted, current fallback behavior) and record findings in a
  tasks-file note rather than forcing a parse.
- [x] T005 [artifacts: pipeline, datamodel] Wire the GP5 reader into the
  extraction flow: `extract-lyrics` publishes `lyricsRawLine` (and
  `lyricsRawLineStartBar` when non-zero) for GP3–5 files exactly as the
  GP7/8 gpif path does; the `.lrc` generation and client already consume
  the field format-agnostically. Test-first at the extract-lyrics level
  (GP5 input → meta fields present). Then re-ingest Supermassive
  (`pnpm --filter @sync-tab-scroll/pipeline extract-lyrics ...` with its
  catalog dir) and spot-check: meta gains `lyricsRawLine`, regenerated
  `.lrc` looks sane (first line at a plausible time, last line near song
  end). Record a one-line ear-check guide for the user.

> **T004/T005 GP5 findings (2026-07-19).** The documented GP5 layout parses
> cleanly against the real file — version block (31 bytes), nine
> int32+byte info strings, int32 notice count, then the lyrics block
> {int32 lyric track; five × {int32 startMeasure, int32 length + cp1252
> bytes}} — no structural deviation. BUT Supermassive Black Hole's GP5
> carries an **empty lyrics block** (all five lines zero-length,
> startMeasure 1) and no per-beat lyrics on any of its 5 tracks either
> (verified via alphaTab model walk). So per plan Open Question 3 the
> reader returns null for it and `meta.json` keeps omitting
> `lyricsRawLine` — its `.lrc` remains the lrclib passthrough, same as
> before this feature. The reader + format dispatch
> (`readRawLyricsLineAuto`, which also keeps the zip/gpif reader from
> throwing on legacy binaries) are fully built and unit-tested against a
> synthetic GP5 fixture (incl. cp1252 decoding and GP3 rejection), so any
> future lyric-bearing GP4/GP5 upload gets the raw-line dispatch
> automatically. Re-ingest ran clean: regenerated .lrc first line at
> 00:32.81 ("Ooh, baby, don't you know I suffer?"), last line 03:26.54
> near song end. **Ear-check guide:** play Supermassive with the Lyrics
> part and confirm the first "Ooh, baby…" lands with the first sung word
> (~0:33) — timing shifts a fraction of a second vs. the previous ingest
> (lrclib passthrough refresh), nothing structural.

## Phase 3: Beat widget (count-in-metronome-beat-widget)

- [ ] T006 [artifacts: ui, brand, infrastructure] Test-first: create the
  beat-timing derivation for the widget — a pure module (e.g.
  `client/src/beat-clock.ts`) that, given a tick position, the score's
  master bars (time signature numerator per bar), and `localTempoAtTick`
  (`tempo-lookup.ts`), yields `{beatInBar, barNumber, beatCount}` —
  counting to the actual time-signature numerator, not a hard-coded 4
  (plan Open Question 1 default). Unit tests: 4/4 steady tempo, a tempo
  change mid-song, a non-4/4 bar, tick 0/negative (count-in region).
- [ ] T007 [artifacts: ui, brand] Test-first (Playwright CT per client
  conventions): create the Bar beat-widget component per ui.md's
  Count-In & Metronome Beat Widget section — single shape, fill color
  animating each beat with alternating direction (primary→secondary on
  odd→even beats, secondary→primary on even→odd), driven by real beat
  boundaries from T006's module (scheduled off `playerPositionChanged`
  ticks, never a fixed-interval timer). Count-in mode: counts down from
  the bar's beat count to 1, shown to every participant, gated on the
  session's `countInEnabled`; playback mode: counts up 1→numerator with
  a labeled, less-prominent measure number ("Measure 12"), gated on the
  participant's own Metronome preference (`metronome-preference.ts`).
  Colors from brand.md theme token pair; exact shape/layout is
  implementation-time visual judgment (keep it consistent with existing
  Bar controls). CT covers: mode selection + gating matrix (countIn
  on/off × metronome pref on/off), count values at known ticks, and
  that the widget renders nothing when both gates are off.
- [ ] T008 Wire the widget into the persistent Bar (`client/src/`
  wherever Bar controls mount — alongside transport/settings), reading
  session `countInEnabled` and the local Metronome preference from
  their existing sources. Live verification in a real browser: start
  playback with count-in enabled (widget counts 4→1 for everyone, in
  time with the click), then during playback with Metronome pref on
  (1→4 + measure number advancing, staying locked to the click through
  the song), and confirm it disappears when both gates are off. Record
  outcomes in a tasks-file note.

## Phase 4: Close-out

- [ ] T009 [parallel] Note the prod-catalog follow-up: Supermassive's
  regenerated `meta.json`/`.lrc` live only in the local gitignored
  catalog until the volume re-upload procedure (README "populate the
  catalog volume": `COPYFILE_DISABLE=1 tar … | railway ssh …` +
  `railway redeploy`) is run again. Append the reminder to this tasks
  file's notes (the coordinator/user runs the transfer — do NOT run
  railway commands from the worktree). No code.
