---
status: open      # open -> planned
created: 2026-07-19
plan: null
---

# Feedback

## UX

- [ ] F001 Part names in the UI are shown as raw GP track names (e.g.
  "M. Bellamy (Vocals)", "Chris (bass)", "Keyboards I"), which buries
  the thing a user actually scans for — the instrument. Extract the
  instrument from each part name and make it the prominent element
  wherever parts are shown (part picker, participant list's
  selected-part display, Song & part control, mute/solo lists), with
  the remaining name detail (performer name, numbering) de-emphasized
  rather than dropped. Extraction should handle the common GP naming
  patterns in the catalog ("Name (Instrument)", bare instrument names,
  "Instrument I/II" numbering) with a graceful fallback to the raw name
  when no instrument can be recognized. [artifacts: ui]
