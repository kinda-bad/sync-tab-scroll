---
status: split      # open -> split -> (superseded by the 4 group files below, each open -> planned independently)
created: 2026-07-04
plan: null        # set to the consuming plan's filename once planned
---

# Feedback

Source: user's manual verification pass across several previously-open
"pending human verification" markers (see `tasks-lyrics-ticker-75dd.md` T004,
`tasks-lobby-cursor-modes-0bea.md` T010, and others). One marker
(lyrics-ticker T004) got a direct answer — recorded as FAILED in that tasks
file, not duplicated here. The rest of the markers listed in `STATUS.md`
(playback-sync-fixes T007, lyrics-ticker T007, theme-persistence T004,
hazard-bar-progress, metronome-count-in-toggle T009) were **not** covered by
this pass and remain open.

**2026-07-04: split into 4 group-specific feedback files for parallel
`/ardd-plan`-style planning**, kept as this file's historical record
(items below are not duplicated for planning, see each group file):
- `feedback-session-lifecycle-6876.md` — silent-loading bug, leave-session UX
- `feedback-lobby-cursor-race-4262.md` — rapid-click cursor thrash bug
- `feedback-lyrics-pre-singing-1fa6.md` — lyrics "..." placeholder/centering UX
- `feedback-settings-modal-followup-d914.md` — settings-tab layout/copy UX,
  metronome-per-participant reconsidered

The "playback tempo much slower than it should be" bug is deliberately
**not** included in any group file — it's already being investigated live
by a separate background pass (count-in/metronome root-cause, tracked in
`STATUS.md`'s "Known unresolved" section), not routed through planning.

## Bugs

- [ ] After joining a session and selecting a song part, the tab/lyrics
  sometimes silently fail to render — no error, no visible loading
  indicator — and only a full page refresh fixes it. Needs an explicit
  "still loading" state rather than a silent stall. [artifacts: ui]
- [ ] As host, clicking multiple lobby-cursor positions in quick succession
  causes the cursor to rapidly flip between those spots instead of settling
  on the most recent one. Only one cursor position should ever be active at
  a time. [artifacts: ui]
- [ ] Playback tempo is much slower than it should be.

## UX

- [ ] Need a "leave session" control that clears local session state, so a
  participant can join a different session without a manual workaround
  (e.g. clearing storage or refreshing). [artifacts: ui]
- [ ] Lyrics overlay is left-aligned initially and snaps to centered the
  moment the first syllable is due, which reads as a jump. Should instead:
  show a "..." placeholder (highlighted) during any pre-singing portion of
  the song, and stay centered whenever there's no active playback state or
  cursor. [artifacts: ui]
- [ ] The Participants tab's settings under "lobby cursor" are all crammed
  onto one line and are too wide; they should be split across
  related/grouped tabs instead. Also, the purpose of "set lobby cursor" and
  how it relates to Spotlight mode is unclear from the UI alone — needs
  clearer labeling/description. [artifacts: ui]

## Reconsidered

- [ ] Metronome should be toggleable per participant rather than forced by
  the host for everyone. Low priority. [artifacts: ui, datamodel]
