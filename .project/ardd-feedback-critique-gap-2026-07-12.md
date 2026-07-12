# ARDD feedback — `/ardd-critique` gets reached for as a design-vetting step it doesn't provide

_Reported 2026-07-12, from a real session on the `sync-tab-scroll` project.
This is upstream feedback about the ARDD framework itself, not project work —
it is intentionally NOT in `.project/feedback/` so `/ardd-plan` won't consume
it._

## What happened

While discussing whether to add user accounts/auth to the project, the
assistant twice recommended `/ardd-critique` as *"the honest first move —
pressure-test the whole accounts direction and the datastore reversal on paper
before committing."* It was treating critique as a **forward-looking design
review of a proposed, not-yet-designed change**. The user stopped it:
*"you've misunderstood the critique skill."*

## What `/ardd-critique` actually does

Per its own instructions: it *"critically review[s] project **artifacts** and
challenge[s] design decisions,"* loads the existing `.project/artifacts/*.md`,
applies lenses (simplicity, failure modes, robustness, standardness, DRYness,
semantics, proportionality) to decisions **already committed to those
artifacts**, and writes findings to `critique.md`, each tied to an
`/ardd-refine <artifact>` command. It is **backward/inward-looking**: it audits
the quality of what is already written down.

The proposed accounts direction wasn't in any artifact yet. So running critique
would have critiqued the *current* (no-auth / no-datastore) decisions and
emitted `/ardd-refine` suggestions for them — not the actual need, which was to
stress-test the **new** model (durable membership vs. per-session keys,
dynamic-catalog fallout, OAuth + WebSocket identity mechanics) that existed only
as an idea.

## The gap the assistant thought it filled

A **pre-artifact design-vetting step**: take a substantial *proposed* direction
— especially one that **reverses existing decisions** — and rigorously
pressure-test its design soundness *before* it is written into any artifact.
ARDD's current roster has no home for this:

- `/ardd-feature` — logs an idea (no design, no vetting)
- `/ardd-critique` — challenges decisions **already in artifacts**
- `/ardd-research` — targeted investigation, but framed as fact-finding, not
  design review
- `/ardd-refine` / `/ardd-plan` — assume the design decision is **already made**
  and just apply / sequence it

So there is a hole between "I have an idea" and "write the design into the
artifacts": **nowhere to vet the design itself.**

## Why it's a real gap (not just an isolated mistake)

The user's own fix *was* the missing step: **write a standalone design
proposal, then have an (architect) agent review and refine it** before any
`/ardd-refine`. That workflow had to be hand-rolled because no skill covers it.

## The trap

The word **"critique"** reads as "critically evaluate [a design]" — the name
does not signal that the object is strictly *the committed artifacts*. That
naming is what lured the assistant (and would lure other users/agents) into
using it for pre-artifact design review.

## Suggested changes

1. **Name/scope clarity.** Make `/ardd-critique`'s description explicit that it
   operates *only on decisions already recorded in the artifacts* — e.g. a
   one-line "not for vetting proposed/undesigned changes; use X for that."
2. **Fill the gap.** Consider a first-class **design-proposal + review** step:
   draft a proposal for a net-new or decision-reversing change → structured
   architectural review → *then* `/ardd-refine` / `/ardd-plan`. Today that need
   silently routes to `/ardd-critique` and misfires.
