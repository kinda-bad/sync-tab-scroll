---
status: planned
created: 2026-07-23
plan: plan-c75f-2026-07-23-5638.md
---

# Feedback

## Bugs
- [x] F001 User-supplied string inputs — the musician/participant `displayName` (`packages/shared/src/messages.ts`'s `session-create`/`session-join` messages, handled in `server/src/handlers/session-create.ts` and `server/src/handlers/session-join.ts` with no server-side validation today) and the catalogue activation key (`server/src/handlers/catalogue-unlock.ts`) — aren't sanitized against script-injection/rendering-breaking content. Unicode and emoji should stay allowed for display names (real use case), but anything that could break rendering or be executed (e.g. control characters, HTML/script-like content) should be rejected or stripped. No length caps exist either. Needs a defined allowlist/validation policy applied consistently at the point these values enter the system (server-side, not just relying on Svelte's default interpolation escaping on the client). [artifacts: datamodel, infrastructure]
