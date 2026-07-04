---
name: ui
status: stable
last_updated: 2026-07-04
diagram_status: stale
---

# UI

## Overview

Three-view flow: landing (create/join) → lobby (pick song/part, see who's
ready) → playback (synchronized scroll/lyrics/metronome view). View state
lives in the single client store (constitution principle I); components
don't hold their own nullable refs set as a side effect of framework
lifecycle hooks.

Client reactivity/templating is Svelte + Vite (plain Svelte, not
SvelteKit — see infrastructure.md).

## Landing View

An initial chooser ("Create a session" / "Join a session") leads to one of
two separate forms, each with its own "Your name" input: the create form
just needs a name; the join form additionally needs a session code. Each
form is a native `<form>` with its own `onsubmit`, so pressing Enter
submits that form directly — no shared name field and no keydown-guessing
between two co-located actions, since only one form is ever shown at a
time. Both forms have a small "Back" control returning to the chooser.
Persists session code + display name (e.g. to localStorage) so a refresh
can silently rejoin, bypassing the chooser entirely when a stored session
exists.

## Lobby View

The persistent Bar's identity area always shows the session's join code
(`Session.code`), regardless of whether a song has been selected yet —
once a song is picked, its name/artist render alongside the join code,
not in place of it, so participants can still read off the code to invite
others after song selection.

Song and part selection happens in a modal, not inline in the Lobby body
— opened via a "Song & part" control in the persistent nav bar, and
opened automatically (non-dismissibly, while either is unset) whenever
the current participant has no song selected for the session or no part
selected for themselves; once both are set, the modal becomes dismissible
and stays closed until reopened via the nav control. Inside it: host
picks a song from the catalog (name + artist per entry, delivered once
per client on session create/join — infrastructure.md, datamodel.md) via
a simple list picker; selecting an entry broadcasts the choice to every
participant in the session so the part picker reflects the newly-selected
song's `Session.availableParts`. Re-selecting a different song while
participants already have parts chosen resets those choices (a part
index/id from the old song's `CatalogSong.parts` has no guaranteed
meaning against the new song) — each participant's `selectedPart`
reverts to `null` and readiness to `'no-part'`, same as first joining.
Each participant picks their part and signals readiness. The part picker
includes a **Lyrics** option alongside the instrument parts — selectable
like any other part, but disabled when the song has no `.lrc` file
(datamodel.md `CatalogSong.lyricsLrc`). The in-tab lyrics overlay
(Playback View, below) is gated separately on `CatalogSong.lyricsTrackIndex`,
which is only present when the song's lyrics came from the source GP file
directly — a song whose `.lrc` came from the lrclib.net fallback has the
Lyrics part selectable but no in-tab overlay available on any instrument
part (pipeline.md).

The persistent nav bar also always carries a "Leave session" control
(present in both Lobby and Playback, alongside "Song & part" and the
settings cog) — clicking it closes the WebSocket connection, clears the
participant's persisted local identity (the code/displayName/participantId
`session-persistence.ts` stores for refresh-reconnect), and returns to the
Landing view so the participant can join or create a different session.
There is no separate server-side "left the session" protocol message —
this reuses the existing disconnect path (the same cleanup a lost
connection already triggers: readiness/host-succession handling,
infrastructure.md), just triggered deliberately by the client instead of
a dropped socket.

