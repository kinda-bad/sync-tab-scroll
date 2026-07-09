---
slug: railway-terraform-deployment
status: implemented
logged: 2026-07-08
plan: plan-railway-terraform-deployment-2026-07-09.md
tasks: tasks-railway-terraform-deployment-30b0.md
---

The system can be deployed to Railway with its infrastructure (services, env vars, volumes/storage) defined and provisioned as Terraform code, rather than click-ops through Railway's dashboard.
Why: enables a real, repeatable production/public deployment path — constitution.md's Production Posture already anticipates hardening for public deployment as a future direction; this gives that direction an actual deployment target and IaC story.
