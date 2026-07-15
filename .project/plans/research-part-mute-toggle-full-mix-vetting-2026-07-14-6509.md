---
topic: "proposal: part-mute-toggle — per-participant full multi-track mix with individual part muting"
date: 2026-07-14
status: complete
---

# Research: part-mute-toggle proposal vetting

## Question

The backlogged feature `part-mute-toggle` reads: "each part with notes can
be individually muted by any participant to change what MIDI tracks play
during playback." Is this buildable as described, what would it actually
require given the current architecture, and is it worth doing?

## Findings

**Correction (recorded, not silently fixed):** this research initially
concluded — incorrectly — that `client/src/tab-renderer.ts:121`'s
`api.load(new Uint8Array(buffer), [trackIndex])` restricts playback audio
to a single track, meaning no full mix exists today. **That was wrong.**
The user flagged empirically that playback already sounds like all parts,
and checking alphaTab's own type definitions
(`node_modules/.pnpm/@coderline+alphatab@1.8.3/.../alphaTab.d.ts`) confirms
it: `load()`'s `trackIndexes` parameter is documented as controlling only
**which tracks are rendered** ("The indexes of the tracks from the song
that should be rendered. If not provided, the first track of the song will
be shown") — not which tracks play. Playback audio is driven by the full
loaded `Score` and includes every track by default; muting is the
opt-out, via `api.changeTrackMute(tracks, mute)` / `track.playbackInfo.isMute`.
`client/src/headless-player.ts` (the lyrics-part engine) goes through the
same `createTabRenderer` path, so this applies identically whether a
participant has an instrument or lyrics selected. Grepping the client for
any existing `changeTrackMute`/`isMute`/`playbackInfo` usage returns
nothing — no mute mechanism exists yet, but the full mix it would act on
is already playing for everyone, today, unconditionally.

**Revised understanding:** every participant already hears the full band —
every instrument track's MIDI — regardless of which single track they've
selected to *view* (rendered staff) or *drive their clock* (lyrics/headless
case). `[trackIndex]` only ever scoped the visual notation and the headless
case's non-existent staff; it never scoped audio. This makes far more sense
for a "practice together" tool than my original (wrong) reading — everyone
plays along to the same full mix while reading their own part.

**Consequence: this feature is smaller than originally scoped.** No change
to `tab-renderer.ts`'s or `headless-player.ts`'s `load()` call is needed —
the full mix is already loaded and playing. The feature is purely additive:
a client-local mute *preference* that calls alphaTab's existing
`api.changeTrackMute()` against the already-loaded score's tracks. Nothing
about the load/render architecture changes at all.

**Scope is 100% client-local, mirroring the existing metronome
precedent.** Every participant runs a fully independent alphaTab instance
with no shared audio stream (`ui.md`'s Playback View, Preferences
sections), so a mute choice can only ever be personal — there is no
mechanism by which one participant's mute could reach another's client,
and none should be built. This is the same shape as the existing personal
Metronome toggle (`client/src/metronome-preference.ts`, `ui.md`'s
Preferences tab, "Only you hear your metronome.") — a user-confirmed
reversal (2026-07-04) of an earlier host-controlled
`Session.metronomeEnabled` design specifically because per-participant
audio has no reason to touch the server. Count-in stayed host/session-level
because it's a *shared, session-wide* rhythmic cue that must sound
identical for everyone at the same tick; mute doesn't share that property.
So: **no `datamodel.md` changes at all** — no new `Session`/`Participant`
field — this is a `client/src/*-preference.ts`-style local preference, same
persistence pattern as the metronome. `Session.availableParts`
(`CatalogPart[]`, already delivered per song) is the natural source for
which parts to list as mutable — no new data needs publishing.

### Applying the critical lenses

- **Simplicity**: passes, more cleanly than originally assessed. No load/
  render architecture change at all — purely wiring an existing library API
  (`api.changeTrackMute`) behind a new client-local preference, the same
  shape the metronome toggle already established.
- **Failure modes**: (a) should a participant be able to mute their *own*
  selected/viewed part — no reason to forbid it, some practice workflows
  want to hear only the backing while reading their own tab; (b) applying
  persisted mute state at engine creation and on every part switch
  (`switchTrack()` doesn't touch mute state today, and shouldn't need to —
  mute is keyed by track, independent of which track is currently
  rendered); (c) since the full mix was already playing before this
  feature and already carries whatever CPU cost that implies, this feature
  adds no *new* synth-load concern beyond what's already shipped and live.
- **Standardness**: a per-track mute/solo mixer is a standard, expected
  feature in this exact app genre (Yousician, Ultimate Guitar-style tab
  players) — not a novel UX pattern to validate.
- **Robustness**: mute state never leaves the client, so there's no
  session-desync risk at all — every participant can diverge freely with
  zero coordination needed, unlike anything session-broadcast.
- **DRYness**: reuses the existing personal-preference module pattern
  (`metronome-preference.ts`) rather than introducing a second one.
- **Semantics**: "mute" (not "solo") matches the backlog's own wording and
  alphaTab's own `isMute` naming — no translation layer needed.
- **Proportionality**: zero server/datamodel changes, zero load/render
  architecture changes, one new client preference module, one new
  Preferences-tab UI section — proportionate to a genuinely useful,
  player-requested feature, and smaller than the first pass of this
  research estimated.

**Reversed decisions**: none, at the constitution or artifact-decision
level. `ui.md`'s framing ("every participant's clock... work identically
regardless of which one they're on") describes clock/timing uniformity,
which this doesn't touch. No formal decision changes — this was purely a
correction to my own understanding of what the code already does, not a
proposal to reverse anything on record.

## Recommendation

**Worth doing — plan it now, and it's simpler than a first pass suggested.**
Zero server/datamodel changes, zero load/render architecture changes (the
full mix already plays for everyone), a directly-precedented UI/persistence
shape to copy (the metronome toggle), and squarely inside what alphaTab's
own player API already does (Principle V). Route:

**`/ardd-plan part-mute-toggle`**

The plan should account for, at minimum:
- A new `client/src/track-mute-preference.ts` (or similarly named) module,
  same shape as `metronome-preference.ts` — persisted per-device, keyed
  per-song-and-track (a mute choice for "Bass" on one song shouldn't carry
  over to an unrelated song's "Bass" track index, which may point at a
  different instrument).
- Applying persisted mute state via `api.changeTrackMute()` at engine
  creation (mirroring how `metronomeVolume` is set at creation today) and
  whenever the mute preference changes — no load/render code changes
  needed.
- `ui.md`'s Preferences tab gains a "Mute parts" section, listing
  `Session.availableParts` with per-part mute toggles. Hint text mirroring
  the metronome's ("Only you hear this") to make the personal scope
  explicit.
- `infrastructure.md` gets a short note on the new client-local preference
  and that it operates on the score's existing full-mix playback (no
  load-time change), mirroring how the metronome preference is already
  documented there.

