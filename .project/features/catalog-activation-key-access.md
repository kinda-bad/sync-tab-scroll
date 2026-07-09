---
slug: catalog-activation-key-access
status: backlogged
logged: 2026-07-08
---

In a public/deployed instance, one or more private song catalogues can be unlocked by entering a shared per-catalogue activation key; whichever catalogues the host has unlocked (plus any public ones) are what session members see and can pick songs from.
Why: extends the existing global-catalog model (datamodel.md's CatalogSong[]) to support private/gated catalog content on a public deployment, without introducing accounts or auth — the key is a per-catalog shared secret, not a per-user credential, consistent with this app's no-auth posture (constitution.md Production Posture). Likely ties into railway-terraform-deployment and the existing Song Consent Gate's public-deployment-only framing.
