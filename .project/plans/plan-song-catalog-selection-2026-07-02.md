---
status: draft
branch: song-catalog-selection
created: 2026-07-02
---

# Plan: Resolve /ardd-verify Findings (DEFECTS.md, 2026-07-02)

## Goal

Close 6 of the 7 defects recorded in `.project/DEFECTS.md` (the seventh —
metronome/count-in controls — is ejected to the backlog, see Scope),
bringing the codebase back into agreement with `ui.md`,
`infrastructure.md`, and `constitution.md` — including the two
constitution violations (Principles II and VI) discovered in the same
pass.

## Scope

**In scope:** 6 of the 7 `DEFECTS.md` entries (all but the count-in half
of the transport-controls finding — see below).

**Out of scope, ejected to the backlog:** metronome/count-in toggle
controls. These looked at first like the same "session setting exists,
nothing lets the host set it" gap as pause/resume/seek, but unlike
`playback-control` (which the server already fully handles), there's no
`ClientMessage` variant or server handler for session settings at all —
real net-new design, not a wiring gap. Per constitution Principle V
(check library idioms before building), it's not yet established whether
alphaTab has its own built-in metronome/count-in *enablement* UI (as
opposed to just the `metronomeVolume`/`countInVolume` playback settings
already wired) that this app should defer to instead of building a
custom toggle — logged as backlog items with that research question
attached rather than designed here. Also out of scope: any other feature
work not tied to a recorded defect (e.g. `host-delegation`/
`request-to-become-host`, already backlogged, untouched by this plan).

**Does not supersede** `plan-song-catalog-selection-2026-07-01.md` — that
plan's scope (build the song-catalog feature) is complete and merged in
spirit on this branch; this plan is a separate defect-remediation pass
over the result, not a revision of that design.

## Technical Approach

Reference the artifact sections named in each `DEFECTS.md` entry rather
than repeating them. Grouped by fix type, ordered cheapest/lowest-risk
first:

- **Phase 1 (constitution compliance, code-only):** `Playback.svelte`
  imports `Theme` from `tab-renderer.ts` instead of retyping
  `'dark' | 'light'` inline (Principle VI). `brand-colors.ts` drops the
  unused `geometry` field from both `darkTabColors` and `lightTabColors`
  (Principle II) — confirmed zero references anywhere in the codebase.
- **Phase 2 (infrastructure.md corrections, artifact-only):** four
  `DEFECTS.md` entries, all documentation catching up to already-correct
  code — no code changes:
  - Replace the Tab Rendering code sample's `var(--tab-foreground)`-style
    strings with the real mechanism: `Color` instances from
    `brand-colors.ts`, switched by a `theme` parameter.
  - Add `core.scriptFile` (the audio player's own worker requirement) as
    a third documented Font & Worker Setup deviation.
  - Document `player.enablePlayer`/`player.soundFont` and the Sonivox
    licensing rationale.
  - Document that a closed socket broadcasts `session-state` immediately
    (Session & Real-Time Sync).
- **Phase 3 (ui.md gap — playback transport controls):** wire
  `pause`/`resume`/`seek` into the client.
  - **Pause/resume**: server-side `playback-control.ts` already handles
    both; purely client UI + `wsClient.send` calls — a host-only
    pause/resume button in `Playback.svelte`, shown once playback is
    running.
  - **Seek**: per constitution Principle V, checked whether alphaTab
    already provides "click-to-seek" before building anything —
    confirmed it does: `settings.player.enableUserInteraction` (default
    `true`, already in effect since `tab-renderer.ts` never overrides it)
    natively lets a user click a beat to jump the *local* player there,
    and `playerPositionChanged`'s event args carry `isSeek: boolean` to
    detect it. So this phase is **not** building seek — it's (a) gating
    the native interaction to host-only and paused-only (ui.md:
    "exposes seek... when paused; participants' views don't" — likely by
    toggling `enableUserInteraction` based on `isHost`/`playbackState.
    status`), and (b) when the host's `playerPositionChanged` fires with
    `isSeek: true`, sending `{ type: 'playback-control', action: 'seek',
    tickPosition }` so the group actually syncs to it — right now a
    local click-seek would only move the host's own view and get
    immediately overwritten by the next drift-correction broadcast.

## Complexity Tracking

None — every phase either removes complexity (dead code, doc drift) or
adds the minimum needed to close a gap between an existing artifact claim
and existing capability. Phase 3's seek work in particular is *less*
code than it looked (Principle V: alphaTab already does the interaction
natively).

## Open Questions

None — resolved during planning (seek is click-on-the-tab-itself, via
alphaTab's native interaction, per user direction).

## Production Annotation Summary

None — no shortcuts introduced; phase 3 completes functionality already
described in `ui.md` and already partially supported server-side.
