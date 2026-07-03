---
status: planned
created: 2026-07-03
plan: plan-session-create-selection-2026-07-03.md
---

# Feedback

## Bugs
- [x] `Landing.svelte`'s "Session code" input has placeholder text `"ABC123"` (6 characters), but `server/src/session-store.ts`'s `generateJoinCode()` (session-store.ts:9) generates a 4-character code (`for (let i = 0; i < 4; i++)`). Confirmed by reading the code, not a guess. Fix the placeholder to a 4-character example (e.g. `"AB12"`). [artifacts: ui]

## UX
- [x] `Landing.svelte` currently renders session-create and session-join as one combined card sharing a single "Your name" input above both a "Create session" button and a separate join-code-input-plus-"Join"-button section — visually it reads like the name field only belongs to session creation, even though it's actually shared by both flows. Split Create and Join into two separate views (or at minimum two clearly separate, independently-labeled forms), each with its own "Your name" input, so the two flows read as fully distinct rather than one muddled card. [artifacts: ui]
- [x] Neither flow currently has real form-submit semantics — `Landing.svelte` has no `<form>`/`onsubmit` or `Enter`-key handling at all today, just two `Button` `onclick` handlers. Once Create and Join are split into separate views/forms (per the item above), wire each one so pressing `Enter` while focused in that view attempts its own appropriate action (Create in the create view, Join in the join view) rather than doing nothing or guessing which of two co-located actions was intended.
