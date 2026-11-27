# Recording timing tools

These scripts measure where a song is actually sung or played in its
`recording.mp3`, then fit the `syncPoints` in `meta.json` that map the tab
onto it. They're operator tools, not part of the app or the pipeline. Their
results are recorded in `docs/catalog-sync-points.json` and
`docs/catalog-patches.md`.

Every script has a usage docstring at the top. Read it before running.

## Setup

- **TypeScript scripts** import the pipeline (`../../packages/pipeline/src/…`).
  Run them from `packages/pipeline`:
  `./node_modules/.bin/tsx ../../tools/timing/<script>.ts <args>`.
- **Python scripts** need Python 3.11 with torch/torchaudio 2.8, demucs 4.1,
  numpy and scipy. Create the venv outside the repo:
  `python3.11 -m venv <dir> && <dir>/bin/pip install torch==2.8.0 torchaudio==2.8.0 demucs==4.1.0 numpy scipy`.
- **Stems:** split them with
  `<venv>/bin/python -m demucs [--two-stems vocals] -o <out> <mp3>`. Use the
  4-stem split (drums/bass/other/vocals) for the instrument method. Keep stems
  and other outputs out of the repo, since they're derived from the
  copyrighted recording.

## Two methods

**Songs with tab lyrics (a vocal track): vocal alignment.**
1. Make a scratch copy of the song folder with two placeholder sync points:
   bar 1 at the instrumental onset (`onset.py`), and the last bar's end at the
   end of the mp3.
2. `app-times.ts` gives where the app shows each syllable.
3. `global_align.py` force-aligns the lyric words against the vocal stem
   (wav2vec2, whole song in one pass, so repeated choruses can't cross-match).
4. `propose_sync.py` places one anchor per 8 bars from the median drift. A
   steady take gets two points from a straight-line fit (`fit.py`).
5. `residuals.py` lists words that stay off after the fit. Those are
   lyric-placement problems in the tab, not sync problems.

**Songs without tab lyrics: instrument alignment.**
1. `tab-onsets.ts` writes per-track tab onsets in playback order (repeats
   expanded).
2. `stem_align.py` cross-correlates them with the drum, bass and guitar stem
   onset envelopes in sliding windows. Fills and stops make the match unique,
   where a plain beat grid isn't.
3. `fit_sync.py` / `fit.py` fit a line or piecewise anchors.
4. `hitcheck.py` checks the fitted map against the drum hits.
5. `lrc_check.py` checks lrclib line starts against vocal phrase starts.

## Checks and helpers

- `check_beats.py`: beat-grid consistency. It's weak: it only gives phase
  modulo a beat, and it's ambiguous on strummed songs.
- `verify-sync.ts`, `sync-roundtrip.ts`: replay points through alphaTab's own
  `applyFlatSyncPoints`.
- `tempo.ts`, `tempomap.ts`, `first-notes.ts`, `pb-times.ts`, `winfit.py`,
  `drift.py`: smaller helpers.

## Known pitfalls

- **Aligner bias:** the aligner places vowel-initial words 140–170 ms late.
  Fit on consonant-initial words.
- **Frame time:** compute it as `1000 * hop / sr`, never a nominal 5 ms or
  1 ms. A rounded hop stretched every time by 0.23% until it was fixed on
  2026-11-27.
- **Notated tempo changes:** sync points interpolate in notated time, so a
  notated tempo change needs a point on each side of it.
- **Repeats:** a point in a repeated bar needs the right `barOccurence`.
- **Circular checks:** a fit always looks good against the data it was fit
  to. Confirm it with an independent signal (another stem, the instruments
  vs. the vocals) or by ear.
