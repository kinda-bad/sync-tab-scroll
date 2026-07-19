---
status: planned      # open -> planned
created: 2026-07-19
plan: plan-session-empty-ttl-2026-07-19-ce83.md
---

# Feedback

## UX

- [x] F001 Investigate session length/lifecycle: do host-created
  (music) sessions need to expire? Today's behavior should be
  established first as part of the investigation (how long a session
  object lives server-side once created; what happens when the host
  disconnects and never returns; whether abandoned sessions accumulate
  in the server store indefinitely on the long-running Railway deploy;
  whether a stale join code can be rejoined hours/days later and what
  state a late joiner then sees). Outcome should be a recommendation —
  expire (after what idle period, with what warning/cleanup semantics
  for connected participants) or deliberately never expire — grounded
  in what the server session store actually does, not assumption.
  [artifacts: infrastructure, datamodel]
