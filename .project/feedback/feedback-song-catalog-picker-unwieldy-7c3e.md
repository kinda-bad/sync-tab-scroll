---
status: open
created: 2026-11-28
plan: null
---

# Feedback

The song catalog in the "Song & part" modal (`client/src/components/SongPartModal.svelte`)
is getting unwieldy as songs and catalogues grow (user, 2026-11-28).

## Bugs
- [ ] F001 The catalogue section headings are unevenly spaced. Likely cause, from a
  code read: each grouped heading is a `.section-label` wrapped alone in a
  `div.catalogue-header`, so `.section-label:first-child { margin-top: 0 }` matches
  every grouped heading, not just the first one in the modal. The gap above a heading
  then comes from whatever precedes it, not from the label's own margin. The
  single-catalogue "Catalog" label isn't wrapped and behaves differently again.
  Every heading should get the same space above and below, with only the first one
  in the modal flush to the top. [artifacts: ui]

## UX
- [ ] F002 Catalogue sections should be collapsible. Each catalogue heading toggles
  its song list. To settle at plan time: whether sections start expanded, whether the
  collapsed state is remembered (per device), and whether a lone ungrouped catalog
  gets a toggle at all. A native `<details>`/`<summary>` may be enough before building
  anything custom (constitution Principle V). [artifacts: ui]
- [ ] F003 Add a search box above the catalog that hides songs whose title or artist
  doesn't match. To settle at plan time: matching rules (case-insensitive substring is
  the obvious start; also ignoring accents and punctuation, e.g. "Do I Wanna Know?"),
  whether a catalogue heading with no matches is hidden, whether a search expands
  collapsed sections that have matches, and the empty state ("No songs match").
  It should be available to non-hosts too, since everyone can browse the list.
  [artifacts: ui]
