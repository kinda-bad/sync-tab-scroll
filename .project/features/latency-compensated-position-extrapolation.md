---
slug: latency-compensated-position-extrapolation
status: implemented
logged: 2026-07-15
plan: plan-latency-compensated-position-extrapolation-2026-07-18-81b7.md
tasks: tasks-latency-compensated-position-extrapolation-415b.md
---

Compensate a participant's rendered playback position for host-to-server-to-client propagation latency by projecting tickPosition forward from serverTimestamp, instead of only periodically correcting drift against the raw last-reported value.
Why: infrastructure.md's Session & Real-Time Sync section names this explicitly as 'a deferred future refinement, not part of the current mechanism,' accepted for now as a manageable imprecision given the 50-tick drift tolerance.
