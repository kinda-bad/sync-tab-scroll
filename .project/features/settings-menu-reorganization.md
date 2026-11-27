---
slug: settings-menu-reorganization
status: implemented
logged: 2026-11-27
---

Reorganize the settings menu. Pick categories and tabs that make sense, and
make every setting easy to find (user, 2026-11-27: "we need to redo the menu
organization and pick categories and tabs that actually make sense and make
sure settings are easy to find").

Current shape: the Settings modal (`client/src/components/SettingsModal.svelte`)
has four tabs, which grew one feature at a time:
- **Participants:** the member list, host transfer/requests, removal.
- **Session** (host controls):
  - Start marker
  - Lobby cursor
  - Layout
  - Early stop point
  - Playback audio / Audio source (Synth or Recording)
- **Preferences** (personal, this device only):
  - Theme
  - Bars per row
  - Playback audio
  - Lyrics ticker font size
  - Lyrics ticker position
  - Measure markers
- **Tracks:** per-track mutes.

Other controls live outside the modal: the bottom bar (`Bar.svelte`), the
account menu (`AccountMenu.svelte`) and Help/About (`HelpAboutModal.svelte`).

Visible problems to start from:
- Some labels repeat across tabs: "Playback audio" is in both Session and
  Preferences, and "Bars per row" and Layout are split between them.
- The lyrics settings are three separate rows rather than a group.
- The Lobby cursor and Early stop inputs take raw tick numbers. The Start
  marker takes bars, so Early stop should too.
- Session vs. Preferences is the host-vs-personal split. It's correct but not
  obvious, so it's unclear where a setting is unless you already know whether
  it's host-controlled.
- More personal view settings are coming (the horizontal scroll view,
  `horizontal-scroll-view.md`), so the layout needs room to grow.

Planning should:
- inventory every setting and control, including the bar and account menu,
  and who can change each;
- propose categories by what the user is trying to do (e.g. playback, view,
  lyrics, audio, people), with the host-only/personal distinction shown on
  each control rather than as the only way the menu is split;
- decide whether a search or a "where is…" affordance is worth it;
- keep hint text making scope plain ("Only you hear your metronome.");
- check that every moved control keeps its CT coverage.

Why: settings were added where they first fit, so finding one now means
already knowing which tab it was added to.
