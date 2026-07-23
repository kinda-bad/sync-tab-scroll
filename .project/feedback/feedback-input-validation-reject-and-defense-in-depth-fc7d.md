---
status: open      # open -> planned
created: 2026-07-23
plan: null        # set to the consuming plan's filename once planned
---

# Feedback

## Bugs
- [ ] F001 `input-validation.ts` should actually **reject** invalid `displayName`/activation-key input with an `error` message, per `infrastructure.md`'s documented contract — confirmed via `/ardd-refine infrastructure` as the intended behavior. It currently sanitizes/truncates silently instead (per its own header comment), which is a broken-contract defect (`DEFECTS.md`). Fix `session-create`, `session-join`, and `catalogue-unlock`'s handlers to reject rather than silently clean the input. [artifacts: infrastructure]
- [ ] F002 Defense-in-depth gap: wherever the app accepts user input, both the client and the server must validate/sanitize it — the server is never allowed to trust that client-side validation already ran, since a client can be bypassed entirely (direct WS/HTTP messages, modified client, etc.). Auditing the current state: `displayName` (Landing View's "Your name" input, `client/src/views/Landing.svelte`) has **no client-side validation at all** today — only the server-side path F001 is fixing. The same audit-and-close-the-gap treatment should extend to every other user-input surface in the app: the join-code field, the activation-key field, and (Phase 2 in-app authoring) catalogue name/key, song submitter identifier, and co-owner invite handling. For each: confirm a server-side check exists (reject, not silently sanitize, per F001's resolved intent) AND a client-side check exists as a UX nicety — never treat the client-side check as sufficient on its own. [artifacts: infrastructure, ui]