A second, separate modal — opened via a settings-cog control in the
persistent nav bar — holds everything that used to render inline in the
Lobby body. Unlike the song/part modal, it's a plain freely-openable/
dismissible modal with no forced-open gating, and it has two tabs. The
cog itself is reachable from both the Lobby view (alongside "Song &
part") and the Playback view (see Playback View, below) — the settings
modal, and its theme toggle in particular, needs to be reachable
regardless of whether playback has started:

- **Participants**: the live participant list with readiness state and
  Host Transfer controls (infrastructure.md), which differ by viewer and
  by row:
  - **The host** sees a "Make host" control on every other participant's
    row (never their own) — regardless of that participant's connection
    status; a disconnected participant's row still shows it, and clicking
    it is one of the ways a stale-target error (States, below) can
    surface. Clicking it immediately transfers host privileges to that
    participant, no confirmation dialog — consistent with this app's
    existing pattern of treating host actions as immediate and terse
    (e.g. re-selecting a song silently resets every participant's part
    choice). If that row also happens to have a pending request (below),
    clicking "Make host" grants it — there is no separate "Accept"
    control, since granting a request and delegating to that participant
    are the same action (infrastructure.md Host Transfer). A row with a
    pending request additionally shows a "Decline" control next to "Make
    host", for the host to reject the request without transferring.
  - **A non-host participant** sees a "Request to become host" control on
    their own row only. It's disabled (not hidden) while
    `Session.pendingHostRequest` is already set — to them or to anyone
    else — so the reason it's unavailable stays visible instead of the
    control silently disappearing.
  - **Every participant** (host or not) sees whichever row
    `Session.pendingHostRequest` currently points to render a pending-
    request indicator instead of that row's normal readiness display —
    interactive ("Decline", per above) for the host, a plain
    non-interactive label for everyone else. This follows from the
    feature's reliance on the ordinary `session-state` broadcast
    (Principle I) rather than a host-only side channel: everyone sees the
    same state, only the host's row-level controls are actionable.
  - The list updates for everyone the moment the resulting `session-state`
    broadcast arrives — no local optimistic update needed on any of these
    actions.

  Below the participant list: the "lobby cursor" readout (lets the host
  point at a position in the score for others to see before playback
  starts) and, for the host only, one row of controls — set/clear the
  lobby cursor, a "Spotlight mode" toggle, and two more host-only toggles,
  "Metronome" and "Count-in", all side by side. While Spotlight mode is
  on, the lobby cursor forces every participant's view to follow it;
  while off, each participant is free to browse their own rendered tab
  independently, and the lobby cursor's tick is shown only as an
  informational readout (not applied to anyone's view). Spotlight mode
  resets to off when playback starts, same as the lobby cursor itself
  resetting to null. Metronome/Count-in set `Session.metronomeEnabled`/
  `countInEnabled` (datamodel.md; already wired to alphaTab's
  `metronomeVolume`/`countInVolume` in `playback-sync.ts`,
  infrastructure.md, but previously had no message/handler letting the
  host actually set them). Same UI treatment as Spotlight mode: visible
  and interactive only for the host, with no separate readout shown to
  non-host participants — the audible effect itself (or its absence) is
  every participant's confirmation that the setting took. Grouped here
  rather than in the Settings tab because, like Spotlight mode and the
  lobby cursor, they're host-controlled *session* settings broadcast to
  everyone, not a personal display preference — the Settings tab is
  reserved for the latter (theme, below). This is the default tab.
- **Settings**: a dark/light theme toggle — the app's first in-app theme
  control (`client/src/theme.ts`); toggling it switches both the app's CSS
  palette and the tab notation's colors together, and the choice persists
  across a refresh.

Clicking "Start" closes both the song/part modal and this settings modal
if either is open (not the lyrics overlay, a separate on-tab toggle
unrelated to either modal).

With both of those moved out, the routed Lobby view body itself is now
just a single state-dependent hint line, checked in this order:

1. No session loaded yet (the initial moment after the WS connection is
   established but the first `session-state` message hasn't arrived):
   "Connecting…"
2. Not host, and no song selected yet: "Waiting for the host to pick a
   song."
3. Host, and no song selected yet: "Pick a song to get started," plus a
   pointer to the "Song & part" nav-bar control.
4. A song is selected but this participant has no part yet: "Select your
   part," plus the same pointer.
5. Both are set: "`{readyCount}` of `{totalCount}` ready — waiting for
   host to start."

Cases 2-4 normally render behind the song/part modal's existing
forced-open, non-dismissible backdrop (unchanged scope) — reachable in
principle, not literally dead code, just usually covered immediately in
today's normal flow.

## Playback View

Two renderings depending on the participant's selected part, both backed by
their own `@coderline/alphatab` instance (infrastructure.md) so every
participant's clock, drift correction, and metronome/count-in audio work
identically regardless of which one they're on:

- **Instrument part selected**: the part's tab is rendered live by a
  visible alphaTab instance. The exact beat being played is shown by
  alphaTab's own native cursor overlay (`.at-cursor-bar`/`.at-cursor-beat`)
  — drawn from the same render pass as the staff itself, not a separately
  computed overlay, so it can't drift out of position relative to the
  notation the way a precomputed layout-derived cursor could. An optional
  lyrics overlay can be toggled on as a single-line horizontal ticker
  fixed to the bottom of the viewport: syllable text and tick position
  are read live off `CatalogSong.lyricsTrackIndex`'s beats (not the
  currently-viewed instrument track's own beats, which is usually a
  different track entirely), flattened into one continuous stream. The
  strip never wraps to multiple lines — as syllables advance it scrolls
  right-to-left, snapping (not continuously gliding) so the currently
  active syllable, styled via alphaTab's `.at-highlight` role, is
  re-centered on each syllable change; the centering uses plain DOM
  measurement (`offsetLeft`/`offsetWidth`) against the ticker's own
  rendered layout, not an alphaTab bounds lookup, and is recomputed on
  window resize. This overlay is custom client logic, not alphaTab's
  native lyrics rendering — alphaTab only draws lyric text natively on
  the track that actually carries it, which usually isn't the instrument
  track a participant is viewing.
- **Lyrics part selected**: no tab is rendered — this participant's
  alphaTab instance runs **headless** (no visible staff at all), driving
  only audio (metronome/count-in) and the shared clock. Full lyric text is
  shown in large font, driven by `CatalogSong.lyricsLrc` line timestamps,
  with a timing animation (e.g. line-to-line highlight/transition)
  standing in for the cursor an instrument view would otherwise show. This
  is a custom view, not alphaTab's native lyrics rendering with notation
  hidden — alphaTab lays lyric text out as part of its normal paginated
  bar-by-bar score grid, which would produce small per-bar lyric
  fragments wrapping across rows, not the large single-line karaoke-style
  display this view wants.

Both renderings share alphaTab's native metronome and count-in
(`metronomeVolume`, `countInVolume` — off by default, toggled via
`Session.metronomeEnabled`/`countInEnabled`), so the audio is identical
whether or not the participant's alphaTab instance has a visible staff.
Host controls start/pause/resume/seek; a count-in countdown can precede
playback start. The host's view exposes seek (click-to-position) when
paused; participants' views don't.

The settings-cog control (Lobby View, above) remains in the persistent
nav bar here too, so the Settings tab's theme toggle stays reachable
without stopping playback — the app's theme control isn't gated to any
one view. "Leave session" (Lobby View, above) is likewise always present.

## States

- **Loading**: per part, loading now means alphaTab initializing and
  rendering the `.gp` file (or, for the lyrics part, initializing
  headless) plus loading the shared SoundFont asset for audio
  (infrastructure.md) — show a loading/readiness state per participant
  rather than blocking the whole lobby. The lyrics part still has a load
  step (headless alphaTab init, `.lrc` fetch); it's not exempt from
  loading just because it renders no staff. This load is triggered the
  moment a participant's part is known (song selected + part picked), in
  the Lobby — not on entering the Playback view — so the host can
  actually observe everyone reach `ready` before starting; the renderer/
  headless instance and its containers persist across the Lobby→Playback
  transition rather than being torn down and recreated.
- **Empty**: no song selected yet — the song/part modal auto-opens
  showing the catalog picker only; the part picker within it appears
  once `Session.selectedSong` is set.
- **Error**: join-by-code failure (invalid/expired code), part-not-found,
  not-host action attempts, host-delegation/decline targeting a
  participant who's no longer connected or no longer valid (a race
  between clicking a Host Transfer control and that participant's state
  changing), and requesting host while a request is already pending —
  surfaced as toasts, not blocking modals.

Color, typography, tone, and motion are owned by `brand.md`, not this
artifact.
