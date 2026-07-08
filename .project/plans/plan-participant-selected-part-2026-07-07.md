---
status: approved
branch: participant-selected-part
created: 2026-07-07
features: [participant-selected-part]
surfaced-defects: []
---

# Plan: Participant selected-part display

## Goal

Each row in the Settings modal's Participants tab shows which part (an
instrument, or the tab-less "Lyrics" part) that participant currently has
selected, alongside their existing "HOST" sublabel.

## Scope

**In scope:**
- `client/src/components/SettingsModal.svelte`: extend the Participants
  tab's `ListRow` `sublabel` for each participant row to include their
  selected part's display name, combined with "HOST" when both apply
  (`"HOST · Lead Guitar"`, or just `"Lead Guitar"` for a non-host
  participant with a part selected).
- Part-name derivation reuses the same logic already used by
  `client/src/views/Playback.svelte`'s `currentPartLabel` (`ui.md`,
  applied this pass): `'Lyrics'` when `selectedPart === 'lyrics'`,
  otherwise `session.availableParts.find(p => p.trackIndex ===
  participant.selectedPart)?.instrumentName`.
- Row shows no part text when `selectedPart` is `null` — same as today,
  since the row's existing readiness badge (`'no-part'`) already conveys
  that state.
- `ui.md` documentation (already applied this pass, see the "Every row"
  bullet under Participants in the Settings modal section).

**Out of scope:**
- No change to `ListRow.svelte`'s API — `sublabel` remains a single
  optional string; the combined string is constructed at the call site.
- No change to `Playback.svelte`'s own `currentPartLabel` — reused, not
  duplicated, but the source stays where it is.
- No datamodel changes — `Session.availableParts`, `CatalogPart.trackIndex`,
  and `Participant.selectedPart` already carry everything needed.
- No change to how readiness badges render.

## Technical Approach

In `SettingsModal.svelte`'s `{#each session.participants as p (p.id)}`
block, compute a per-row part label the same way `Playback.svelte` does
(`p.selectedPart === 'lyrics' ? 'Lyrics' :
session.availableParts.find(ap => ap.trackIndex === p.selectedPart)
?.instrumentName`), then join it with the existing `'HOST'` conditional
using `' · '` when both are present, falling back to whichever one alone
is present, and `undefined` when neither applies (both `p.role !== 'host'`
and `p.selectedPart === null`) — preserving `ListRow`'s existing
"omit the sublabel entirely" behavior for that case.

## Phase Breakdown

### Phase 1 — Implementation
- [ ] T001 [artifacts: ui] In `SettingsModal.svelte`, add a per-row
  `partLabel` derivation for the Participants tab's `{#each
  session.participants as p (p.id)}` loop, matching `Playback.svelte`'s
  `currentPartLabel` logic (`'Lyrics'` for `selectedPart === 'lyrics'`,
  else lookup `session.availableParts` by `trackIndex`, else `undefined`
  when `selectedPart` is `null`).
- [ ] T002 [artifacts: ui] Combine `partLabel` with the existing
  `p.role === 'host' ? 'HOST' : undefined` into the `ListRow`'s `sublabel`
  prop: `"HOST · <part>"` when both present, just `"HOST"` or just
  `<part>` when only one is, `undefined` when neither.
- [ ] T003 Add/extend a CT test covering the Participants tab: a
  non-host participant with an instrument part selected shows the
  instrument name; a participant with the lyrics part selected shows
  "Lyrics"; the host with a part selected shows "HOST · <part>"; a
  participant with `selectedPart: null` shows no part text (sublabel
  omitted or "HOST" only, matching existing no-part behavior).

## Complexity Tracking

None — pure UI display change reusing an existing derivation pattern, no
new principle deviations.

## Open Questions

None — design was confirmed with the user during this planning pass (see
`ui.md`'s "Every row" bullet, Participants section).

## Production Annotation Summary

None — no production shortcuts introduced.
