---
slug: explicit-participant-readiness
status: implemented
logged: 2026-07-19
plan: plan-explicit-readiness-2026-07-19-841d.md
tasks: tasks-explicit-readiness-0580.md
---

Add an explicit user-confirmed readiness stage on top of the existing load-based readiness: a fully-loaded participant (host included) is 'loaded' until they actively indicate they're ready, becoming 'ready' only then; the Bar's readiness indicator shows a clock icon when loaded-but-not-ready and a checkbox when ready; if the host starts playback while N participants aren't ready, the host gets a confirmation modal ('N participants are not yet ready, start anyway?') while the not-ready participants simultaneously get a 'Host wants to start, are you ready?' modal that is auto-dismissed as soon as the host confirms or cancels their own modal.
Why: the current readiness enum (no-part | loading | ready) is purely technical (assets loaded), so 'ready' can't distinguish 'my app finished loading' from 'I, the human, am ready to play'; touches the shared readiness enum + wire messages (datamodel/shared types), server session state and a new start-confirmation message flow, and the Bar indicator + two coordinated modals in the client.
