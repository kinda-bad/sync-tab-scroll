---
name: ui
status: stable
last_updated: 2026-07-19
diagram_type: graph TD
render_section: UI
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

An **optional account layer** (Account & Sign-In, below) sits alongside this
flow without changing it: every view works fully signed-out — the default — and
signing in never gates anything. It only *adds* (a signed-in host's redeemed
catalogue unlocks are remembered; in-app authoring later). When the server runs
with no database configured (infrastructure.md's DB-optional boot), the sign-in
affordances are simply absent and the app presents exactly as it does today.

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

## Account & Sign-In (Optional)

Optional identity layer (constitution v1.5.0; infrastructure.md's User
Accounts). **Strictly additive and never a gate**: create, join, pick, and play
all work fully signed-out — the default — and no view is ever blocked behind
sign-in.

**Sign-in affordance.** The same small **account menu** (the `AccountMenu`
component) renders in both the **Landing View** chooser and the Lobby/Playback
Bar's identity area, so a signed-in user can see who they are and sign out from
anywhere — before joining a session and inside one. It shows the signed-in
display name (from the provider profile) with a **Sign out** action when
signed-in, and a compact "Sign in" link when signed-out; on Landing it stays
visually subordinate to Create/Join (it's optional, never a gate). When
accounts are unavailable it renders nothing (see States). Choosing a provider
hands off to the provider's OAuth consent screen
(infrastructure.md's OAuth flow) as a full-page redirect; on return the app
reloads and silently rejoins any stored session via the Landing View's existing
refresh-rejoin path — so there is no special mid-session login handling.

**What signing in changes — nothing is removed, only added:**
- In the Lobby song picker, a private catalogue the **signed-in host is already
  a member of appears pre-unlocked** — its group and songs list directly,
  without the host entering its activation key, because it auto-unlocked from
  the host's membership (infrastructure.md). The host never re-types a key
  they've redeemed before — the motivating payoff of the feature.
- Entering an activation key **while signed in** persists the unlock to the
  host's account for future sessions (a subtle "remembered" affirmation),
  versus the signed-out case where it unlocks only the current session.
- **In-app authoring (Phase 2)** — see the dedicated section below.

**States** (the account menu behaves identically wherever it renders — Landing
and Bar):
- *Signed-out* (default) — full functionality; the account menu is a "Sign in"
  link (on both Landing and the Bar). Indistinguishable from today's app for
  anyone who never signs in.
- *Signed-in* — account menu shows display name + Sign out (on both Landing and
  the Bar); member catalogues appear pre-unlocked in the picker.
- *Signing out* — **Sign out** revokes the session server-side, then confirms
  the outcome by **re-reading `/me`** (the source of truth) rather than trusting
  the `/auth/logout` response — which can be aborted client-side even when the
  server completed the logout. On a `/me` that reports *Signed-out*, the account
  menu flips to *Signed-out* **in memory**, with no page reload. A **failed**
  sign-out (still *Signed-in* per `/me`) keeps the user *Signed-in* and surfaces
  a terse **Error toast** ("Sign out failed — please try again."), rather than
  reloading into a signed-out-looking state — same terse-toast Error pattern as
  other per-action failures (States, below). Re-reading `/me` instead of trusting
  the logout response fixes the race where a trailing `window.location.reload()`
  aborted the in-flight logout and left the user still signed in (feedback F001).
  If the post-logout `/me` confirmation is itself **unreachable/aborted** (a
  transient network failure, not a server answer), the account menu stays
  *Signed-in* and surfaces the same retryable **Error toast** — it does **not**
  fall through to *Accounts unavailable* (that state means "the server has no
  accounts", a claim only an actual `/me` answer can make; a failed fetch never
  touches the account store). The user simply retries (feedback F003).
- *Accounts unavailable* — when the server runs with no database configured
  (infrastructure.md), the account menu renders nothing anywhere; the sign-in
  affordances are simply **absent** (on both Landing and the Bar), not shown
  disabled or errored; the app presents exactly as the signed-out case. This is
  reserved for a server that reports accounts are off (`/me` with
  `accountsEnabled: false`) — never a transient `/me` fetch failure, which
  leaves whatever account state was already resolved untouched.

## In-App Authoring (Phase 2 — Optional, Owner-Only)

Reachable only for a signed-in `User` who owns at least one catalogue
(`CatalogueOwnership`, datamodel.md) — absent entirely for a signed-out or
non-owner participant, same "absent, not disabled" pattern the account menu
itself uses. A new "My catalogues" entry in the account menu (Landing and
Bar, alongside Sign out) opens the authoring surface as its own modal, not a
tab inside the existing Song & Part or Settings modals — authoring is a
distinct activity from picking a song to play, not a mode of either.

- **Catalogue list** — every catalogue the signed-in user owns, with a
  "Create catalogue" action (name + public/private + key, mirroring the
  CLI's `create-catalogue` arguments) and, per catalogue, an "Add song"
  action and a song list.
- **Add song** — a file picker for a `.gp` file plus the same consent
  fields the CLI's `record-consent` step captures (submitter identifier,
  ToS acceptance) — one form, not two separate steps, since both are
  required before a song can be added. Submitting shows real progress
  (uploading → pipeline running → done/error) rather than a single opaque
  spinner, since server-side pipeline extraction (infrastructure.md) can
  take a few seconds and a bare spinner gives no signal if it's stuck vs.
  slow. An error (parse failure, oversized file, pipeline extraction
  failure) surfaces inline in the form, not as a toast — the user needs to
  see it next to the file they picked to retry meaningfully, unlike the
  terse toast pattern used for session-level errors elsewhere (States,
  below) which have no comparable "try again with this specific input"
  context.
- **Consent/ToS capture** — the in-app equivalent of the CLI's
  `record-consent`, writing the same Consent Record shape
  (infrastructure.md). On the public Railway deployment, if the runtime
  consent-gating flag (infrastructure.md) is off (no real ToS text yet),
  the "Add song" action itself is **absent** — same pattern as every other
  server-capability gate in this app (Accounts unavailable, above) — not
  shown disabled with an explanatory tooltip. Self-hosted deployments with
  the flag unset entirely (no gate configured) see the action normally.
- **Ownership/invites** — a "Co-owners" section per catalogue listing
  current owners and an invite-by-link control (the design's recommended
  transport — no email-sending infrastructure exists or should exist for
  this). Generating an invite link is owner-only; visiting one, for a
  signed-in user, grants `CatalogueMembership(grantedVia:'invite')` and
  `CatalogueOwnership` in one action — there is no separate "accept"
  step distinct from following the link while signed in, mirroring the
  existing pattern of host actions in this app being immediate and terse
  (Lobby View's "Make host" control, below, is the precedent).
- **Unpublished catalogue visibility** — an owner sees their own
  not-yet-shared-with-anyone catalogue in the Lobby's song picker the
  moment they join a session, even though no one has unlocked it by key —
  the per-user visibility infrastructure.md's `visibleCatalog()` extension
  provides. It renders identically to any other visible private
  catalogue in the picker; there is no separate "draft" visual treatment,
  since an owner-visible catalogue is fully playable, not a preview.

## Lobby View

The persistent Bar's identity area always shows the session's join code
(`Session.code`), regardless of whether a song has been selected yet —
once a song is picked, its name/artist render alongside the join code,
not in place of it, so participants can still read off the code to invite
others after song selection.

Song and part selection happens in a modal, not inline in the Lobby body
— opened via a "Song & part" control in the persistent nav bar, and
opened **automatically once** whenever the current participant has no song
selected for the session or no part selected for themselves. The modal is
always **dismissible** (× / backdrop click / Escape); once dismissed it
stays closed until reopened via the "Song & part" nav control, even while
song or part is still unset. Rationale: a persistent Bar control (Sign out,
Leave) must stay reachable, so no modal may permanently trap the user —
dismissing the picker always reveals the Bar beneath it. Inside it: host
picks a song from the catalog (name + artist per entry, delivered once
per client on session create/join — infrastructure.md, datamodel.md) via
a simple list picker, grouped by `Catalogue` (`catalog-activation-key-access`)
when more than one **visible** catalogue is present — a public catalogue's
songs list directly under its name. A private, not-yet-unlocked catalogue
**does not appear in the picker at all** — no name, no locked indicator, no
song list; the client never even learns it exists, because the server's
`visibleCatalog` withholds locked catalogue metadata entirely
(infrastructure.md). The host (and only the host) instead sees a **single
standalone "Enter activation key" control** in the modal body — persistent, not
attached to any catalogue group, since the host no longer picks *which* locked
catalogue to unlock (there is nothing shown to pick). Submitting a key sends
`catalogue-unlock { key }` (infrastructure.md — no catalogue id); the server
resolves the key against every locked catalogue and, on a match, the
newly-unlocked catalogue's group appears in the list, exactly as an
already-unlocked private catalogue would; on a wrong key (or a key matching no
catalogue — indistinguishable by design), a toast (States, below), same terse
pattern as other errors here. When the host is **signed in and already a
member** of a private catalogue, that catalogue is **pre-unlocked** here — its
group appears from the start, without the host entering any key (Account &
Sign-In, above); and entering a key while signed in **persists** the unlock to
the host's account for future sessions, not just this one (infrastructure.md).
Signed-out, the key control and its per-session-only unlock behave exactly as
before. A non-host participant never sees the locked catalogues nor the unlock
control — waiting on the host, same as every other host-gated action in
this modal. Selecting an entry broadcasts the choice to every
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

**Bar controls are icon-based** (`lucide-svelte`, adopted per constitution
Principle V rather than hand-rolled inline SVGs), reclaiming horizontal
space in the persistent bar: "Song & part" renders as a `ListMusic` icon,
the settings control as a cog icon, the in-tab lyrics toggle as a
`MicVocal` icon (Playback View, below — also reachable from the Lobby,
not just Playback, once a part is picked), "Leave session" as an
exit-door icon (`LogOut`), and the host's transport controls (Playback
View, below) as tape-recorder-style symbols (play/pause/square). Every
icon-only control still carries its full text as an accessible name —
`Button.svelte`'s `iconOnly` mode sets `aria-label`/`title` from the same
`label` a text button would show, so screen readers read the original
wording even though no text is visibly rendered. The native `title`
attribute alone is an unreliable *visible* hover cue (inconsistent timing
across browsers, and does nothing on touch screens); a dedicated `Tooltip`
component supplements it — shown on mouse hover (desktop) and on
long-press (touch), dismissing on pointer-leave or release/tap-elsewhere —
applied uniformly to every icon-only bar control listed above.

A second, separate modal — opened via a settings-cog control in the
persistent nav bar — holds everything that used to render inline in the
Lobby body. Unlike the song/part modal, it's a plain freely-openable/
dismissible modal with no forced-open gating, and it has four tabs,
split by who a control affects: **Participants** (who's here + host
transfer), **Session** (host-broadcast controls everyone is affected
by), **Preferences** (personal, this-device-only settings), and
**Tracks** (personal per-part mute controls, moved out of Preferences —
below). The tab strip renders as an equal-width segmented row at the
section-label type size, so all four tabs fit on one line down to
360px-wide screens. The
cog itself is reachable from both the Lobby view (alongside "Song &
part") and the Playback view (see Playback View, below) — the settings
modal, and its theme toggle in particular, needs to be reachable
regardless of whether playback has started:

- **Participants**: the live participant list with readiness state and
  Host Transfer controls (infrastructure.md), which differ by viewer and
  by row:
  - **Every row** shows which part that participant currently has
    selected — the instrument name (`Session.availableParts`, matched by
    `CatalogPart.trackIndex` against `Participant.selectedPart`) or
    "Lyrics" for the tab-less lyrics part — as part of the row's existing
    sublabel, alongside "HOST" when both apply (e.g. "HOST · Lead
    Guitar"). Same derivation the Playback View's own "Playing: X" label
    already uses (below), reused here rather than duplicated. Omitted
    entirely while `selectedPart` is still `null` — the row's readiness
    badge already reads `'no-part'` in that case, so there's nothing
    useful to add.
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
  - **The host** also sees a "Remove" control alongside "Make host" on
    every other participant's row (never their own). Clicking it removes
    that participant from the session immediately, no confirmation
    dialog — same terse-host-action pattern as "Make host". The list
    updates for everyone the moment the resulting `session-state`
    broadcast arrives, same as the other actions on this list — no local
    optimistic update. The removed participant's own client detects this
    from that same broadcast and is sent back to Landing (see "Removed
    from session" under States, below).
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

  This is the default tab, and it holds only the participant list — the
  lobby-cursor and audio controls that used to sit below it moved to the
  Session tab.
- **Session**: host-controlled *session* settings broadcast to everyone
  (not personal display preferences — those are Preferences, below), in
  two labeled groups:
  - **Lobby cursor**: the readout (lets the host point at a position in
    the score for others to see before playback starts — visible to every
    participant) and, for the host only, a wrapping control row: tick
    input, "Set lobby cursor", "Clear", and the "Spotlight mode" toggle.
    While Spotlight mode is on, the lobby cursor forces every
    participant's view to follow it; while off, each participant is free
    to browse their own rendered tab independently, and the lobby
    cursor's tick is shown only as an informational readout (not applied
    to anyone's view). Spotlight mode resets to off when playback starts,
    same as the lobby cursor itself resetting to null. This relationship
    is no longer explained only here: a host-only hint paragraph under
    the controls carries it in-UI ("Spotlight mode forces every
    participant's view to follow the lobby cursor. Off: it's just a
    marker — cursor position and Spotlight state both reset when playback
    starts.").
  - **Playback audio**: the host-only "Count-in" toggle, setting
    `Session.countInEnabled` (datamodel.md; wired to alphaTab's
    `countInVolume` in `playback-sync.ts`, infrastructure.md). Visible
    and interactive only for the host, with no separate readout shown to
    non-host participants — the audible effect itself (or its absence)
    is every participant's confirmation that the setting took. The
    metronome is deliberately *not* here — it's a personal preference
    (Preferences, below), a user-confirmed reversal (2026-07-04) of the
    original host-controlled `Session.metronomeEnabled` design: each
    participant's own alphaTab instance generates the clicks locally, so
    nobody else is affected and the server has no reason to know.
- **Preferences**: personal, this-device-only settings, none of which
  touch the server:
  - two orthogonal theme controls (`client/src/theme.ts`), per
    `brand.md`'s Themes section: a **theme** picker (`riot` — the
    default — or `cyberpunk`) and the existing dark/light toggle,
    combining into one of four `data-theme` values (`dark`, `light`,
    `cyberpunk-dark`, `cyberpunk-light`). Changing either control
    switches the app's CSS palette and the tab notation's colors
    together, and both choices persist across a refresh.
  - a personal "Metronome" toggle, visible to **every** participant (not
    host-gated): persisted client-side like the theme choice
    (`client/src/metronome-preference.ts`, default off), applied to this
    participant's own alphaTab instance immediately (`metronomeVolume`)
    whether visible or headless, with a hint making the scope plain
    ("Only you hear your metronome.").
  - a personal "Lyrics ticker font size" control, visible to **every**
    participant (not host-gated): four steps — small / medium / large /
    huge — persisted client-side like the theme/Metronome choices
    (`client/src/lyrics-ticker-font-size-preference.ts`, default
    **medium**, matching the in-tab lyrics overlay's existing fixed size).
    Each step is a clearly noticeable jump from its neighbor, not a subtle
    scale. Applies to the in-tab lyrics overlay's syllable text (Playback
    View, below) — has no effect on the tab-less Lyrics part's full lyric
    sheet, which uses its own fixed reading size.
  - a personal "Measure markers" toggle, visible to **every** participant
    (not host-gated): persisted client-side like the theme/Metronome
    choices (default **off**). When on, the in-tab lyrics overlay ticker
    (Playback View, below) additionally renders a vertical line and
    measure number at each measure boundary, interleaved into the
    syllable strip. Has no effect on the tab-less Lyrics part's full
    lyric sheet.
- **Tracks**: a dedicated 4th tab for personal per-part mute controls,
  visible to **every** participant (not host-gated) — moved out of
  Preferences into its own tab so each part gets its own row rather than
  sharing one flex-wrapped row of buttons. One `<div class="control-row">`
  per part, listing every part in `Session.availableParts` (instrument
  name, same source the Participants list and Playback View's "Playing:
  X" label already read) with its own mute toggle. Muting a part calls
  alphaTab's own `api.changeTrackMute()` against that participant's
  already-loaded full mix (Playback View, above) — nothing is added to or
  removed from what's loaded, only which already-loaded tracks are
  audible. **Personal and client-local only**, same reasoning as the
  Metronome toggle in Preferences: every participant's mix is fully
  independent, so a mute choice can only ever affect that one
  participant, never anyone else's — there is no session-level mute.
  Persisted like the theme/metronome choices, but keyed per song *and*
  track (a mute choice for "Bass" on one song must not silently carry
  over to a different song's differently-indexed "Bass"). A participant
  **may** mute their own currently-selected/rendered part — no
  restriction; some practice workflows want to hear only the backing
  while reading their own tab. Hint text makes the personal scope plain
  ("Only you don't hear muted parts — everyone else still does.").
  Each row also carries a "Solo" control alongside its mute toggle:
  clicking it mutes every other available part except that one (calling
  `api.changeTrackMute()` per part, same mechanism as the individual mute
  toggles), leaving only the soloed part audible. Personal and
  client-local only, same scope/persistence as the mute toggles above —
  not a session-level solo. Soloing one part doesn't touch the mute
  toggles' own persisted state for parts other than the ones it silences;
  un-soloing (clicking "Solo" again, or muting/unmuting individual parts
  afterward) is a plain mute-state change like any other, not a tracked
  "solo mode" the UI has to remember separately.
  The tab also carries a **"Mute all"** control
  (`mute-all-parts-button`): one action muting every part's MIDI audio
  at once while the count-in and metronome clicks stay audible (those
  come from alphaTab's `countInVolume`/`metronomeVolume`, not track
  channels, so track-muting never silences them). Same
  personal/client-local scope and per-(song, track) persistence as the
  per-part toggles; mechanically it's the same batch
  `api.changeTrackMute()` application the Solo button already uses,
  applied to all parts — not a new mute state. Un-muting afterward is a
  plain per-part change (or pressing the control again toggles all back
  on) — exact affordance is implementation-time judgment, consistent
  with the single-line row layout below.

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

Cases 2-4 normally render behind the song/part modal's auto-opened
backdrop — reachable in principle, not literally dead code, just usually
covered immediately in today's normal flow. Because the modal is
dismissible (above), a user who dismisses it while song or part is still
unset sees these Lobby-body messages directly, with the Bar reachable
beneath.

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
  fixed to the bottom of the viewport, via an icon-only "Toggle lyrics"
  control (an `AudioLines` icon) that lives in the **persistent bar's**
  controls, not standalone in this view's own body — reachable the same
  way Settings/transport/Leave-session are, gated on `!isLyricsPart`
  exactly as before (absent entirely for a participant on the tab-less
  Lyrics part, since there is no in-tab strip for them to toggle).
  Toggling the strip off hides it **entirely** — both the syllable text
  and the strip's own background band/reserved layout space — not just
  the words, leaving nothing behind. Syllable text and tick position
  are read live off `CatalogSong.lyricsTrackIndex`'s beats (not the
  currently-viewed instrument track's own beats, which is usually a
  different track entirely), flattened into one continuous stream. The
  strip never wraps to multiple lines — as syllables advance it scrolls
  right-to-left, snapping (not continuously gliding) so the currently
  active syllable, styled via alphaTab's `.at-highlight` role, is
  re-centered on each syllable change; the centering uses plain DOM
  measurement (`getBoundingClientRect()` against the ticker's own
  rendered layout, not an alphaTab bounds lookup) and is recomputed on
  window resize. Before any real syllable has activated — from the
  ticker's very first render, e.g. while still in the Lobby — a centered,
  highlighted "…" placeholder is shown instead of a left-aligned/empty
  strip, so there's no initial jump once the first syllable actually
  activates. This is a one-way transition: once the first real syllable
  activates the placeholder is hidden permanently for that participant's
  session, never shown again even if playback is later paused mid-song.
  This overlay is custom client logic, not alphaTab's native lyrics
  rendering — alphaTab only draws lyric text natively on the track that
  actually carries it, which usually isn't the instrument track a
  participant is viewing.

  **Measure markers (personal preference, default off — Lobby View
  Preferences tab, above)**: when enabled, a vertical line and measure
  number are interleaved into the syllable strip at each measure
  boundary, reusing the local-tempo/time-signature measure-duration math
  the Gap timing indicator (below) already computes from the headless/
  visible instance's own loaded score. Unlike syllable spans, which lay
  out by text-flow width rather than a continuous tick-to-pixel mapping,
  a marker's position is only well-defined by inserting it into the
  syllable sequence at the correct tick-sorted point, not by computing an
  absolute coordinate — so a marker sits between whichever two syllables
  (or the placeholder) straddle that measure's start tick. Purely a
  personal orientation aid — it does not affect syllable
  highlighting/centering, which continues to index only the real
  syllable stream.
- **Lyrics part selected**: no tab is rendered — this participant's
  alphaTab instance runs **headless** (no visible staff at all), driving
  only audio (metronome/count-in) and the shared clock. **Reworked
  2026-07-06**: the full lyric sheet — every line from
  `CatalogSong.lyricsLrc`, not just the current one — is shown at once,
  vertically stacked, scrollable, and populated **immediately when the
  view loads, before playback ever starts** (previously blank until the
  first line's timestamp passed during playback, which read as broken
  during a song's instrumental intro). The currently-active line is
  highlighted (same active/base color roles as the in-tab ticker's
  syllable highlight — brand.md) and the view auto-scrolls to keep it
  roughly centered as playback advances, replacing the prior
  one-line-at-a-time karaoke display. Before playback starts (or before
  any line's timestamp has passed once playing), the first line is
  highlighted as the upcoming one, so there's always a legible, non-blank
  sheet visible — never an empty screen waiting for the first cue. This
  is a custom view, not alphaTab's native lyrics rendering with notation
  hidden — alphaTab lays lyric text out as part of its normal paginated
  bar-by-bar score grid, which would produce small per-bar lyric
  fragments wrapping across rows, not a single readable scrolling sheet.

  **Gap timing indicator (2026-07-06)**: `CatalogSong.lyricsLrc`'s blank
  "gap" lines (pipeline.md — a blank-text line marking a real line's end
  timestamp) mark instrumental gaps between two real lines. When a gap's
  real-time duration exceeds one measure — computed from the headless
  instance's own loaded score at that point in the song (the actual
  local tempo/time-signature via alphaTab's own tick/tempo data, not
  `CatalogSong.bpm`, which stays display-only per its existing
  datamodel.md note) — a gap-indicator line is inserted between the two
  real lines: four dots ("...."), each lighting up in turn on the 4 beats
  immediately preceding the next line (same local-tempo derivation), and
  a separate bar positioned directly above the upcoming line that drains
  continuously over the gap's full duration (brand.md — a theme-styled
  device distinct from the persistent Bar's own readiness/progress
  indicator). Gaps of one measure or shorter get no special treatment —
  the sheet just continues to the next line as before.

Every participant's alphaTab instance loads and plays the **full
multi-track mix** by default — every instrument's MIDI notes, not just the
part they've selected to render/follow (`Participant.selectedPart` scopes
which track is rendered and drives the shared clock, not which tracks play
audio; alphaTab's own `trackIndexes` load parameter governs rendering only,
per its own API contract). This is true regardless of whether a
participant has an instrument or the tab-less lyrics part selected. A
"Mute parts" preference (below) is the only thing that silences individual
tracks in that mix, and it is personal — see below.

Both renderings share alphaTab's native metronome and count-in
(`metronomeVolume`, `countInVolume` — both off by default; count-in is
toggled via `Session.countInEnabled`, the metronome via the personal
client-local preference above), so the audio is identical
whether or not the participant's alphaTab instance has a visible staff.
Host controls start/pause/resume/seek via the persistent bar's icon-only
tape-recorder-style transport controls (play/pause/square — see above); a
count-in countdown can precede playback start. The host's view exposes
seek (click-to-position) when paused; participants' views don't.

The settings-cog control (Lobby View, above) remains in the persistent
nav bar here too, so the Preferences tab's theme toggle stays reachable
without stopping playback — the app's theme control isn't gated to any
one view. "Leave session" (Lobby View, above) is likewise always present.

### Count-In & Metronome Beat Widget

A single-shape visual beat widget rendered in the persistent Bar
(`count-in-metronome-beat-widget`). One shape — not four separate
segments — whose fill color animates on every beat, alternating
direction each beat: primary→secondary on beats 1→2 and 3→4,
secondary→primary on 2→3 and 4→1. Two modes sharing the one widget:

- **Count-in mode**: during the pre-playback count-in it counts down
  4→1, visible to **every participant**, gated on the host-broadcast
  `Session.countInEnabled` — the same visibility rule as the count-in
  audio click itself.
- **Playback mode**: during playback it counts up 1→4 and additionally
  shows the current measure number, less prominently than the beat count
  and labeled (e.g. "Measure 12"). Personal/per-participant, gated on
  each participant's own Metronome preference
  (`metronome-preference.ts`) — matching that toggle's existing
  personal, this-device-only scope.

Timing is driven by real beat boundaries — derived from
`api.tickPosition` plus `tempo-lookup.ts`'s `localTempoAtTick`, the same
tempo-lookup infrastructure `correctDrift` and lyrics-gap-timing already
use — never a naive fixed-interval timer, so the animation stays
sample-accurate with the actual audio click and doesn't drift across
tempo changes. Colors are a theme-appropriate primary/secondary token
pair from brand.md; the exact shape and the beat-count/measure-number
layout are left to implementation-time visual judgment.

## Small Screens

The app is a responsive web app, phone-first down to ~360px CSS width
(added 2026-07-04; before this, `client/index.html` had no
`<meta name="viewport">` at all, so phones rendered a ~980px virtual
layout scaled down to illegibility — that meta tag is the foundation
every rule below assumes):

- **The invariant: no horizontal scrolling, anywhere.** Vertical scroll
  inside a modal body is fine; horizontal scroll is never acceptable —
  in the document *or* inside any scrollable descendant (an
  `overflow-y: auto` modal body silently computes `overflow-x: auto`
  too, so document-level checks alone miss it). Enforced by
  `client/e2e/small-screen.spec.ts` + `helpers.ts`'s
  `expectNoHorizontalOverflow`, which also asserts the layout viewport
  is device width (<500px) — catching a dropped viewport meta. These
  tests must run under **mobile emulation** (`isMobile`), not just a
  narrow desktop window: desktop Chromium ignores the viewport meta
  entirely.
- **Layouts wrap rather than breakpoint.** Preference order: intrinsic
  fluidity (flex-wrap, `min()`, `max-width: 100%`) over `@media`
  queries. Control rows in the settings modal, `ListRow`'s trailing
  controls, and the persistent Bar's sections all wrap. The Bar is
  `position: fixed`, so overflowing it clips *invisibly* (fixed
  elements don't contribute to document scroll size) — wrapping is the
  only acceptable behavior there. Bar identity text truncates with
  ellipsis, except the join code, which never truncates (participants
  read it off the bar to invite others); the song title/artist give
  way instead.
- **Tab notation scales up on phones**: alphaTab `display.scale` 1.3
  below 500px viewport width (`client/src/tab-scale.ts`), chosen so
  fret numbers are legible without pinch-zoom. `LayoutMode.Page`
  re-wraps bars to the container, so a larger scale means fewer bars
  per row, never horizontal overflow. Fixed at renderer creation — a
  deliberate non-adjustable default; revisit only if it proves wrong
  in live use.
- **Modals**: the shell clamps to viewport width (backdrop padding +
  `width: 100%`), caps height at `85dvh` (`dvh`, not `vh`, so mobile
  URL-bar chrome doesn't eat the panel), and scrolls vertically inside
  `.modal-body`. Content must genuinely fit the width — wrapping child
  rows, not `overflow-x` guards.

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

  The Playback view additionally shows its own prominent, centered
  "Loading tab…"/"Loading lyrics…" banner — distinct from the small
  per-participant `ReadinessBadge` in the persistent Bar (easy to miss
  once a participant is already on this view with nothing rendering).
  This clears once the tab/lyrics have actually finished rendering, not
  merely once the score has parsed — a real render can silently no-op if
  it happens to occur while the tab container is momentarily hidden (a
  narrow client-side timing window), so "loaded" and "actually visible"
  are tracked as two separate conditions internally; the banner is keyed
  off the latter; it's never a silent, indefinite stall.
- **Empty**: no song selected yet — the song/part modal auto-opens
  showing the catalog picker only; the part picker within it appears
  once `Session.selectedSong` is set.
- **Error**: join-by-code failure (invalid/expired code), part-not-found,
  wrong catalogue activation key (`catalog-activation-key-access` —
  indistinguishable, by design, from any other reason a `catalogue-unlock`
  might be declined, infrastructure.md), not-host action attempts,
  host-delegation/decline targeting a
  participant who's no longer connected or no longer valid (a race
  between clicking a Host Transfer control and that participant's state
  changing), and requesting host while a request is already pending —
  surfaced as toasts, not blocking modals.
- **Removed from session**: the host removed this participant (Participants
  tab, above) via `host-remove-participant`. The removed participant's own
  client detects it from the ordinary `session-state` broadcast it still
  receives (its socket is still attached; it just no longer finds itself
  in `Session.participants`) rather than a dedicated message — consistent
  with Principle I. It shows a toast ("You were removed from the session
  by the host"), resets to the Landing view, and clears its persisted
  session identity so a later refresh doesn't try to rejoin the session it
  was just removed from (infrastructure.md). This client's own reconnect
  loop is also stopped — it does not silently reattach to the same
  session.
- **Stale session**: a stored session identity that no longer exists on
  the server (e.g. the server restarted and forgot it, or the session
  ended) — the bootstrap create/join handshake comes back as an *Error*
  ("Session … not found") while this client has not yet established a
  session. Rather than rejoining the dead session every reconnect interval
  (~2s) forever, the client clears the persisted session identity and stops
  its own reconnect loop (same terminal-socket shape as *Removed from
  session*). The stale toast is still shown so the user sees why. Stopping
  the loop is what keeps a stale session from repeatedly resetting the
  HTTP/2-coalesced connection and aborting in-flight requests — the
  confirmed aborter behind the broken sign-out and the spurious "Connection
  lost" flash (feedback F002).
- **Connection lost**: the server is unreachable — either the WS never
  connects at all (server down at load) or an established connection
  drops. Distinct from the Error state above: this isn't a per-action
  failure, it's total server unreachability, so it's a persistent,
  non-dismissing banner fixed to the top of the viewport
  (`ConnectionBanner.svelte`), not a toast. Shown on every view,
  including Landing, since the bug this covers reproduces there
  specifically. Clears on its own once the connection recovers
  (infrastructure.md's reconnect-with-retry) — no user action needed.

Color, typography, tone, and motion are owned by `brand.md`, not this
artifact.
