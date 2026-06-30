# sync-tab-scroll — Project Status

_Updated: 2026-06-30. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| datamodel.md | stable ✅ (1 unresolved item) | 1 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

**datamodel**
- Normalization Rules: any additional rule changes needed if the rebuilt pipeline's output format ends up differing from the current `LayoutMap` shape.

Also flagged below (not a formal open question but a cross-artifact defect): `Session.availableParts` / `Participant.selectedPart` don't yet account for the lyrics pseudo-part that `ui.md`'s Lobby/Playback views now treat as selectable.

## Cross-Artifact Issues

- **[GAP]** `ui.md`'s Lobby View part picker and Playback View treat **Lyrics** as a selectable participant part (no tab SVG, large-font + timestamp-driven animation instead), but `datamodel.md` never updated `Session.availableParts: CatalogPart[]` or `Participant.selectedPart` to represent it — `CatalogPart` entries are tab-SVG-backed, so the lyrics part can't just be another entry in that list as currently typed.
- **[GAP]** `datamodel.md`'s `Participant.selectedPart` note still reads "Which instrument part they're following" — stale now that the field's domain includes the non-instrument lyrics part.
- **[STALE]** `datamodel.md`'s Overview still says: *"`ui.md` currently only describes the overlay — its 'primary lyrics view' should be added there in a future `/ardd-refine ui` pass."* That gap was already closed by the subsequent `/ardd-refine ui`; the note is now inaccurate and should be removed.

## Within-Artifact Issues

### datamodel.md
- **[OPEN]** Normalization Rules: unresolved placeholder about pipeline output format changes. Frontmatter currently says `status: stable` despite this open item.

## Constitution Compliance

No violations found. (The stale Overview note above brushes against Principle II's "documentation describes only what is actually true" spirit — worth cleaning up alongside the GAP fixes.)

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Recommended Next Step

Run `/ardd-refine datamodel` to: (1) define how the lyrics pseudo-part is represented in `Session.availableParts` / `Participant.selectedPart`, (2) update the stale `selectedPart` note, (3) drop the now-resolved Overview callout, and (4) decide the remaining Normalization Rules open item. Then run `/ardd-render` on the three stale diagrams before moving to `/ardd-plan`.
