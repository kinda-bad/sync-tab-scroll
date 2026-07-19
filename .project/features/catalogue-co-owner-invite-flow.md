---
slug: catalogue-co-owner-invite-flow
status: implemented
logged: 2026-07-15
plan: plan-phase-2-in-app-authoring-2026-07-14-8537.md
tasks: tasks-phase-2-in-app-authoring-48d5.md
---

Let a catalogue owner generate an invite link that grants a signed-in visitor CatalogueMembership(grantedVia:'invite') and CatalogueOwnership as a co-owner.
Why: ui.md's In-App Authoring 'Ownership/invites' section documents this UI; datamodel.md's CatalogueMembership.grantedVia already has an 'invite' enum value and a migration, but no invite generation/redemption code exists yet in server/src or client/src.

Note (2026-07-19): closed as implemented without its own plan — its scope
shipped as phase-2-in-app-authoring's Phase 6 (invite generation +
redemption; see the plan/tasks bound above). The Why line above predates
that realization and is stale.
