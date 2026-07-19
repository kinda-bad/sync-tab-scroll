---
status: planned      # open -> planned
created: 2026-07-19
plan: plan-settings-ux-bundle-2026-07-19-d27d.md
---

# Feedback

## UX

- [x] F001 Part names in the UI are shown as raw GP track names (e.g.
  "M. Bellamy (Vocals)", "Chris (bass)", "Keyboards I"), which buries
  the thing a user actually scans for — the instrument. Extract the
  instrument from each part name and make it the prominent element
  wherever parts are shown (part picker, participant list's
  selected-part display, Song & part control, mute/solo lists), with
  the remaining name detail (performer name, numbering) de-emphasized
  rather than dropped. Extraction should handle the common GP naming
  patterns in the catalog ("Name (Instrument)", bare instrument names,
  "Instrument I/II" numbering) with a graceful fallback to the raw name
  when no instrument can be recognized. Refinement (2026-07-19): a song
  can have multiple parts of the same instrument (e.g. "Guitar, lead" /
  "Guitar, rhythm"; "Guitar I" / "Guitar II"), so extracted instrument
  labels must stay unique per song — prefer the GP file's own
  disambiguation (lead/rhythm qualifiers, I/II numbering, performer
  names) rendered as the de-emphasized detail, and when the source
  names provide no usable disambiguation, number same-instrument parts
  sequentially ("Guitar 1", "Guitar 2") in track order.
  [artifacts: ui]