## Rejected Alternatives

- **Narrower reading — mute only within the participant's own single-track
  load** (an option offered to the user before this research ran, based on
  the since-corrected belief that only one track plays per participant):
  moot — the premise was wrong; a full mix already plays, so there's
  nothing narrower to fall back to.
- **Session-broadcast mute** (host- or session-controlled, like count-in):
  rejected — nothing about mute is a shared, must-be-identical-for-everyone
  property the way count-in's simultaneous click is; every other
  personal-audio precedent in this app (metronome) is client-local, and a
  broadcast mute would need new `Session`/`Participant` fields this
  feature doesn't otherwise require.
- **Custom Web Audio mixing layer**: rejected outright — alphaTab's own
  player already does exactly this; building a parallel mechanism would be
  a direct Principle V violation with no offsetting benefit.

## Open Questions

- Should a participant be allowed to mute their own currently-selected/
  viewed part? (Leaning yes — no clean reason to forbid it — but worth a
  one-line decision in the plan rather than leaving it implicit.)
- Does `ui.md`'s Playback View section need a documentation update to state
  explicitly that a full mix already plays today, independent of this
  feature? It's true today and this research only surfaced it as an
  implicit fact via code-reading — plausibly worth making explicit in the
  artifact regardless of whether `part-mute-toggle` proceeds, since it's
  exactly the kind of thing a future contributor (or research pass) could
  get wrong again the same way this one initially did.
