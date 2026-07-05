---
status: planned
created: 2026-07-05
plan: plan-lyrics-ticker-font-size-defects-2026-07-05.md
---

# Feedback

## Bugs
- [x] `host-remove-participant` is a fully implemented wire message
  (`packages/shared/src/messages.ts:8`) with a working server handler
  (`server/src/handlers/host-remove-participant.ts`), but has no
  client-side entry point anywhere in `client/src/` — no button, no
  message send call. Server-reachable but not reachable through the
  actual UI. Needs a decision: finish the client UI, remove the
  unreachable handler, or document it as intentionally server-only.
  User confirmed: finish the client UI. [artifacts: ui, infrastructure]
- [x] `pipeline.md`'s description of the lrclib-assisted-line-break branch
  (GP has lyrics but no marked line boundaries) is worded to imply GP
  supplies the lyric text there too, with lrclib only supplying line
  breaks. Actually, in this branch lrclib supplies the lyric *text*
  (`extract-lyrics.ts:59-62`'s `parseLrclibLines`), and GP only supplies
  timestamps and line-break counts. Fix the wording to say which source
  supplies the text vs. the timing in this branch. [artifacts: pipeline]
- [x] `infrastructure.md`'s Tab Rendering section describes percussion
  detection as reading `track.percussionArticulations`/instrument
  metadata; the code actually reads `track.isPercussion` directly
  (`client/src/tab-renderer.ts:106`). Cosmetic wording fix — the
  conclusion (percussion status comes from alphaTab's own parsed data,
  not the datamodel) is still correct. [artifacts: infrastructure]

## UX
- [x] `infrastructure.md`'s Tab Rendering section doesn't mention the
  small-screen render-scaling feature (`tabScaleForViewportWidth`,
  `client/src/tab-renderer.ts:59-62`) at all. Optional: document it while
  touching this section for the percussion-detection fix above.
  [artifacts: infrastructure]
