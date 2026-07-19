---
topic: sync-tabs-to-real-audio — proposal vetting (real recording instead of synth)
date: 2026-07-19
status: complete
---

# Research: Sync Tabs to Real Audio

## Question

Is syncing tab playback (cursor, ticker, session position) to a real
recording — YouTube like Songsterr, or an operator-supplied mp3 —
feasible and worth it, and in what form? (Vetting the backlogged
`sync-tabs-to-real-audio` feature.)

## Findings

### The headline: alphaTab already ships the hard 80%

**alphaTab 1.6.0 added native backing-track + external-media sync, and
our installed 1.8.3 has it** (docs:
alphatab.net/docs/guides/audio-video-sync; verified in the installed
`.d.ts`):

- `PlayerMode.EnabledBackingTrack` — alphaTab drives an
  HTMLAudioElement itself from `Score.backingTrack` (raw audio bytes);
  `PlayerMode.EnabledExternalMedia` — you implement
  `IExternalMediaHandler` (`seekTo`/`play`/`pause`/rate/volume) and
  pump `updatePosition(ms)`; this is the shape a YouTube adapter would
  take.
- **The per-song tick↔recording-time alignment map already exists as
  alphaTab's `MasterBar.syncPoints`** (`BackingTrackSyncPoint`:
  masterBarIndex, occurence for repeats, syncTime, derived per-anchor
  syncBpm — applied internally like extra tempo automations, Guitar
  Pro 8's own model; GP8 files with embedded backing tracks parse
  directly, and alphatab.net hosts a Media Sync Editor for authoring).
- In these modes `api.tickPosition` and all position events keep
  working — exactly the surface our whole sync layer consumes.
- Caveats (upstream #1961): **no mixing synth audio with a backing
  track** — per-track mute/solo, synth metronome, and synth count-in
  are unavailable in recording mode; playback-speed and range-selection
  disabled.

### Codebase seams (shallower than feared)

Every position consumer (cursor, ticker, lyrics sheet, beat widget,
progress, host tick-report at `playback-engine.ts:518-522`) subscribes
to `api.playerPositionChanged`/`api.tickPosition` — clock-source
agnostic. **Server protocol and `PlaybackState` need zero change**; the
host stays the functional authority (infrastructure.md decision
preserved — same api, different audio behind it). The two real seams:

1. `correctDrift`'s extrapolation (`playback-sync.ts:118-124`) converts
   elapsed ms → ticks via the score's **notated** tempo; against a
   recording, use sync-point-effective bpm or accept the approximation
   between anchors (bounded, one function, needs a skewed-score test).
2. Count-in guard + count-in beat scheduling key off synth count-in —
   must be bypassed in recording mode.

### YouTube vs mp3

- **YouTube**: IFrame API gives polled float seconds (no tick events),
  "suggested" rates, buffering stalls — and the **TOS is the hard
  wall**: required visible ≥200×200 player, no audio-only/background
  use, no caching. Songsterr complies with a visible mini-player and
  contributor-authored per-measure sync points. Worse for us: every
  participant would need their own embedded player — N independent
  lossy clocks with autoplay-gesture requirements. A separate,
  TOS-encumbered follow-on at best.
- **mp3 (operator-supplied)**: fits the existing architecture exactly —
  `recording.mp3` in the per-song catalog dir, served from the volume
  like the `.gp`, consent-gated for public serving via the existing
  ConsentRecord framework; every participant plays the same local
  recording (same N-local-players model as today's N synths); alphaTab
  owns the audio element. Licensing is the operator's responsibility,
  same posture as song files today.

### What recording mode suspends

Per-track mute/solo/"hear only my part", metronome, count-in — all
synth audio. Artifacts need a **mode-scoped carve-out** (not a
reversal) of "every participant plays the full multi-track mix": the
mix still loads for rendering; it just doesn't sound in recording mode.
Simplest count-in stance: recording mode ignores `countInEnabled` — the
recording's own intro is the count-in.

## Recommendation

**Keep backlogged, with the entry rewritten to the vetted MVP scope**
(done alongside this doc) — verdict strongly positive; it's a
phase-sized feature, not an epic, and `/ardd-plan
sync-tabs-to-real-audio` can take it directly whenever wanted.

**MVP**: mp3-only via `PlayerMode.EnabledBackingTrack`;
`recording.mp3` + a `syncPoints` field in `meta.json`
(`[{barIndex, occurence, syncTimeMs}]`, applied at scoreLoaded via
`addSyncPoint()` + `api.updateSyncPoints()`); all participants play the
recording locally; server untouched; host toggle `playbackSource:
'synth' | 'recording'`; count-in/metronome/per-part-mute disabled with
clear UI in recording mode; sync points authored externally
(alphatab.net's Media Sync Editor) — 2-3 anchors suffice for studio
recordings, more for live ones.

**Explicitly out of MVP**: YouTube (separate proposal if ever); in-app
sync-point authoring (natural later addition to phase-2 in-app
authoring); synth+recording hybrid mixing (alphaTab can't).

## Rejected Alternatives

- **Bespoke alignment engine / custom tick↔time map**: dead on
  arrival — alphaTab's syncPoints already implement it in Guitar Pro
  8's own standard model (DRY + standardness lenses).
- **YouTube-first**: TOS-required visible player, no audio-only use, N
  buffering iframe clocks across participants, polled time only —
  maximal failure modes for the worst clock. If ever, as an
  `EnabledExternalMedia` adapter after the mp3 path is proven.
- **Host-only recording playback** (others keep synth): breaks the
  everyone-hears-the-same-thing premise and still needs all the mode
  gating; no simpler than everyone-plays-the-mp3.

## Open Questions

1. Where `playbackSource` lives (per-session host toggle vs per-song
   default in meta) — plan-time decision.
2. Whether `correctDrift` uses sync-effective bpm or the notated-tempo
   approximation between anchors — decide with a test against a
   deliberately skewed score.
3. Sync-point authoring hand-off: is the alphatab.net Media Sync
   Editor's export directly importable into our meta.json shape?
   (Verify during the plan's diagnosis phase.)
