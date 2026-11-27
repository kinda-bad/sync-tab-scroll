---
status: open
created: 2026-11-26
plan: null
---

# Feedback

## Bugs
- [ ] F001 The "Song & part" nav control disappears once playback starts, which is confusing: there is no visible way to see or reach the song/part selection from the Playback view. It should be visible throughout. `ui.md` already describes the control as part of the persistent bar in both Lobby and Playback (the "Leave session" paragraph: "present in both Lobby and Playback, alongside "Song & part" and the settings cog"), but the code renders it in the Lobby only: `client/src/App.svelte`, the `{#if $clientStore.view === 'lobby'}` wrapper around the `ListMusic` "Song & part" `Button` in the Bar's `controls` snippet. Related: the auto-open rule (`needsSongOrPart`) is deliberately Lobby-only and can stay that way. [artifacts: ui]

## UX
- [ ] F002 The "Song & part" control should be clickable during playback, and clicking it should ideally just pause playback rather than stop and reset it. Findings from a code read (2026-11-26), to settle at plan time:
  - Nothing requires a stop or reset just to *open* the modal.
  - Changing your own instrument part needs no reset: `playback-engine.ts` (`ensurePlaybackEngine`) switches the rendered track in place (`switchTrack`), and `server/src/handlers/part-select.ts` has no playback-state guard.
  - Switching between an instrument part and the Lyrics part tears the local engine down and rebuilds it (`destroyEngine`). That is local to the one participant and can rejoin at the session's current tick; it does not need a session-wide stop.
  - A host choosing a *different song* does need a full stop and reset: `server/src/handlers/song-select.ts` clears every participant's part and readiness, resets the audio source, bars-per-row pin and early-stop point, and every client rebuilds its engine for the new score. There is no position to resume. `song-select` currently has no guard against being sent while playback is running, so that case needs a defined behavior (stop first, or confirm).
  - Open question: only the host controls transport (`ui.md` Playback View). Should a non-host participant opening the modal leave session playback untouched, with "click pauses" applying to the host only?
  [artifacts: ui, infrastructure]
- [x] F004 The bar's lyrics toggle says "No lyrics for this song" for a song that does offer a Lyrics part, which reads as a contradiction. Seen on "Supermassive Black Hole" (Muse): it has a line-timed `lyrics.lrc`, so the Lyrics part is offered, but none of its five GP tracks carries lyrics (`lyricsTrackIndex: null`), so the in-tab ticker is unavailable. Both behave as designed; the message is what misleads. Do one of these, to be chosen at plan time:
  - (a) Reword the disabled reason so it is accurate when an `.lrc` exists, e.g. "No in-tab lyrics for this song (use the Lyrics part)". Code: `client/src/App.svelte`, `lyricsToggleReason`.
  - (b) Drive the in-tab ticker from the `.lrc` lines when the tab has no lyrics track, so the toggle works for these songs. Larger: the ticker currently needs per-syllable ticks from the GP file (`playback-engine.ts`, the `lyricsTrackIndex`/`lyricLineBreaks` branch), while an `.lrc` gives only per-line times.
  [artifacts: ui]
  - Done 2026-11-27: (a), the reason now reads "No in-tab lyrics for this song (use the Lyrics part)" when an `.lrc` exists. (b) not done: the ticker is built from per-syllable beat ticks, so an `.lrc`-driven ticker would need a separate line-level ticker mode plus an ms-to-tick map, not a small change.

## Reconsidered
- [x] F003 Change the "Leave session" bar icon from the bone to lucide's `Power` icon. This reverses the earlier icon-refresh decision recorded in `ui.md`'s "Bar controls are icon-based" paragraph ("Leave session" as a `Bone` icon), which itself replaced a log-out icon. Code: `client/src/App.svelte`, the `Bone` import (`./components/icons/BoneFracture.svelte`, a hand-made icon component that becomes unused) and the "Leave session" `Button` in the Bar's `controls` snippet. The accessible name "Leave session" stays. [artifacts: ui]
