---
slug: lyrics-gap-timing-indicator
status: implemented
logged: 2026-07-06
plan: plan-lyrics-gap-timing-indicator-2026-07-06.md
tasks: tasks-lyrics-gap-timing-indicator-6541.md
---

In the lyrics-only full-lyrics-sheet view, any gap in `.lrc` timing longer
than one measure gets two visual cues instead of a silent wait: four dots
("...."), each highlighting in turn on the 4 beats immediately preceding
the next line, and a separate theme-styled bar (echoing riot's hazard-tape
or cyberpunk's LED-marquee look, per `brand.md` — not a second instance of
the existing `HazardBar` readiness/progress component, a distinct element
scoped to this purpose) positioned above the upcoming line, draining over
the gap's full duration.
Why: the full-lyrics sheet (just redesigned to show all lines at once,
2026-07-06) has no indication of *how long* until the next line during an
instrumental gap — a beat-precise countdown plus a duration-spanning drain
bar gives both a close-up and a wide-angle sense of the wait. `/ardd-plan`
will need to work out how to derive measure/beat boundaries for a headless
alphaTab instance with no visible rendering (the client's `bpm` field is
documented as display-only, not for tick-to-time math — the loaded
score's own tempo map, reachable via the same alphaTab API instance
already running headless, is the likely real source, but this needs
confirming against tempo/time-signature changes mid-song).
