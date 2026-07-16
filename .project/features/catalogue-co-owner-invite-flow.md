---
slug: catalogue-co-owner-invite-flow
status: backlogged
logged: 2026-07-15
---

Let a catalogue owner generate an invite link that grants a signed-in visitor CatalogueMembership(grantedVia:'invite') and CatalogueOwnership as a co-owner.
Why: ui.md's In-App Authoring 'Ownership/invites' section documents this UI; datamodel.md's CatalogueMembership.grantedVia already has an 'invite' enum value and a migration, but no invite generation/redemption code exists yet in server/src or client/src.
